'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function runBacktestAction(formData: FormData) {
  await requireAdmin();
  const forecastRunId = String(formData.get('forecastRunId') ?? '');
  if (!forecastRunId) throw new Error('Forecast Run을 선택하세요.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('run_backtest', { p_forecast_run_id: forecastRunId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/backtest');
}

export async function setManualChampionAction(formData: FormData) {
  await requireAdmin();
  const itemId = String(formData.get('itemId') ?? '');
  const modelId = String(formData.get('modelId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) throw new Error('수동 Champion 지정 사유를 입력하세요.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('set_manual_champion', { p_item_id: itemId, p_model_id: modelId, p_reason: reason });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/backtest');
  revalidatePath('/analysis/model-comparison');
}
