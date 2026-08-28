import AnalysisFrame from '@/components/analysis/analysis-frame';
import Badge, { type Status } from '@/components/ui/badge';
import DataTable, { formatNumber, type DataColumn } from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import { getDemandProfileData } from '@/lib/scm';
import type { DemandProfile, DemandType } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ type?: string; availability?: string; q?: string }>;

const demandTypes: DemandType[] = ['SMOOTH', 'INTERMITTENT', 'ERRATIC', 'LUMPY'];

function demandTypeStatus(type: DemandType | null): Status {
  if (type === 'SMOOTH') return 'SAFE';
  if (type === 'INTERMITTENT') return 'WARNING';
  if (type === 'ERRATIC' || type === 'LUMPY') return 'CRITICAL';
  return 'CALCULATION_UNAVAILABLE';
}

function demandTypeLabel(type: DemandType | null) {
  return type === 'SMOOTH' ? '평활' : type === 'INTERMITTENT' ? '간헐' : type === 'ERRATIC' ? '변동' : type === 'LUMPY' ? '요철' : undefined;
}

function valueOrUnavailable(value: number | string | null, reasonCode: string | null) {
  return <EmptyValue value={typeof value === 'number' ? formatNumber(value) : value} reasonCode={reasonCode ?? 'CALCULATION_UNAVAILABLE'} />;
}

const columns: DataColumn<DemandProfile>[] = [
  { key: 'itemId', label: 'SKU' },
  { key: 'itemName', label: '품목명', render: (row) => <EmptyValue value={row.itemName} reasonCode={row.reasonCode} /> },
  { key: 'adi', label: 'ADI', align: 'right', render: (row) => valueOrUnavailable(row.adi, row.reasonCode) },
  { key: 'cvSquared', label: 'CV²', align: 'right', render: (row) => valueOrUnavailable(row.cvSquared, row.reasonCode) },
  { key: 'zeroDemandRate', label: '무수요율', align: 'right', render: (row) => valueOrUnavailable(row.zeroDemandRate, row.reasonCode) },
  { key: 'trend', label: '추세', align: 'right', render: (row) => valueOrUnavailable(row.trend, row.reasonCode) },
  { key: 'demandType', label: '수요 유형', render: (row) => <Badge status={demandTypeStatus(row.demandType)}>{demandTypeLabel(row.demandType)}</Badge> },
  { key: 'seasonality', label: '계절성', render: (row) => <EmptyValue value={row.seasonality === 'AVAILABLE_FOR_CHECK' ? '판정 가능' : row.seasonality} reasonCode={row.reasonCode} /> },
  { key: 'reasonCode', label: '사유', render: (row) => <EmptyValue value={row.reasonCode} /> },
];

export default async function DemandProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const { rows, kpi, error } = await getDemandProfileData();

  if (error) {
    return <AnalysisFrame title="SKU 수요 패턴" description="학습 구간의 SKU별 수요 특성을 확인합니다."><div className="card"><p className="text-danger">조회에 실패했습니다.</p><p className="muted">{error}</p></div></AnalysisFrame>;
  }

  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? '';
  const filtered = rows.filter((row) => {
    const typeOk = !params.type || params.type === 'ALL' || row.demandType === params.type;
    const availabilityOk = !params.availability || params.availability === 'ALL' || (params.availability === 'AVAILABLE' ? row.demandType !== null : row.demandType === null);
    const queryOk = !query || row.itemId.toLowerCase().includes(query) || (row.itemName ?? '').toLowerCase().includes(query);
    return typeOk && availabilityOk && queryOk;
  });

  return (
    <AnalysisFrame title="SKU 수요 패턴" description="검증기간을 제외한 학습 구간만으로 SKU별 수요 특성을 분류합니다.">
      <div className="grid grid-4">
        <KpiCard label="전체 SKU" value={kpi?.totalItems ?? <EmptyValue value={null} reasonCode="CALCULATION_UNAVAILABLE" />} />
        <KpiCard label="평활" value={kpi?.smooth ?? <EmptyValue value={null} reasonCode="CALCULATION_UNAVAILABLE" />} tone="safe" />
        <KpiCard label="간헐·요철" value={kpi?.crostonNeeded ?? <EmptyValue value={null} reasonCode="CALCULATION_UNAVAILABLE" />} tone="warning" foot="Croston 계열 후보" />
        <KpiCard label="계산 불가" value={kpi?.calculationUnavailable ?? <EmptyValue value={null} reasonCode="CALCULATION_UNAVAILABLE" />} tone="critical" />
      </div>
      <Panel title="SKU 수요 프로파일" description="필터는 저장된 analytics 결과에만 적용됩니다.">
        <form className="analysis-filter" method="get">
          <label>수요 유형<select name="type" defaultValue={params.type ?? 'ALL'}><option value="ALL">전체</option>{demandTypes.map((type) => <option key={type} value={type}>{demandTypeLabel(type)}</option>)}</select></label>
          <label>계산 상태<select name="availability" defaultValue={params.availability ?? 'ALL'}><option value="ALL">전체</option><option value="AVAILABLE">계산 가능</option><option value="UNAVAILABLE">계산 불가</option></select></label>
          <label>SKU 검색<input name="q" defaultValue={params.q ?? ''} placeholder="SKU 또는 품목명" /></label>
          <button className="button primary" type="submit">조회</button>
        </form>
        <DataTable columns={columns} rows={filtered} rowKey={(row) => row.itemId} empty="표시할 데이터가 없습니다. Exposed schemas 와 analytics.v_sku_demand_profile 을 확인하세요." />
      </Panel>
    </AnalysisFrame>
  );
}
