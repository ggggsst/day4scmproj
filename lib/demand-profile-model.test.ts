import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDemandProfile, normalizeDemandProfileKpi } from './scm-model.ts';

test('normalizes profile values and preserves unavailable reasons', () => {
  const result = normalizeDemandProfile({ item_id: 'ITEM001', item_name: '부품', n_periods: 12, n_nonzero_periods: 4, adi: 3, cv: null, cv_squared: null, zero_demand_rate: 0.66, trend: null, recent_change_rate: null, peak_period: '2026-01', demand_type: null, seasonality: null, reason_code: 'NO_VARIABILITY', stability: 'CALCULATION_UNAVAILABLE' });
  assert.equal(result.itemId, 'ITEM001');
  assert.equal(result.adi, 3);
  assert.equal(result.cvSquared, null);
  assert.equal(result.reasonCode, 'NO_VARIABILITY');
});

test('normalizes KPI demand type counts', () => {
  const result = normalizeDemandProfileKpi({ total_items: 10, n_smooth: 2, n_intermittent: 3, n_erratic: 4, n_lumpy: 1, n_croston_needed: 4, n_calculation_unavailable: 0 });
  assert.deepEqual(result, { totalItems: 10, smooth: 2, intermittent: 3, erratic: 4, lumpy: 1, crostonNeeded: 4, calculationUnavailable: 0 });
});
