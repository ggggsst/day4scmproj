import { createSupabaseServerClient } from './supabase/server';
import type { User } from '@supabase/supabase-js';
import { normalizeRole } from './auth-model';
import type { UserRole } from './auth-model';

export type { UserRole } from './auth-model';

export type AppUser = {
  user_id: string;
  email: string;
  name: string | null;
  department: string | null;
  role: UserRole;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export { normalizeRole, safeNextPath } from './auth-model';

async function getCurrentIdentity() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .schema('core')
    .from('app_user')
    .select('*')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || !normalizeRole(profile.role) || profile.active !== true) {
    return { supabase, user: data.user, profile: null };
  }

  return { supabase, user: data.user, profile: profile as AppUser };
}

export async function getRole(): Promise<UserRole | null> {
  const { profile } = await getCurrentIdentity();
  return profile?.role ?? null;
}

export async function requireUser(): Promise<{ user: User; profile: AppUser }> {
  const { user, profile } = await getCurrentIdentity();
  if (!user || !profile) throw new AuthError(401, '로그인이 필요합니다.');
  return { user, profile };
}

export async function requireAdmin(): Promise<{ user: User; profile: AppUser }> {
  const result = await requireUser();
  if (result.profile.role !== 'ADMIN') throw new AuthError(403, '관리자 권한이 필요합니다.');
  return result;
}
