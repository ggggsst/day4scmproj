import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeModelPerformance, normalizeChampionModel } from './scm-model.ts';

test('Model Performance 정규화가 null 지표와 reason을 보존한다', () => {
  const result = normalizeModelPerformance({ run_id: 'r1', model_id: 'MA_3M', model_version: '1.0.0', item_id: 'ITEM001', n_periods: 3, wape: null, mape: null, bias: 2, rmse: 1.4, mae: 1, baseline_improvement: null, rank: null, calculation_status: 'NO_NONZERO_ACTUAL' });
  assert.equal(result.wape, null);
  assert.equal(result.mape, null);
  assert.equal(result.calculationStatus, 'NO_NONZERO_ACTUAL');
});

test('Champion 정규화가 자동 선정과 후보 전체를 보존한다', () => {
  const champion = normalizeChampionModel({ item_id: 'ITEM001', champion_model_id: 'MA_3M', model_version: '1.0.0', champion_metric: 'WAPE', champion_metric_value: 0.12, candidate_performance: [{ model_id: 'MA_3M', wape: 0.12 }], selection_reason: '최저 WAPE', selection_method: 'AUTO' });
  assert.equal(champion.selectionMethod, 'AUTO');
  assert.equal(champion.candidatePerformance.length, 1);
});
