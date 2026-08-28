import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { RawRow } from './types';

export type ParsedFile = { headers: string[]; rows: RawRow[] };

export async function parseCsv(buffer: Buffer): Promise<ParsedFile> {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) throw new Error(`CSV_PARSE_ERROR: ${parsed.errors[0].message}`);
  return { headers: parsed.meta.fields ?? [], rows: parsed.data as RawRow[] };
}

export function parseExcel(buffer: Buffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('EXCEL_SHEET_NOT_FOUND');
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null, raw: false });
  return { headers: rows.length ? Object.keys(rows[0]) : [], rows };
}

export async function parseImportFile(fileName: string, buffer: Buffer): Promise<ParsedFile> {
  if (fileName.toLowerCase().endsWith('.csv')) return parseCsv(buffer);
  if (fileName.toLowerCase().endsWith('.xlsx')) return parseExcel(buffer);
  throw new Error('UNSUPPORTED_FILE_TYPE');
}
