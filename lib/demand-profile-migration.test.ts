import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20260828000400_create_demand_profile.sql', 'utf8');

test('Demand Profile views are built from train demand only', () => {
  assert.match(sql, /create or replace view core\.v_train_period_grid/i);
  assert.match(sql, /create or replace view analytics\.v_sku_demand_profile/i);
  assert.match(sql, /create or replace view analytics\.v_demand_profile_kpi/i);
  assert.doesNotMatch(sql, /raw\.usage_history/i);
  assert.doesNotMatch(sql, /v_test_actual/i);
  assert.match(sql, /1\.32/);
  assert.match(sql, /0\.49/);
});

test('seasonality is unavailable before 24 periods and profile preserves reasons', () => {
  assert.match(sql, /INSUFFICIENT_PERIODS/);
  assert.match(sql, /NO_NONZERO_DEMAND/);
  assert.match(sql, /NO_VARIABILITY/);
  assert.match(sql, /generate_series/i);
});
