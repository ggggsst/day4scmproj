'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function toggleForecastModel(formData: FormData) {
  await requireAdmin();
  const modelId = String(formData.get('modelId') ?? '');
  const enabled = formData.get('enabled') === 'true';
  if (!modelId) throw new Error('모델 ID가 필요합니다.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').from('model_config').update({ enabled, updated_by: (await supabase.auth.getUser()).data.user?.id }).eq('model_id', modelId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/forecast-models');
}

export async function runBaselineForecast() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('run_baseline_forecast');
  if (error) throw new Error(error.message);
  revalidatePath('/admin/forecast-runs');
}
