import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getImportHistory() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core').from('upload_batch').select('*').order('uploaded_at', { ascending: false }).limit(100);
  return { rows: data ?? [], error: error?.message ?? null };
}

export async function getImportBatch(batchId: string) {
  const supabase = await createSupabaseServerClient();
  const [batchResult, stagingResult, errorResult] = await Promise.all([
    supabase.schema('core').from('upload_batch').select('*').eq('batch_id', batchId).maybeSingle(),
    supabase.schema('core').from('import_staging').select('row_number,original_row,mapped_row,validation_status').eq('batch_id', batchId).order('row_number').limit(100),
    supabase.schema('core').from('validation_error').select('*').eq('batch_id', batchId).order('row_number'),
  ]);
  const error = batchResult.error ?? stagingResult.error ?? errorResult.error;
  return { batch: batchResult.data, staging: stagingResult.data ?? [], errors: errorResult.data ?? [], error: error?.message ?? null };
}
