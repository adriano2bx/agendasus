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
    // In the SISREG report the procedure code also has nine digits. A
    // convocation starts at the appointment header, never at "Procedimento".
    if (line.match(CODE_PATTERN) && !/P[aá]gina|Total/i.test(line) && !/^\s*Procedimento/i.test(line)) starts.push(index);
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
  const normalized = normalizeSisregSpacing(rawText);
  const code = normalized.match(CODE_PATTERN)?.[0] ?? null;
  const cpf = normalized.match(CPF_PATTERN)?.[0] ?? null;
  const phones = [...normalized.matchAll(PHONE_PATTERN)]
    .map((match) => match[0].trim())
    .filter((phone) => phone.replace(/\D/g, '').length >= 10 && (phone.includes('-') || (phone.includes('(') && phone.includes(')'))));
  const dates = extractSpacedDates(rawText);
  const firstTime = extractSpacedTimes(rawText)[0] ?? null;
  const nameMatch = code
    ? extractPatientName(normalized)
    : null;
  const procedureMatch = extractProcedure(normalized);

  const row: ParsedSisregRow = {
    rowNumber,
    rawText,
    codigoConvocacaoOrigem: code,
    nome: nameMatch ?? null,
    // The appointment date appears first; the patient's birth date is the
    // last date in the record block.
    dataNascimento: dates.at(-1) ?? null,
    cpf,
    telefones: [...new Set(phones)],
    dataHora: dates[0] && firstTime ? `${dates[0]} ${firstTime}` : null,
    procedimentos: procedureMatch ? [procedureMatch] : [],
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

function normalizeSisregSpacing(value: string): string {
  // pdfjs exposes some SISREG glyphs as one character per text item. Keep
  // word boundaries but compact numbers, dates, times and phone characters.
  return value
    .replace(/Telef\s+one/gi, 'Telefone')
    .replace(/Procedimento\s*\(\s*s\s*\)/gi, 'Procedimento(s)')
    .replace(/[\d][\d\s/():-]*[\d]/g, (part) => part.replace(/\s+/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSpacedDates(value: string): string[] {
  return [...value.matchAll(/(\d\s*\d\s*\/\s*\d\s*\d\s*\/\s*\d\s*\d\s*\d\s*\d)/g)]
    .map((match) => match[1]?.replace(/\s+/g, '') ?? '')
    .filter((date) => /^\d{2}\/\d{2}\/\d{4}$/.test(date));
}

function extractSpacedTimes(value: string): string[] {
  return [...value.matchAll(/(\d\s*\d\s*:\s*\d\s*\d)/g)]
    .map((match) => match[1]?.replace(/\s+/g, '') ?? '')
    .filter((time) => /^\d{2}:\d{2}$/.test(time));
}

function extractProcedure(value: string): string | null {
  const compact = value.replace(/[\s]/g, '').toLocaleUpperCase('pt-BR');
  if (compact.includes('TOMOGRAFIA') && compact.includes('EMISS') && compact.includes('PÓSIT') && compact.includes('PET-CT')) {
    return 'TOMOGRAFIA POR EMISSÃO DE PÓSITRONS (PET-CT)';
  }
  const match = value.match(/Procedimento\(s\):\s*(.+?)(?=\s+Paciente:|$)/i);
  return match?.[1]?.trim() ?? null;
}

function extractPatientName(value: string): string | null {
  const candidates = [
    between(value, 'Paciente:', 'CNS:'),
    between(value, 'CNS:', 'Nascimento:'),
    between(value, 'Nascimento:', 'Idade:'),
  ]
    .map(cleanName)
    .filter((candidate): candidate is string => Boolean(candidate));
  const candidate = candidates.find((item) => item.replace(/\s/g, '').length >= 4);
  return candidate ?? null;
}

function between(value: string, start: string, end: string): string {
  const from = value.indexOf(start);
  if (from < 0) return '';
  const to = value.indexOf(end, from + start.length);
  return to < 0 ? '' : value.slice(from + start.length, to);
}

function cleanName(value: string): string | null {
  const withoutNumbers = value
    .replace(/\(?\d{2}\)?\d{4,5}-\d{4}/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\b(?:Telefone\(s\)|Origem|Idade|Paciente)\b/gi, ' ')
    .trim();
  // Join broken glyph runs such as "A D RI A N A" while preserving actual
  // spaces where the PDF supplies them.
  const joined = withoutNumbers.replace(/\b(?:[A-ZÀ-Ý]{1,2}\s+){2,}[A-ZÀ-Ý]{1,4}\b/g, (part) => part.replace(/\s+/g, ''));
  const words = joined.match(/[A-ZÀ-Ý][A-ZÀ-Ý'’-]*/gi) ?? [];
  const result = words.filter((word) => !['MT', 'GO', 'JATAI', 'CUIABA'].includes(word.toUpperCase())).join(' ').trim();
  return result.length >= 4 ? result : null;
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
