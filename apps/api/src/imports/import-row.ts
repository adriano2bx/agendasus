import { normalizeBrazilianPhone, normalizePatientName, selectWhatsAppPhone } from '@confirma/domain';

export interface ImportedRowData {
  codigoConvocacaoOrigem: string | null;
  nome: string | null;
  dataNascimento: string | null;
  cpf: string | null;
  telefones: string[];
  dataHora: string | null;
  procedimentos: string[];
}

export interface ValidatedImportRow extends ImportedRowData {
  normalizedName: string | null;
  birthDate: Date | null;
  scheduledAt: Date | null;
  normalizedCpf: string | null;
  phones: ReturnType<typeof normalizeBrazilianPhone>[];
  issues: string[];
}

export function readImportedRow(value: unknown): ImportedRowData {
  const data = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    codigoConvocacaoOrigem: typeof data.codigoConvocacaoOrigem === 'string' ? data.codigoConvocacaoOrigem : null,
    nome: typeof data.nome === 'string' ? data.nome : null,
    dataNascimento: typeof data.dataNascimento === 'string' ? data.dataNascimento : null,
    cpf: typeof data.cpf === 'string' ? data.cpf : null,
    telefones: Array.isArray(data.telefones) ? data.telefones.filter((item): item is string => typeof item === 'string') : [],
    dataHora: typeof data.dataHora === 'string' ? data.dataHora : null,
    procedimentos: Array.isArray(data.procedimentos)
      ? data.procedimentos.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function parseBrazilianDate(value: string | null): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year) && parsed.getUTCMonth() === Number(month) - 1 && parsed.getUTCDate() === Number(day)
    ? parsed
    : null;
}

function parseBrazilianDateTime(value: string | null): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:00-04:00`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export function validateImportedRow(value: unknown): ValidatedImportRow {
  const row = readImportedRow(value);
  const birthDate = parseBrazilianDate(row.dataNascimento);
  const scheduledAt = parseBrazilianDateTime(row.dataHora);
  const phones = row.telefones.map(normalizeBrazilianPhone);
  const normalizedCpf = row.cpf?.replace(/\D/g, '') || null;
  const issues: string[] = [];

  if (!row.codigoConvocacaoOrigem) issues.push('Código da convocação ausente.');
  if (!row.nome || normalizePatientName(row.nome).length < 3) issues.push('Nome inválido ou ausente.');
  if (!birthDate) issues.push('Data de nascimento inválida ou ausente.');
  if (!selectWhatsAppPhone(phones)) issues.push('Nenhum telefone celular válido para WhatsApp.');
  if (!scheduledAt) issues.push('Data/hora inválida ou ausente.');
  if (row.procedimentos.length === 0) issues.push('Procedimento ausente.');
  if (normalizedCpf && normalizedCpf.length !== 11) issues.push('CPF inválido.');

  return {
    ...row,
    normalizedName: row.nome ? normalizePatientName(row.nome) : null,
    birthDate,
    scheduledAt,
    normalizedCpf: normalizedCpf?.length === 11 ? normalizedCpf : null,
    phones,
    issues,
  };
}

