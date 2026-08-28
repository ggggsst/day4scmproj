import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForecastModel, normalizeForecastRun, normalizeForecastResult } from './scm-model.ts';

test('Forecast model 정규화가 parameters와 적용 수요 유형을 보존한다', () => {
  const model = normalizeForecastModel({ model_id: 'MA_3M', model_name: '3개월 이동평균', family: 'MOVING_AVERAGE', engine: 'SQL', version: '1.0.0', enabled: true, is_default: true, applicable_demand_type: ['SMOOTH'], parameters: { window: 3 }, description: null });
  assert.equal(model.modelId, 'MA_3M');
  assert.deepEqual(model.parameters, { window: 3 });
  assert.deepEqual(model.applicableDemandType, ['SMOOTH']);
});

test('Forecast 결과의 계산 불가 null을 숫자로 바꾸지 않는다', () => {
  const result = normalizeForecastResult({ run_id: 'r1', model_id: 'PY_SAME_MONTH', item_id: 'ITEM001', period: '2026-01-01', model_version: '1.0.0', predicted_qty: null, p50: null, p80: null, p90: null, sigma: null, basis: 'INSUFFICIENT_HISTORY' });
  assert.equal(result.predictedQty, null);
  assert.equal(result.p80, null);
  assert.equal(result.basis, 'INSUFFICIENT_HISTORY');
});

test('Forecast run 정규화가 stale와 실행 메타데이터를 보존한다', () => {
  const run = normalizeForecastRun({ run_id: 'r1', status: 'SUCCESS', granularity: 'MONTH', train_start: '2025-01-01', train_end: '2025-12-31', horizon: 3, n_models: 5, n_items: 20, n_rows: 300, data_snapshot_at: '2026-01-01T00:00:00Z', is_stale: true, triggered_email: 'admin@example.invalid' });
  assert.equal(run.runId, 'r1');
  assert.equal(run.isStale, true);
  assert.equal(run.nRows, 300);
});
