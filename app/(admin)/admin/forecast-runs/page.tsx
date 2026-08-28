import { requireAdmin } from '@/lib/auth';
import PageHeader from '@/components/shell/page-header';
import Badge, { type Status } from '@/components/ui/badge';
import DataTable, { formatNumber, type DataColumn } from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import Panel from '@/components/ui/panel';
import { getForecastRuns } from '@/lib/scm';
import type { ForecastRun } from '@/lib/scm-model';
import { runBaselineForecast } from '../forecast-models/actions';

export const dynamic = 'force-dynamic';

function statusType(status: ForecastRun['status']): Status { return status === 'SUCCESS' ? 'SAFE' : status === 'RUNNING' ? 'WARNING' : 'CRITICAL'; }

const columns: DataColumn<ForecastRun>[] = [
  { key: 'runId', label: 'Run ID' },
  { key: 'status', label: '상태', render: (row) => <Badge status={statusType(row.status)}>{row.status}</Badge> },
  { key: 'startedAt', label: '실행시간', render: (row) => <EmptyValue value={row.startedAt} /> },
  { key: 'nModels', label: '모델 수', align: 'right' },
  { key: 'nItems', label: 'SKU 수', align: 'right' },
  { key: 'nRows', label: '결과 행', align: 'right' },
  { key: 'dataSnapshotAt', label: 'Data Snapshot', render: (row) => <EmptyValue value={row.dataSnapshotAt} /> },
  { key: 'isStale', label: 'Stale', render: (row) => row.isStale ? <Badge status="WARNING">STALE</Badge> : <Badge status="SAFE">최신</Badge> },
  { key: 'triggeredEmail', label: '실행자', render: (row) => <EmptyValue value={row.triggeredEmail} /> },
];

export default async function ForecastRunsPage() {
  await requireAdmin();
  const { rows, error } = await getForecastRuns();
  return <main className="analysis-page"><PageHeader eyebrow="ADMIN" title="Forecast 실행 이력" description="실행별 모델 snapshot, 결과 건수와 데이터 최신화 상태를 확인합니다." actions={<form action={runBaselineForecast}><button className="button primary" type="submit">Baseline 실행</button></form>} /><Panel title="Forecast Runs">{error ? <p className="text-danger">조회에 실패했습니다: {error}</p> : <DataTable columns={columns} rows={rows} rowKey={(row) => row.runId} empty="Forecast 실행 이력이 없습니다." />}</Panel></main>;
}
