import { requireAdmin } from '@/lib/auth';
import PageHeader from '@/components/shell/page-header';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import Panel from '@/components/ui/panel';
import { getChampions, getForecastRuns, getModelPerformance } from '@/lib/scm';
import type { ChampionModel, ForecastRun, ModelPerformance } from '@/lib/scm-model';
import { runBacktestAction, setManualChampionAction } from './actions';

export const dynamic = 'force-dynamic';

const performanceColumns: DataColumn<ModelPerformance>[] = [
  { key: 'itemId', label: 'SKU' }, { key: 'modelId', label: '모델' }, { key: 'wape', label: 'WAPE' }, { key: 'mape', label: 'MAPE' }, { key: 'bias', label: 'Bias' }, { key: 'rmse', label: 'RMSE' }, { key: 'mae', label: 'MAE' }, { key: 'rank', label: 'Rank' }, { key: 'reasonCode', label: '사유' },
];
const championColumns: DataColumn<ChampionModel>[] = [
  { key: 'itemId', label: 'SKU' }, { key: 'championModelId', label: 'Champion' }, { key: 'selectionMethod', label: '선정 방식' }, { key: 'selectionReason', label: '선정 근거' },
];

export default async function BacktestAdminPage() {
  await requireAdmin();
  const runs = await getForecastRuns();
  const performance = await getModelPerformance();
  const champions = await getChampions();
  return <main className="analysis-page"><PageHeader eyebrow="ADMIN" title="Backtest 관리" description="저장된 Forecast Result를 검증 Actual과 비교하고 Champion을 관리합니다." /><Panel title="Backtest 실행"><form action={runBacktestAction} className="analysis-filter"><label>Forecast Run<select name="forecastRunId" required><option value="">선택하세요</option>{runs.rows.filter((run) => run.status === 'SUCCESS').map((run) => <option key={run.runId} value={run.runId}>{run.runId} · {run.startedAt}</option>)}</select></label><button className="button primary" type="submit">Backtest 실행</button></form>{runs.error && <p className="text-danger">Forecast Run 조회 실패: {runs.error}</p>}</Panel><Panel title="Model Performance" description="모든 지표는 SQL에 저장된 검증 결과입니다.">{performance.error ? <p className="text-danger">성능 조회 실패: {performance.error}</p> : <DataTable columns={performanceColumns} rows={performance.rows} rowKey={(row) => `${row.runId}-${row.itemId}-${row.modelId}`} />}</Panel><Panel title="Champion 이력" description="기존 선정 결과는 삭제하지 않고 이력으로 보존합니다.">{champions.error ? <p className="text-danger">Champion 조회 실패: {champions.error}</p> : <DataTable columns={championColumns} rows={champions.rows} rowKey={(row) => `${row.itemId}-${row.selectedAt}`} />}</Panel><Panel title="수동 Champion 지정" description="reason은 필수이며 audit_log에 기록됩니다."><form action={setManualChampionAction} className="analysis-filter"><label>SKU<input name="itemId" required placeholder="ITEM001" /></label><label>모델<input name="modelId" required placeholder="MA_3M" /></label><label>사유<input name="reason" required placeholder="수동 지정 사유" /></label><button className="button primary" type="submit">Champion 지정</button></form></Panel></main>;
}
