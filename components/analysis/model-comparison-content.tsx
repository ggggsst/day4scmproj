'use client';

import { useState } from 'react';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import ForecastOverlayChart from '@/components/chart/forecast-overlay-chart';
import type { ChampionModel, ModelComparisonRow, ModelPerformance } from '@/lib/scm-model';

export default function ModelComparisonContent({ rows, performance, champions }: { rows: ModelComparisonRow[]; performance: ModelPerformance[]; champions: ChampionModel[] }) {
  const models = Array.from(new Set(rows.map((row) => row.modelId)));
  const [selected, setSelected] = useState(models);
  return <><div className="model-toggles"><span>표시 모델</span>{models.map((model) => <label key={model}><input type="checkbox" checked={selected.includes(model)} onChange={() => setSelected((current) => current.includes(model) ? current.filter((id) => id !== model) : [...current, model])} />{model}</label>)}</div><ForecastOverlayChart rows={rows} modelIds={selected} /><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Model Name</th><th>SKU</th><th>WAPE</th><th>MAPE</th><th>Bias</th><th>RMSE</th><th>MAE</th><th>Rank</th><th>Champion</th></tr></thead><tbody>{performance.filter((row) => selected.includes(row.modelId)).map((row) => { const champion = champions.find((item) => item.itemId === row.itemId)?.championModelId === row.modelId; return <tr key={`${row.runId}-${row.itemId}-${row.modelId}`}><td>{row.modelId}</td><td>{row.itemId}</td><td><EmptyValue value={row.wape} reasonCode={row.reasonCode} /></td><td><EmptyValue value={row.mape} reasonCode={row.reasonCode} /></td><td><EmptyValue value={row.bias} reasonCode={row.reasonCode} /></td><td><EmptyValue value={row.rmse} reasonCode={row.reasonCode} /></td><td><EmptyValue value={row.mae} reasonCode={row.reasonCode} /></td><td><EmptyValue value={row.rank} reasonCode={row.reasonCode} /></td><td>{champion ? <Badge status="SAFE">Champion</Badge> : <EmptyValue value={null} reasonCode="NOT_CHAMPION" />}</td></tr>; })}</tbody></table></div></>;
}
