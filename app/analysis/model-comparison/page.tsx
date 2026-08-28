import AnalysisFrame from '@/components/analysis/analysis-frame';
import ModelComparisonContent from '@/components/analysis/model-comparison-content';
import Panel from '@/components/ui/panel';
import { getModelComparison } from '@/lib/scm';

export const dynamic = 'force-dynamic';
type SearchParams = Promise<{ runId?: string; itemId?: string; from?: string; to?: string }>;

export default async function ModelComparisonPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const result = await getModelComparison(params.runId);
  if (result.error) return <AnalysisFrame title="모델 비교" description="검증기간 Actual과 저장된 Forecast를 비교합니다."><div className="card"><p className="text-danger">조회에 실패했습니다.</p><p className="muted">{result.error}</p></div></AnalysisFrame>;
  const rows = result.rows.filter((row) => (!params.itemId || row.itemId === params.itemId) && (!params.from || row.period >= params.from) && (!params.to || row.period <= params.to));
  const performance = result.performance.filter((row) => !params.itemId || row.itemId === params.itemId);
  return <AnalysisFrame title="모델 비교" description="저장된 Forecast Result와 검증기간 Actual을 비교합니다."><Panel title="Model Comparison" description="모델 선택은 저장된 결과의 표시만 변경하며 Forecast·Backtest를 재실행하지 않습니다."><form className="analysis-filter" method="get"><label>Forecast Run<input name="runId" defaultValue={params.runId ?? ''} placeholder="Run ID" /></label><label>SKU<input name="itemId" defaultValue={params.itemId ?? ''} placeholder="SKU" /></label><label>시작 기간<input type="date" name="from" defaultValue={params.from ?? ''} /></label><label>종료 기간<input type="date" name="to" defaultValue={params.to ?? ''} /></label><button className="button primary" type="submit">조회</button><a className="button" href={`/analysis/model-comparison/export${params.runId ? `?runId=${encodeURIComponent(params.runId)}` : ''}`}>CSV 다운로드</a></form><ModelComparisonContent rows={rows} performance={performance} champions={result.champions} /></Panel></AnalysisFrame>;
}
