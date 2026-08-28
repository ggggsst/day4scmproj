import { requireAdmin, requireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getImportDefinition } from './schema';
import { parseImportFile } from './parse';
import { validateRows } from './validate';
import type { ImportMode, ImportType, RawRow, ValidationResult } from './types';

export async function getMasterContext() {
  const supabase = await createSupabaseServerClient();
  const [items, suppliers] = await Promise.all([
    supabase.schema('core').from('v_item_master').select('item_id'),
    supabase.schema('core').from('v_supplier_master').select('supplier_id'),
  ]);
  return { itemIds: new Set((items.data ?? []).map((row) => String((row as Record<string, unknown>).item_id))), supplierIds: new Set((suppliers.data ?? []).map((row) => String((row as Record<string, unknown>).supplier_id))) };
}

export function toRawRow(type: ImportType, row: RawRow): RawRow {
  const definition = getImportDefinition(type);
  if (!definition) throw new Error('UNSUPPORTED_IMPORT_TYPE');
  const mapped: RawRow = { ...row };
  for (const [standard, raw] of Object.entries(definition.rawFields)) {
    if (row[standard] !== undefined) { mapped[raw] = row[standard]; delete mapped[standard]; }
  }
  return mapped;
}

export async function stageImport(file: File, type: ImportType, mode: ImportMode): Promise<{ batchId: string; validation: ValidationResult }> {
  const { user } = await requireUser();
  const definition = getImportDefinition(type);
  if (!definition) throw new Error('지원하지 않는 import type입니다.');
  const parsed = await parseImportFile(file.name, Buffer.from(await file.arrayBuffer()));
  const headers = parsed.headers;
  const mapping = Object.fromEntries(headers.map((header) => [header, definition.aliases[header] ?? header.trim().toLowerCase()]));
  const mappedRows = parsed.rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [mapping[key], value])));
  const validation = validateRows(type, mappedRows, await getMasterContext());
  const supabase = await createSupabaseServerClient();
  const { data: batch, error: batchError } = await supabase.schema('core').from('upload_batch').insert({ file_name: file.name, import_type: type, import_mode: mode, total_rows: validation.summary.totalRows, success_rows: validation.summary.successRows, warning_rows: validation.summary.warningRows, error_rows: validation.summary.errorRows, status: 'VALIDATED', uploaded_by: user.id }).select('batch_id').single();
  if (batchError || !batch) throw new Error(batchError?.message ?? '배치 생성에 실패했습니다.');
  const staging = parsed.rows.map((originalRow, index) => ({ batch_id: batch.batch_id, row_number: index + 2, original_row: originalRow, mapped_row: toRawRow(type, mappedRows[index]), validation_status: validation.errors.some((entry) => entry.rowNumber === index + 2 && entry.severity === 'ERROR') ? 'ERROR' : validation.errors.some((entry) => entry.rowNumber === index + 2) ? 'WARNING' : 'SUCCESS' }));
  const { error: stagingError } = await supabase.schema('core').from('import_staging').insert(staging);
  if (stagingError) throw new Error(stagingError.message);
  if (validation.errors.length) {
    const { error } = await supabase.schema('core').from('validation_error').insert(validation.errors.map((entry) => ({ batch_id: batch.batch_id, row_number: entry.rowNumber, field_name: entry.fieldName, error_code: entry.errorCode, error_message: entry.errorMessage, severity: entry.severity, original_value: entry.originalValue })));
    if (error) throw new Error(error.message);
  }
  await supabase.schema('core').from('column_mapping').upsert(Object.entries(mapping).map(([source_column, target_column]) => ({ import_type: type, source_column, target_column, confirmed_by: user.id })), { onConflict: 'import_type,source_column' });
  return { batchId: batch.batch_id, validation };
}

export async function importBatch(batchId: string) {
  const { profile } = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: batch, error } = await supabase.schema('core').from('upload_batch').select('batch_id,import_type,import_mode,status,error_rows').eq('batch_id', batchId).maybeSingle();
  if (error || !batch) throw new Error('배치를 찾을 수 없습니다.');
  if (batch.error_rows > 0 || batch.status !== 'VALIDATED') throw new Error('검증 완료된 오류 없는 batch만 import할 수 있습니다.');
  if (batch.import_mode === 'replace' && profile.role !== 'ADMIN') throw new Error('replace는 관리자만 실행할 수 있습니다.');
  const { data: rows, error: rowError } = await supabase.schema('core').from('import_staging').select('mapped_row').eq('batch_id', batchId).order('row_number');
  if (rowError) throw new Error(rowError.message);
  const { error: rpcError } = await supabase.schema('core').rpc('import_batch', { p_batch_id: batchId, p_import_type: batch.import_type, p_mode: batch.import_mode, p_rows: (rows ?? []).map((row) => row.mapped_row) });
  if (rpcError) throw new Error(rpcError.message);
}

export async function rollbackBatch(batchId: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('rollback_batch', { p_batch_id: batchId });
  if (error) throw new Error(error.message);
}
