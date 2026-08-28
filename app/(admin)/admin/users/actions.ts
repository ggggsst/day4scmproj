'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function resultError(message: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(message)}`);
}

export async function changeUserRole(formData: FormData) {
  const { user } = await requireAdmin();
  const targetUserId = String(formData.get('targetUserId') ?? '');
  const nextRole = String(formData.get('role') ?? '');
  if (!targetUserId || (nextRole !== 'ADMIN' && nextRole !== 'USER')) resultError('변경할 사용자와 role을 확인해 주세요.');
  if (targetUserId === user.id) resultError('자기 자신의 관리자 권한은 변경할 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('admin_change_user_role', {
    target_user_id: targetUserId,
    next_role: nextRole,
  });
  if (error) resultError('사용자 role 변경에 실패했습니다.');
  revalidatePath('/admin/users');
}

export async function changeUserActive(formData: FormData) {
  const { user } = await requireAdmin();
  const targetUserId = String(formData.get('targetUserId') ?? '');
  const nextActive = String(formData.get('active') ?? '') === 'true';
  if (!targetUserId) resultError('변경할 사용자를 확인해 주세요.');
  if (targetUserId === user.id) resultError('자기 자신의 활성 상태는 변경할 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('admin_change_user_active', {
    target_user_id: targetUserId,
    next_active: nextActive,
  });
  if (error) resultError('사용자 활성 상태 변경에 실패했습니다.');
  revalidatePath('/admin/users');
}
