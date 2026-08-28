import { requireUser } from '@/lib/auth';
import { logoutAction } from '@/app/(auth)/actions';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import EmptyValue from '@/components/ui/empty-value';
import { updateAccountAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { profile } = await requireUser();
  const params = await searchParams;
  return (
    <main className="analysis-page">
      <PageHeader eyebrow="ACCOUNT" title="계정 관리" description="개인 프로필 정보를 확인하고 수정합니다." />
      {params.saved && <p className="success-message">계정 정보가 저장되었습니다.</p>}
      {params.error && <p className="error-message">{params.error}</p>}
      <Panel title="프로필">
        <form action={updateAccountAction} className="account-form">
          <label>이메일<input value={profile.email} readOnly /></label>
          <label>권한<input value={profile.role} readOnly /></label>
          <label>이름<input name="name" defaultValue={profile.name ?? ''} /></label>
          <label>부서<input name="department" defaultValue={profile.department ?? ''} /></label>
          <div className="button-row"><button className="button primary" type="submit">저장</button></div>
        </form>
      </Panel>
      <Panel title="세션">
        <p className="muted">현재 계정: <EmptyValue value={profile.email} reasonCode="NO_EMAIL" /></p>
        <form action={logoutAction}><button className="button" type="submit">로그아웃</button></form>
      </Panel>
    </main>
  );
}
