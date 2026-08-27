import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLeadtimeGap, normalizeStockoutKpi, normalizeStockoutRisk } from './scm-model.ts';

test('normalizes analytics leadtime rows into the screen model', () => {
  const result = normalizeLeadtimeGap({
    supplier_name: 'Fujifilm BI India',
    country: 'India',
    master_lt: 32,
    sample_count: 159,
    actual_avg: 37.6,
    p80: 44,
    gap: 12,
  });

  assert.deepEqual(result, {
    supplier: 'Fujifilm BI India',
    country: 'India',
    masterLeadTime: 32,
    sampleCount: 159,
    actualAverage: 37.6,
    p80: 44,
    gap: 12,
  });
});

test('uses Korean view aliases and safe defaults', () => {
  const result = normalizeLeadtimeGap({ 법인: 'Japan', 국가: 'Japan', 표준리드타임: 7, 표본수: 278, 실적평균: 14.5, P80: 18, 격차: 11 });
  assert.equal(result.supplier, 'Japan');
  assert.equal(result.masterLeadTime, 7);
  assert.equal(result.p80, 18);
  assert.equal(result.gap, 11);
});

test('reads the real analytics.v_leadtime_gap column names', () => {
  const result = normalizeLeadtimeGap({
    supplier_name: 'Fujifilm BI China',
    country: 'China',
    std_lead_time: 25,
    n_samples: 210,
    mean_days: 28.4,
    p80_days: 33,
    gap_days: 8,
  });

  assert.deepEqual(result, {
    supplier: 'Fujifilm BI China',
    country: 'China',
    masterLeadTime: 25,
    sampleCount: 210,
    actualAverage: 28.4,
    p80: 33,
    gap: 8,
  });
});

test('normalizes analytics stockout risk rows and preserves unknown reasons', () => {
  const result = normalizeStockoutRisk({
    item_id: 'ITEM020',
    item_name: 'Toner Black',
    supplier_id: 'SUP003',
    current_stock: 0,
    inbound_qty: 0,
    available_qty: 0,
    daily_usage_avg: null,
    cv: 0.42,
    planned_lead_time: 28,
    stockout_days: null,
    stockout_date: null,
    risk_status: 'UNKNOWN',
    reason: 'NO_USAGE',
  });

  assert.deepEqual(result, {
    itemId: 'ITEM020',
    itemName: 'Toner Black',
    supplierId: 'SUP003',
    currentStock: 0,
    inboundQty: 0,
    availableQty: 0,
    dailyUsageAvg: null,
    cv: 0.42,
    plannedLeadTime: 28,
    stockoutDays: null,
    stockoutDate: null,
    riskStatus: 'UNKNOWN',
    reason: 'NO_USAGE',
  });
});

test('normalizes stockout KPI aliases', () => {
  const result = normalizeStockoutKpi({
    n_items: 20,
    n_critical: 3,
    n_safe: 15,
    n_unknown: 2,
    n_within_30d: 4,
    avg_stockout_days: 46.5,
  });

  assert.deepEqual(result, {
    itemCount: 20,
    criticalCount: 3,
    safeCount: 15,
    unknownCount: 2,
    within30DaysCount: 4,
    averageStockoutDays: 46.5,
  });
});
