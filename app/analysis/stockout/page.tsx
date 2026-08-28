import AnalysisFrame from '@/components/analysis/analysis-frame';
import Badge from '@/components/ui/badge';
import DataTable, { formatNumber, type DataColumn } from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import { getStockoutKpi, getStockoutRisk } from '@/lib/scm';
import type { StockoutRisk } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

function RiskStatus({ row }: { row: StockoutRisk }) {
  if (row.riskStatus === 'CRITICAL') return <Badge status="CRITICAL" />;
  if (row.riskStatus === 'SAFE') return <Badge status="SAFE" />;
  return <Badge status="CALCULATION_UNAVAILABLE">{`계산 불가${row.reason ? ` · ${row.reason}` : ''}`}</Badge>;
}

const columns: DataColumn<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' },
  { key: 'itemName', label: '품목명' },
  { key: 'supplierId', label: '공급처' },
  { key: 'availableQty', label: '가용수량', align: 'right', render: (row) => <EmptyValue value={formatNumber(row.availableQty, '개')} reasonCode={row.availableQty === null ? 'CALCULATION_UNAVAILABLE' : null} /> },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (row) => <EmptyValue value={formatNumber(row.dailyUsageAvg, '개')} reasonCode={row.dailyUsageAvg === null ? 'NO_USAGE' : null} /> },
  { key: 'plannedLeadTime', label: '계획 리드타임', align: 'right', render: (row) => <EmptyValue value={formatNumber(row.plannedLeadTime, '일')} reasonCode={row.plannedLeadTime === null ? 'NO_LEADTIME' : null} /> },
  { key: 'stockoutDays', label: '소진 예상', align: 'right', render: (row) => <EmptyValue value={formatNumber(row.stockoutDays, '일')} reasonCode={row.reason ?? 'CALCULATION_UNAVAILABLE'} /> },
  { key: 'stockoutDate', label: '소진 예상일', render: (row) => <EmptyValue value={row.stockoutDate} reasonCode={row.reason ?? 'CALCULATION_UNAVAILABLE'} /> },
  { key: 'riskStatus', label: '판정', render: (row) => <RiskStatus row={row} /> },
];

export default async function StockoutPage() {
  const [riskResult, kpiResult] = await Promise.all([getStockoutRisk(), getStockoutKpi()]);

  if (riskResult.error) {
    return (
      <AnalysisFrame title="재고 소진 위험" description="현재고와 입고예정을 기준으로 품목별 소진 위험을 확인합니다.">
        <div className="card">
          <p className="text-danger">조회에 실패했습니다.</p>
          <p className="muted">{riskResult.error}</p>
        </div>
      </AnalysisFrame>
    );
  }

  if (kpiResult.error) {
    return (
      <AnalysisFrame title="재고 소진 위험" description="현재고와 입고예정을 기준으로 품목별 소진 위험을 확인합니다.">
        <div className="card">
          <p className="text-danger">KPI 조회에 실패했습니다.</p>
          <p className="muted">{kpiResult.error}</p>
        </div>
      </AnalysisFrame>
    );
  }

  const kpi = kpiResult.data;

  return (
    <AnalysisFrame title="재고 소진 위험" description="현재고와 입고예정을 기준으로 품목별 소진 위험을 확인합니다.">
      <div className="grid grid-4">
        <KpiCard label="전체 품목" value={kpi?.itemCount ?? riskResult.rows.length} foot="분석 대상 품목" />
        <KpiCard label="위험 품목" value={kpi?.criticalCount ?? <EmptyValue value={null} reasonCode="KPI_UNAVAILABLE" />} foot="리드타임 내 소진 예상" tone="critical" />
        <KpiCard label="판정 불가" value={kpi?.unknownCount ?? <EmptyValue value={null} reasonCode="KPI_UNAVAILABLE" />} foot="사용량·리드타임 확인 필요" />
        <KpiCard label="30일 이내 소진" value={kpi?.within30DaysCount ?? <EmptyValue value={null} reasonCode="KPI_UNAVAILABLE" />} foot="우선 검토 대상" tone="warning" />
      </div>

      <Panel title="품목별 재고 소진 위험" description="가용수량 ÷ 일평균 사용량">
        <DataTable
          columns={columns}
          rows={riskResult.rows}
          rowKey={(row, index) => `${row.itemId}-${index}`}
          empty="데이터가 없습니다. Exposed schemas 와 analytics.v_stockout_risk 를 확인하세요."
        />
      </Panel>
    </AnalysisFrame>
  );
}
