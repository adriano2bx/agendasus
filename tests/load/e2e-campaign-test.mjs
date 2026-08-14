#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

if (process.env.LOAD_TEST_E2E_CONFIRM !== 'DRY_RUN_ONLY') {
  throw new Error(
    'Teste e2e bloqueado. Confirme que o worker está em MESSAGING_MODE=DRY_RUN definindo LOAD_TEST_E2E_CONFIRM=DRY_RUN_ONLY.',
  );
}

const baseUrl = (process.env.LOAD_TEST_BASE_URL ?? 'http://127.0.0.1:3001/api').replace(/\/$/, '');
const email = required('LOAD_TEST_EMAIL');
const password = required('LOAD_TEST_PASSWORD');
const pdfPath = resolve(process.env.LOAD_TEST_PDF ?? 'test-data/Pacientes_Simulados_Confirma_SUS.pdf');
const timeoutMs = Number(process.env.LOAD_TEST_E2E_TIMEOUT_MS ?? 180_000);
const keepCampaign = process.env.LOAD_TEST_E2E_KEEP_CAMPAIGN === 'true';
const startedAt = Date.now();
let token;
let campaignId;

const login = await request('/auth/login', { method: 'POST', body: { email, password } });
token = login.json?.accessToken;
if (!token) throw new Error(`Falha no login (HTTP ${login.status}).`);

const pdf = await readFile(pdfPath);
const form = new FormData();
form.append('file', new Blob([pdf], { type: 'application/pdf' }), basename(pdfPath));
const imported = await request('/imports', { method: 'POST', body: form });
if (imported.status < 200 || imported.status >= 300 || !imported.json?.id) {
  throw new Error(`Falha ao enviar o PDF (HTTP ${imported.status}).`);
}
const importId = imported.json.id;
console.log(JSON.stringify({ evento: 'importacao_criada', importId, arquivo: basename(pdfPath) }));

const review = await waitForReview(importId);
if (!review.canApprove || !review.counts?.eligiblePatients) {
  throw new Error(`Importação não elegível para campanha: ${JSON.stringify(review.counts ?? review.status)}.`);
}
await request(`/imports/${importId}/approve`, {
  method: 'POST',
  body: { note: 'Teste e2e automatizado em ambiente DRY_RUN' },
});

const firstActionAt = new Date(Date.now() + 20_000).toISOString();
const created = await request(`/campaigns/from-import/${importId}`, {
  method: 'POST',
  body: {
    name: `Teste e2e ${new Date().toISOString()}`,
    firstActionAt,
    secondIntervalDays: 1,
    secondStartTime: '09:00',
    thirdIntervalDays: 1,
    thirdStartTime: '09:00',
  },
});
campaignId = created.json?.id;
if (created.status < 200 || created.status >= 300 || !campaignId) {
  throw new Error(`Falha ao criar a campanha (HTTP ${created.status}).`);
}
const expectedPatients = Number(created.json.patientCount ?? review.counts.eligiblePatients);
await request(`/campaigns/${campaignId}/schedule`, { method: 'POST' });
console.log(JSON.stringify({ evento: 'campanha_programada', campaignId, pacientesEsperados: expectedPatients }));

const result = await waitForMessages(campaignId, expectedPatients);
console.log(JSON.stringify({ evento: 'resultado', ...result }, null, 2));
if (result.submitted < expectedPatients) process.exitCode = 1;

if (!keepCampaign) {
  await request(`/campaigns/${campaignId}/cancel`, { method: 'POST' });
  console.log(JSON.stringify({ evento: 'campanha_cancelada_apos_teste', campaignId }));
}

async function waitForReview(importId) {
  return waitUntil(async () => {
    const response = await request(`/imports/${importId}/review`);
    const review = response.json;
    return review && !['UPLOADED', 'PROCESSING'].includes(review.status) ? review : null;
  }, 'extração do PDF');
}

async function waitForMessages(campaignId, expected) {
  return waitUntil(async () => {
    const response = await request(`/campaigns/${campaignId}`);
    const detail = response.json;
    const submitted = Number(detail?.messageByStatus?.SUBMITTED ?? 0);
    const failed = Number(detail?.messageByStatus?.FAILED ?? 0);
    return submitted + failed >= expected ? { submitted, failed, elapsedMs: Date.now() - startedAt } : null;
  }, 'processamento das mensagens');
}

async function waitUntil(read, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Tempo esgotado aguardando ${label}.`);
}

async function request(path, options = {}) {
  const headers = { accept: 'application/json', authorization: `Bearer ${token ?? ''}`, ...(options.headers ?? {}) };
  const init = { method: options.method ?? 'GET', headers, signal: AbortSignal.timeout(15_000) };
  if (options.body instanceof FormData) init.body = options.body;
  else if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(`${baseUrl}${path}`, init);
  const json = await response.json().catch(() => null);
  if (!response.ok) console.error(JSON.stringify({ evento: 'requisicao_com_erro', path, status: response.status, resposta: json }));
  return { status: response.status, json };
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório.`);
  return value;
}
