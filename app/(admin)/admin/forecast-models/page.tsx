import { requireAdmin } from '@/lib/auth';
import PageHeader from '@/components/shell/page-header';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import Panel from '@/components/ui/panel';
import { getForecastModels } from '@/lib/scm';
import type { ForecastModel } from '@/lib/scm-model';
import { toggleForecastModel } from './actions';

export const dynamic = 'force-dynamic';

const columns: DataColumn<ForecastModel>[] = [
  { key: 'modelName', label: '모델명' },
  { key: 'family', label: 'Family' },
  { key: 'engine', label: 'Engine' },
  { key: 'version', label: 'Version' },
  { key: 'enabled', label: '사용', render: (row) => <form action={toggleForecastModel}><input type="hidden" name="modelId" value={row.modelId} /><input type="hidden" name="enabled" value={String(!row.enabled)} /><button className="button ghost" type="submit">{row.enabled ? '사용 중' : '중지'}</button></form> },
  { key: 'applicableDemandType', label: '적용 수요 유형', render: (row) => row.applicableDemandType.join(', ') },
  { key: 'parameters', label: 'Parameters', render: (row) => <code>{JSON.stringify(row.parameters)}</code> },
];

export default async function ForecastModelsPage() {
  await requireAdmin();
  const { rows, error } = await getForecastModels();
  return <main className="analysis-page"><PageHeader eyebrow="ADMIN" title="Forecast 모델" description="SQL Baseline 모델의 사용 여부와 실행 parameters를 확인합니다." /><Panel title="Model Registry" description="모델 계산은 DB에 저장된 정의와 parameters를 사용합니다.">{error ? <p className="text-danger">조회에 실패했습니다: {error}</p> : <DataTable columns={columns} rows={rows} rowKey={(row) => row.modelId} empty="등록된 Forecast 모델이 없습니다." />}</Panel></main>;
}
