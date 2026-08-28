import { requireAdmin } from '@/lib/auth';
import { getForecastSettingsData } from '@/lib/scm';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import DataTable from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';

export const dynamic = 'force-dynamic';

function date(value: string | null) {
  return value ?? '— + NOT_CONFIGURED';
}

export default async function ForecastSettingsPage() {
  await requireAdmin();
  const result = await getForecastSettingsData();

  if (result.error) {
    return <main className="analysis-page"><PageHeader eyebrow="ADMIN / FORECAST" title="Forecast 설정 검증" description="학습·검증 데이터 경계와 운영 정책을 확인합니다." /><p className="error-message">조회에 실패했습니다: {result.error}</p></main>;
  }

  const coverage = result.coverage;
  return (
    <main className="analysis-page">
      <PageHeader eyebrow="ADMIN / FORECAST" title="Forecast 설정 검증" description="학습·검증 데이터 경계와 운영 정책을 확인합니다." />
      <div className="grid grid-3">
        <Panel title="전체 데이터 기간"><p className="metric"><EmptyValue value={coverage ? `${date(coverage.dataStart)} ~ ${date(coverage.dataEnd)}` : null} reasonCode="NO_COVERAGE" /></p></Panel>
        <Panel title="학습 기간"><p className="metric"><EmptyValue value={coverage ? `${date(coverage.trainStart)} ~ ${date(coverage.trainEnd)}` : null} reasonCode="NO_SETTING" /></p><p className="muted">행 수: {coverage?.trainRowCount ?? '—'}</p></Panel>
        <Panel title="검증 기간"><p className="metric"><EmptyValue value={coverage ? `${date(coverage.testStart)} ~ ${date(coverage.testEnd)}` : null} reasonCode="NO_SETTING" /></p><p className="muted">행 수: {coverage?.testRowCount ?? '—'}</p></Panel>
      </div>
      <Panel title="데이터 격리 상태" description="DB view가 설정된 기간을 기준으로 반환한 검증 결과입니다.">
        <DataTable columns={[
          { key: 'granularity', label: 'Granularity', render: () => <EmptyValue value={coverage?.granularity} reasonCode="NOT_CONFIGURED" /> },
          { key: 'train', label: 'Train window', render: () => coverage?.trainWindowOk ? '정상' : '확인 필요' },
          { key: 'test', label: 'Test window', render: () => coverage?.testWindowOk ? '정상' : '확인 필요' },
          { key: 'isolation', label: 'Data isolation', render: () => coverage?.dataIsolationOk ? '정상' : '확인 필요' },
        ]} rows={[{ id: 'coverage' }]} />
      </Panel>
      <Panel title="Forecast 기간 설정"><DataTable columns={[
        { key: 'trainStart', label: 'Train 시작' }, { key: 'trainEnd', label: 'Train 종료' },
        { key: 'testStart', label: 'Test 시작' }, { key: 'testEnd', label: 'Test 종료' }, { key: 'granularity', label: 'Granularity' },
      ]} rows={result.settings} rowKey={(row) => row.settingId} /></Panel>
      <Panel title="정책값"><DataTable columns={[
        { key: 'policyKey', label: '정책 키' }, { key: 'valueType', label: '형식' }, { key: 'policyValue', label: '값' }, { key: 'description', label: '설명' },
      ]} rows={result.policies} rowKey={(row) => row.policyKey} empty="등록된 정책값이 없습니다." /></Panel>
      <Panel title="학습 제외 규칙"><DataTable columns={[
        { key: 'ruleCode', label: '규칙 코드' }, { key: 'ruleName', label: '규칙명' }, { key: 'conditionType', label: '조건 유형' }, { key: 'excludeFromTraining', label: '학습 제외' },
      ]} rows={result.rules} rowKey={(row) => row.ruleCode} empty="등록된 제외 규칙이 없습니다." /></Panel>
    </main>
  );
}
