import { logoutAction } from '@/app/(auth)/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Badge from '@/components/ui/badge';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import { ADMIN_MENU } from '@/lib/menu';
import { changeUserActive, changeUserRole } from './actions';

type UserRow = {
  user_id: string;
  email: string;
  name: string | null;
  department: string | null;
  role: 'ADMIN' | 'USER';
  active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core').from('app_user').select('user_id,email,name,department,role,active,created_at,last_login_at').order('created_at', { ascending: true });
  const params = await searchParams;
  const adminMenuLabel = ADMIN_MENU.find((item) => item.id === 'admin-users')?.label ?? '사용자 관리';

  if (error) return <main className="analysis-page"><PageHeader eyebrow="ADMIN" title={adminMenuLabel} description="관리자 전용 사용자 관리" /><p>사용자 조회에 실패했습니다: {error.message}</p></main>;
  const users = (data ?? []) as UserRow[];

  return (
    <main className="analysis-page">
      <PageHeader eyebrow="ADMIN" title={adminMenuLabel} description="계정의 role과 활성 상태를 관리합니다." actions={<form action={logoutAction}><button className="button ghost" type="submit">로그아웃</button></form>} />
      {params.error && <p className="form-error" role="alert">{params.error}</p>}
      <Panel title="사용자 목록" description={`${users.length}명의 등록 사용자`}>
        <div className="analysis-table-wrap">
          <table className="analysis-table">
            <thead><tr><th>사용자</th><th>부서</th><th>권한</th><th>상태</th><th>가입일</th><th>관리</th></tr></thead>
            <tbody>{users.map((item) => {
              const isSelf = item.user_id === user.id;
              return <tr key={item.user_id}>
                <td><strong>{item.name || item.email}</strong><br /><span className="muted">{item.email}</span></td>
                <td>{item.department || '—'}</td>
                <td><Badge status={item.role === 'ADMIN' ? 'SAFE' : 'CALCULATION_UNAVAILABLE'}>{item.role}</Badge></td>
                <td><Badge status={item.active ? 'SAFE' : 'CRITICAL'}>{item.active ? '활성' : '비활성'}</Badge></td>
                <td>{new Date(item.created_at).toLocaleDateString('ko-KR')}</td>
                <td><div className="admin-actions">
                  <form action={changeUserRole}><input type="hidden" name="targetUserId" value={item.user_id} /><select name="role" defaultValue={item.role} disabled={isSelf}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select><button className="button ghost" type="submit" disabled={isSelf}>권한 저장</button></form>
                  <form action={changeUserActive}><input type="hidden" name="targetUserId" value={item.user_id} /><input type="hidden" name="active" value={String(!item.active)} /><button className="button ghost" type="submit" disabled={isSelf}>{item.active ? '비활성화' : '활성화'}</button></form>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}
