'use client';

import type { ModelComparisonRow } from '@/lib/scm-model';

export default function ForecastOverlayChart({ rows, modelIds }: { rows: ModelComparisonRow[]; modelIds: string[] }) {
  const visible = rows.filter((row) => modelIds.includes(row.modelId));
  const periods = Array.from(new Set(visible.map((row) => row.period)));
  if (periods.length === 0) return <p className="empty-state">표시할 비교 결과가 없습니다.</p>;
  return <div className="forecast-chart" aria-label="Actual과 모델별 Forecast 비교 차트"><div className="forecast-chart-legend"><span className="chart-actual">Actual</span>{modelIds.map((id) => <span key={id} className="chart-model">{id}</span>)}</div><div className="forecast-chart-series">{periods.map((period) => <div className="forecast-chart-period" key={period}><span>{period}</span><div className="forecast-chart-values"><span className="chart-actual-value">실적 <b><span>{visible.find((row) => row.period === period && row.actualQty !== null)?.actualQty ?? '—'}</span></b></span>{modelIds.map((modelId) => { const row = visible.find((item) => item.period === period && item.modelId === modelId); const interval = row && row.p80 !== null && row.p90 !== null ? ` P80 ${row.p80} / P90 ${row.p90}` : ' 구간 산출 불가'; return <span key={modelId}>{modelId} <b>{row?.p50 ?? '—'}</b><small>{interval}</small></span>; })}</div></div>)}</div></div>;
}
