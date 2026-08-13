import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';
import type { ParseImportJob } from '@confirma/queue';
import type { Queue } from 'bullmq';
import { environment } from '../environment.js';
import { IMPORT_QUEUE } from './imports.constants.js';
import { validateImportedRow } from './import-row.js';

@Injectable()
export class ImportsService {
  constructor(@Inject(IMPORT_QUEUE) private readonly queue: Queue<ParseImportJob>) {}

  async create(file: Express.Multer.File) {
    if (file.mimetype !== 'application/pdf' || !file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new BadRequestException('Envie um arquivo PDF válido');
    }

    const temporaryDirectory = environment().UPLOAD_TEMP_DIR;
    await mkdir(temporaryDirectory, { recursive: true });
    const temporaryPath = join(temporaryDirectory, `${randomUUID()}.pdf`);
    await writeFile(temporaryPath, file.buffer, { flag: 'wx' });

    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    try {
      const createdImport = await prisma.import.create({
        data: {
          status: 'UPLOADED',
          files: {
            create: {
              originalName: file.originalname,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              checksum,
              temporaryKey: temporaryPath,
            },
          },
        },
        include: { files: true },
      });

      const importFile = createdImport.files[0];
      if (!importFile) throw new Error('Arquivo da importação não persistido');

      await this.queue.add(
        'parse-import',
        { importId: createdImport.id, importFileId: importFile.id, temporaryPath },
        {
          jobId: `parse:${importFile.id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 500,
          removeOnFail: 1_000,
        },
      );

      await prisma.import.update({
        where: { id: createdImport.id },
        data: { status: 'PROCESSING' },
      });

      return { id: createdImport.id, status: 'PROCESSING' as const };
    } catch (error) {
      await import('node:fs/promises').then(({ unlink }) => unlink(temporaryPath).catch(() => undefined));
      throw error;
    }
  }

  list() {
    return prisma.import.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { files: { select: { id: true, originalName: true, sizeBytes: true } } },
    });
  }

  findById(id: string) {
    return prisma.import.findUniqueOrThrow({
      where: { id },
      include: { files: true, rows: { orderBy: { rowNumber: 'asc' }, take: 500 } },
    });
  }

  async review(id: string) {
    const imported = await prisma.import.findUniqueOrThrow({
      where: { id },
      include: { rows: { orderBy: { rowNumber: 'asc' } }, sourceRecords: true, campaigns: true },
    });
    const rows = imported.rows.map((row) => ({
      id: row.id,
      rowNumber: row.rowNumber,
      validationStatus: row.validationStatus,
      validationIssues: row.validationIssues,
      data: row.normalizedData,
    }));
    const validRows = rows.filter((row) => row.validationStatus === 'VALID').length;
    const warningRows = rows.filter((row) => row.validationStatus === 'WARNING').length;
    const invalidRows = rows.filter((row) => row.validationStatus === 'INVALID').length;
    const validPatientKeys = new Set(
      rows
        .filter((row) => row.validationStatus !== 'INVALID')
        .map((row) => validateImportedRow(row.data))
        .filter((row) => row.normalizedName && row.birthDate && row.issues.length === 0)
        .map((row) => `${row.normalizedCpf ?? `${row.normalizedName}:${row.birthDate?.toISOString().slice(0, 10)}`}`),
    );
    return {
      id: imported.id,
      status: imported.status,
      layout: imported.layout,
      totalReported: imported.totalReported,
      recordsFound: imported.recordsFound,
      warnings: imported.warnings,
      counts: { totalRows: rows.length, validRows, warningRows, invalidRows, identifiedPatients: validPatientKeys.size },
      canApprove: ['READY_FOR_REVIEW', 'REVIEW_REQUIRED'].includes(imported.status) && imported.campaigns.length === 0,
      sourceRecordCount: imported.sourceRecords.length,
      rows,
    };
  }

  async approve(id: string, userId: string, note?: string) {
    return prisma.$transaction(async (transaction) => {
      const imported = await transaction.import.findUnique({
        where: { id },
        include: { rows: true, sourceRecords: true, campaigns: true },
      });
      if (!imported) throw new BadRequestException('Importação não encontrada');
      if (!['READY_FOR_REVIEW', 'REVIEW_REQUIRED'].includes(imported.status)) {
        throw new ConflictException('Esta importação não está disponível para aprovação');
      }
      if (imported.campaigns.length > 0) throw new ConflictException('A importação já possui uma campanha');

      const normalizedRows = imported.rows.map((row) => ({ row, validated: validateImportedRow(row.normalizedData) }));
      const valid = normalizedRows.filter(({ validated }) => validated.issues.length === 0);
      if (valid.length === 0) throw new BadRequestException('A importação não contém registros válidos para campanha');

      for (const { row, validated } of normalizedRows) {
        await transaction.importRow.update({
          where: { id: row.id },
          data: {
            validationStatus: validated.issues.length === 0 ? 'VALID' : 'INVALID',
            validationIssues: validated.issues,
          },
        });
      }
      if (imported.sourceRecords.length === 0) {
        for (const { row, validated } of valid) {
          await transaction.sourceRecord.create({
            data: {
              importId: imported.id,
              importRowId: row.id,
              codigoConvocacaoOrigem: validated.codigoConvocacaoOrigem!,
              scheduledAt: validated.scheduledAt!,
              procedures: { create: validated.procedimentos.map((name) => ({ name })) },
            },
          });
        }
      }
      const summary = {
        valid: valid.length,
        invalid: normalizedRows.length - valid.length,
        warning: 0,
      };
      await transaction.import.update({
        where: { id },
        data: { status: 'APPROVED', approvedAt: new Date(), validationSummary: summary },
      });
      await transaction.auditLog.create({
        data: { userId, eventType: 'IMPORT_APPROVED', entityType: 'import', entityId: id, metadata: { note, ...summary } },
      });
      return { id, status: 'APPROVED' as const, ...summary };
    });
  }
}
