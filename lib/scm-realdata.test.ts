import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeShipmentTrend,
  normalizeDemandProfileRt,
  normalizeOlAccuracy,
  normalizeOlAccuracyFy,
  normalizeBomRequirement,
} from './scm-model.ts';

test('실출고 추이 행을 정규화한다', () => {
  assert.deepEqual(normalizeShipmentTrend({
    item_code: '602K02693', description: '부품', family: 'A', item_type: 'X', data_as_of: '2026-08',
    n_months: 40, first_ym: '2023-05', last_ym: '2026-08', months_since_last: 0, n_span: 40,
    total_qty: 779, latest_qty: 20, avg_3m: 772.3, avg_6m: null, avg_12m: 100,
    trend_3m_vs_12m: null, reason_code: 'INSUFFICIENT_HISTORY',
  }), {
    itemCode: '602K02693', description: '부품', family: 'A', itemType: 'X', dataAsOf: '2026-08',
    monthCount: 40, firstMonth: '2023-05', lastMonth: '2026-08', monthsSinceLast: 0, spanMonths: 40,
    totalQty: 779, latestQty: 20, average3m: 772.3, average6m: null, average12m: 100,
    trend3mVs12m: null, reasonCode: 'INSUFFICIENT_HISTORY',
  });
});

test('수요 프로파일의 null과 reason_code를 보존한다', () => {
  const result = normalizeDemandProfileRt({ item_code: '602K02693', description: null, family: null, item_type: 'X', data_as_of: '2026-08', first_ym: '2023-05', last_ym: '2026-08', n_periods: 40, n_nonzero: 0, mean_nonzero_qty: null, adi: null, zero_demand_rate: null, cv_squared: null, demand_type: null, reason_code: 'NO_POSITIVE_DEMAND' });
  assert.equal(result.itemCode, '602K02693');
  assert.equal(result.meanNonzeroQty, null);
  assert.equal(result.reasonCode, 'NO_POSITIVE_DEMAND');
});

test('OL 정확도와 회계연도 정확도를 정규화한다', () => {
  assert.equal(normalizeOlAccuracy({ model_base: 'A', fy_sheet: 'FY25', biz: 'B', n_rows: 2, first_ym: '2025-01', last_ym: '2025-02', total_act: 10, n_scored_sales: 2, sales_wape: null, sales_bias: 0.1, n_scored_scm: 1, scm_wape: 0.2, scm_bias: null, reason_code: 'NO_ACTUAL' }).reasonCode, 'NO_ACTUAL');
  assert.deepEqual(normalizeOlAccuracyFy({ fy_sheet: 'FY25', n_rows: 2, n_scored: 1, sales_wape: 0.1, scm_wape: null, sales_bias: 0, scm_bias: null }), { fiscalYear: 'FY25', rowCount: 2, scoredCount: 1, salesWape: 0.1, scmWape: null, salesBias: 0, scmBias: null });
});

test('BOM 요구량의 공용 여부와 null을 정규화한다', () => {
  assert.deepEqual(normalizeBomRequirement({ model_base: 'A', model_key: 'A-1', part_role: 'BOM', item_code: 'P1', description: null, qty: 2, bom_group: null, n_models: null, common_flag: null, common_note: null }), { modelBase: 'A', modelKey: 'A-1', partRole: 'BOM', itemCode: 'P1', description: null, quantity: 2, bomGroup: null, modelCount: null, commonFlag: null, commonNote: null });
});
