import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PositionedText {
  text: string;
  x: number;
  y: number;
  page: number;
}

export interface ParsedSisregRow {
  rowNumber: number;
  rawText: string;
  codigoConvocacaoOrigem: string | null;
  nome: string | null;
  dataNascimento: string | null;
  cpf: string | null;
  telefones: string[];
  dataHora: string | null;
  procedimentos: string[];
  issues: string[];
}

export interface SisregParseResult {
  layout: 'SISREG_V1' | 'UNKNOWN';
  pageCount: number;
  reportedPageCount: number | null;
  totalReported: number | null;
  rows: ParsedSisregRow[];
  warnings: string[];
}

const DATE_PATTERN = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
const PHONE_PATTERN = /(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[\s-]?\d{4}/g;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const CODE_PATTERN = /\b\d{7,12}\b/;

export function rebuildLines(items: readonly PositionedText[]): string[] {
  const groups: PositionedText[][] = [];

  for (const item of [...items].sort((a, b) => a.page - b.page || b.y - a.y)) {
    const group = groups.find(
      (candidate) => candidate[0]?.page === item.page && Math.abs((candidate[0]?.y ?? 0) - item.y) <= 3,
    );
    if (group) group.push(item);
    else groups.push([item]);
  }

  return groups
    .sort((a, b) => (a[0]?.page ?? 0) - (b[0]?.page ?? 0) || (b[0]?.y ?? 0) - (a[0]?.y ?? 0))
    .map((group) =>
      group
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

export function parseSisregLines(lines: readonly string[], pageCount: number): SisregParseResult {
  const fullText = lines.join('\n');
  const layout = /SISREG|Sistema Nacional de Regula[cç][aã]o/i.test(fullText)
    ? 'SISREG_V1'
    : 'UNKNOWN';
  const pagination = fullText.match(/P[aá]gina\s+\d+\s+de\s+(\d+)/i);
  const reportedTotal = fullText.match(/(?:Total|Quantidade)\D{0,20}(\d{1,7})/i);
  const reportedPageCount = pagination?.[1] ? Number(pagination[1]) : null;
  const totalReported = reportedTotal?.[1] ? Number(reportedTotal[1]) : null;

  const starts: number[] = [];
  lines.forEach((line, index) => {
    if (CODE_PATTERN.test(line) && !/P[aá]gina|Total/i.test(line)) starts.push(index);
  });

  const rows = starts.map((start, rowIndex) => {
    const end = starts[rowIndex + 1] ?? lines.length;
    return parseRecordBlock(lines.slice(start, end).join(' '), rowIndex + 1);
  });

  const warnings: string[] = [];
  if (layout === 'UNKNOWN') warnings.push('Layout do PDF não reconhecido com segurança.');
  if (reportedPageCount !== null && reportedPageCount > pageCount) {
    warnings.push(`O documento informa ${reportedPageCount} páginas, mas o arquivo contém ${pageCount}.`);
  }
  if (totalReported !== null && rows.length < totalReported) {
    warnings.push(`O SISREG informa ${totalReported} registros, mas ${rows.length} foram encontrados.`);
  }
  if (rows.length === 0) warnings.push('Nenhum registro de convocação foi identificado.');

  return { layout, pageCount, reportedPageCount, totalReported, rows, warnings };
}

function parseRecordBlock(rawText: string, rowNumber: number): ParsedSisregRow {
  const code = rawText.match(CODE_PATTERN)?.[0] ?? null;
  const cpf = rawText.match(CPF_PATTERN)?.[0] ?? null;
  const phones = [...rawText.matchAll(PHONE_PATTERN)].map((match) => match[0].trim());
  const dates = [...rawText.matchAll(DATE_PATTERN)].map((match) => match[0]);
  const dateTimeMatch = rawText.match(/\b\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\b/);
  const nameMatch = code
    ? rawText.slice((rawText.indexOf(code) + code.length)).match(/\b[A-ZÀ-Ý][A-ZÀ-Ý\s]{5,}?\b(?=\s+\d{2}\/\d{2}\/\d{4})/i)
    : null;
  const procedureMatch = rawText.match(/(?:Procedimento|Exame)\s*:?\s*(.+?)(?=\s{2,}|$)/i);

  const row: ParsedSisregRow = {
    rowNumber,
    rawText,
    codigoConvocacaoOrigem: code,
    nome: nameMatch?.[0]?.trim() ?? null,
    dataNascimento: dates[0] ?? null,
    cpf,
    telefones: [...new Set(phones)],
    dataHora: dateTimeMatch?.[0] ?? null,
    procedimentos: procedureMatch?.[1] ? [procedureMatch[1].trim()] : [],
    issues: [],
  };

  if (!row.codigoConvocacaoOrigem) row.issues.push('Código da convocação ausente.');
  if (!row.nome) row.issues.push('Nome não identificado com segurança.');
  if (!row.dataNascimento) row.issues.push('Data de nascimento ausente.');
  if (row.telefones.length === 0) row.issues.push('Telefone ausente.');
  if (!row.dataHora) row.issues.push('Data/hora ausente.');
  if (row.procedimentos.length === 0) row.issues.push('Procedimento ausente.');
  return row;
}

export async function parseSisregPdf(data: Uint8Array): Promise<SisregParseResult> {
  const document = await getDocument({ data, useSystemFonts: true }).promise;
  const items: PositionedText[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!('str' in item)) continue;
      items.push({
        text: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        page: pageNumber,
      });
    }
  }

  return parseSisregLines(rebuildLines(items), document.numPages);
}
