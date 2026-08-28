'use server';

import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/auth-model';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type LoginState = { error: string | null };

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const nextPath = safeNextPath(String(formData.get('next') ?? '/'));

  if (!email || !password) return { error: '이메일과 비밀번호를 입력해 주세요.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.' };

  redirect(nextPath);
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
