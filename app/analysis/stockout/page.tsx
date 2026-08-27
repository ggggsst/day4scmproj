import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import { getStockoutKpi, getStockoutRisk } from '@/lib/scm';
import type { StockoutRisk } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

function RiskStatus({ row }: { row: StockoutRisk }) {
  if (row.riskStatus === 'CRITICAL') return <span className="tag red">위험</span>;
  if (row.riskStatus === 'SAFE') return <span className="tag green">안전</span>;
  return (
    <span className="tag gray">
      판정 불가{row.reason ? ` · ${row.reason === 'NO_USAGE' ? '사용량 없음' : '리드타임 없음'}` : ''}
    </span>
  );
}

const columns: Column<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' },
  { key: 'itemName', label: '품목명' },
  { key: 'supplierId', label: '공급처' },
  { key: 'availableQty', label: '가용수량', align: 'right', render: (row) => formatNumber(row.availableQty, '개') },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (row) => formatNumber(row.dailyUsageAvg, '개') },
  { key: 'plannedLeadTime', label: '계획 리드타임', align: 'right', render: (row) => formatNumber(row.plannedLeadTime, '일') },
  { key: 'stockoutDays', label: '소진 예상', align: 'right', render: (row) => formatNumber(row.stockoutDays, '일') },
  { key: 'stockoutDate', label: '소진 예상일', render: (row) => row.stockoutDate ?? '—' },
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
        <div className="card metric"><div className="metric-label">전체 품목</div><div className="metric-value">{kpi?.itemCount ?? riskResult.rows.length}</div><div className="metric-foot">분석 대상 품목</div></div>
        <div className="card metric"><div className="metric-label">위험 품목</div><div className="metric-value">{kpi?.criticalCount ?? '—'}</div><div className="metric-foot danger">리드타임 내 소진 예상</div></div>
        <div className="card metric"><div className="metric-label">판정 불가</div><div className="metric-value">{kpi?.unknownCount ?? '—'}</div><div className="metric-foot">사용량·리드타임 확인 필요</div></div>
        <div className="card metric"><div className="metric-label">30일 이내 소진</div><div className="metric-value">{kpi?.within30DaysCount ?? '—'}</div><div className="metric-foot warn">우선 검토 대상</div></div>
      </div>

      <div className="section card">
        <div className="card-title">
          <h3>품목별 재고 소진 위험</h3>
          <span>가용수량 ÷ 일평균 사용량</span>
        </div>
        <DataTable
          columns={columns}
          rows={riskResult.rows}
          rowKey={(row, index) => `${row.itemId}-${index}`}
          empty="데이터가 없습니다. Exposed schemas 와 analytics.v_stockout_risk 를 확인하세요."
        />
      </div>
    </AnalysisFrame>
  );
}
