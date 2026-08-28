import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';

export default function AdminSettingsPage() {
  return (
    <main className="analysis-page">
      <PageHeader eyebrow="ADMIN" title="시스템 설정" description="관리자 전용 설정 화면입니다." />
      <Panel title="관리자 기능 준비 중" description="사용자 권한과 시스템 기준 설정은 운영 정책 확정 후 연결합니다.">
        <p className="empty-state">표시할 설정 항목이 없습니다.</p>
      </Panel>
    </main>
  );
}
