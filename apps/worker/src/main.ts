import { readFile, unlink } from 'node:fs/promises';
import { prisma } from '@confirma/database';
import { QUEUES, createRedisConnection, type ParseImportJob, type SendMessageJob, type ProcessWebhookJob } from '@confirma/queue';
import { Queue, Worker } from 'bullmq';
import { processSendMessage } from './message-worker.js';
import { processWebhook } from './webhook-worker.js';
import { parseSisregPdf } from './sisreg-parser.js';

const timezone = process.env.APP_TIMEZONE ?? 'America/Cuiaba';
process.env.TZ = timezone;

const importConnection = createRedisConnection();
const worker = new Worker<ParseImportJob>(
  QUEUES.imports,
  async (job) => {
    if (job.name !== 'parse-import') return;
    const { importId, importFileId, temporaryPath } = job.data;
    const data = await readFile(temporaryPath);
    const parsed = await parseSisregPdf(new Uint8Array(data));

    await prisma.$transaction(async (transaction) => {
      await transaction.importRow.deleteMany({ where: { importFileId } });
      if (parsed.rows.length > 0) {
        await transaction.importRow.createMany({
          data: parsed.rows.map((row) => ({
            importId,
            importFileId,
            rowNumber: row.rowNumber,
            rawData: { text: row.rawText },
            normalizedData: {
              codigoConvocacaoOrigem: row.codigoConvocacaoOrigem,
              nome: row.nome,
              dataNascimento: row.dataNascimento,
              cpf: row.cpf,
              telefones: row.telefones,
              dataHora: row.dataHora,
              procedimentos: row.procedimentos,
            },
            validationStatus: row.issues.length === 0 ? 'VALID' : 'WARNING',
            validationIssues: row.issues,
          })),
        });
      }

      await transaction.import.update({
        where: { id: importId },
        data: {
          layout: parsed.layout,
          totalReported: parsed.totalReported,
          recordsFound: parsed.rows.length,
          warnings: parsed.warnings,
          validationSummary: {
            valid: parsed.rows.filter((row) => row.issues.length === 0).length,
            warning: parsed.rows.filter((row) => row.issues.length > 0).length,
            invalid: 0,
          },
          status:
            parsed.layout === 'SISREG_V1' && parsed.rows.length > 0
              ? 'READY_FOR_REVIEW'
              : 'REVIEW_REQUIRED',
        },
      });

      await transaction.importFile.update({
        where: { id: importFileId },
        data: { temporaryKey: null, deletedAt: new Date() },
      });
    });

    await unlink(temporaryPath).catch(() => undefined);
  },
  {
    connection: importConnection,
    concurrency: Number(process.env.IMPORT_WORKER_CONCURRENCY ?? 2),
  },
);

const messageQueueConnection = createRedisConnection();
const messageWorkerConnection = createRedisConnection();
const messageQueue = new Queue<SendMessageJob>(QUEUES.messages, { connection: messageQueueConnection });

const messageWorker = new Worker<SendMessageJob>(QUEUES.messages, processSendMessage, {
  connection: messageWorkerConnection,
  concurrency: Number(process.env.MESSAGE_WORKER_CONCURRENCY ?? 5),
});
const webhookConnection = createRedisConnection();
const webhookWorker = new Worker<ProcessWebhookJob>(QUEUES.webhooks, processWebhook, { connection: webhookConnection, concurrency: Number(process.env.WEBHOOK_WORKER_CONCURRENCY ?? 10) });

async function enqueueDueConvocations(): Promise<void> {
  const now = new Date();
  const due = await prisma.convocation.findMany({
    where: {
      status: 'SCHEDULED',
      nextActionAt: { lte: now },
      campaign: { status: { in: ['SCHEDULED', 'RUNNING'] } },
    },
    select: { id: true, stage: true },
    take: 250,
  });
  for (const convocation of due) {
    if (!isSendableStage(convocation.stage)) continue;
    await messageQueue.add(
      'send-message',
      { convocationId: convocation.id, stage: convocation.stage },
      { jobId: `send:${convocation.id}:${convocation.stage}`, attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1_000, removeOnFail: 1_000 },
    );
    await prisma.convocation.updateMany({
      where: { id: convocation.id, status: 'SCHEDULED' },
      data: { status: 'QUEUED' },
    });
  }
}

const scheduler = setInterval(() => void enqueueDueConvocations().catch((error: unknown) => console.error('Erro no scheduler', error)), Number(process.env.SCHEDULER_INTERVAL_MS ?? 10_000));
void enqueueDueConvocations();

function isSendableStage(stage: string): stage is SendMessageJob['stage'] {
  return stage === 'FIRST' || stage === 'SECOND' || stage === 'THIRD';
}

worker.on('failed', async (job, error) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  await prisma.import
    .update({
      where: { id: job.data.importId },
      data: { status: 'FAILED', failureReason: error.message.slice(0, 500) },
    })
    .catch(() => undefined);
});

async function shutdown(): Promise<void> {
  clearInterval(scheduler);
  await worker.close();
  await messageWorker.close();
  await webhookWorker.close();
  await messageQueue.close();
  await Promise.all([importConnection.quit(), messageQueueConnection.quit(), messageWorkerConnection.quit(), webhookConnection.quit()]);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

console.info(`Workers iniciados; modo de mensageria: ${process.env.MESSAGING_MODE ?? 'DRY_RUN'}`);
