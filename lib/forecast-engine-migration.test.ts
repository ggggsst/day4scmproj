import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20260828000500_create_forecast_engine.sql', 'utf8');

test('Forecast Engine의 core 객체와 analytics view를 정의한다', () => {
  for (const name of ['model_config', 'model_version', 'forecast_run', 'forecast_result', 'run_baseline_forecast']) assert.match(sql, new RegExp(name, 'i'));
  for (const name of ['v_model_config', 'v_forecast_run', 'v_forecast_result', 'v_forecast_run_kpi']) assert.match(sql, new RegExp(name, 'i'));
});

test('등록 모델과 DB parameters를 사용한다', () => {
  for (const name of ['MA_3M', 'MA_6M', 'WMA_3M', 'PY_SAME_MONTH', 'SEASONAL_NAIVE']) assert.match(sql, new RegExp(name));
  assert.match(sql, /parameters.*jsonb/i);
  assert.match(sql, /3.*2.*1/);
  assert.match(sql, /applicable_demand_type/i);
});

test('Forecast 계산은 train grid를 사용하고 test/raw usage를 직접 조회하지 않는다', () => {
  assert.match(sql, /core\.v_train_period_grid/i);
  const functionBody = sql.match(/create or replace function core\.run_baseline_forecast\(\)[\s\S]*?\$\$;/i)?.[0] ?? '';
  assert.doesNotMatch(functionBody, /raw\.usage_history/i);
  assert.doesNotMatch(functionBody, /core\.v_test_actual/i);
  assert.match(sql, /INSUFFICIENT_HISTORY/i);
  assert.match(sql, /data_snapshot_at/i);
  assert.match(sql, /is_stale/i);
});

test('실행 상태와 권한을 보호한다', () => {
  assert.match(sql, /RUNNING/);
  assert.match(sql, /SUCCESS/);
  assert.match(sql, /FAILED/);
  assert.match(sql, /core\.is_admin\(\)/i);
  assert.match(sql, /revoke all.*anon/i);
});
