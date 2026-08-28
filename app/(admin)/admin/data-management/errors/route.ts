import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  await requireAdmin();
  const batchId = new URL(request.url).searchParams.get('batch');
  if (!batchId) return new Response('batch가 필요합니다.', { status: 400 });
  const supabase = await createSupabaseServerClient();
  const [{ data: rows }, { data: errors }] = await Promise.all([
    supabase.schema('core').from('import_staging').select('row_number,original_row').eq('batch_id', batchId).order('row_number'),
    supabase.schema('core').from('validation_error').select('row_number,error_code,error_message,severity').eq('batch_id', batchId).order('row_number'),
  ]);
  const output = ['row_number,error_code,error_message,severity,original_row'];
  for (const error of errors ?? []) {
    const original = rows?.find((row) => row.row_number === error.row_number)?.original_row ?? {};
    output.push([error.row_number, error.error_code, error.error_message, error.severity, JSON.stringify(original)].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
  }
  return new Response(`\uFEFF${output.join('\n')}`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="import-errors-${batchId}.csv"` } });
}
