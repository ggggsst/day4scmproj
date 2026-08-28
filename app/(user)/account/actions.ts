'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function updateAccountAction(formData: FormData) {
  const { user } = await requireUser();
  const name = String(formData.get('name') ?? '').trim() || null;
  const department = String(formData.get('department') ?? '').trim() || null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').from('app_user').update({ name, department }).eq('user_id', user.id);
  if (error) redirect('/account?error=저장에 실패했습니다.');
  redirect('/account?saved=1');
}
