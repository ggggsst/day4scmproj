import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20260828000600_create_backtest_champion.sql', 'utf8');

test('Backtest와 Champion DB 객체를 정의한다', () => {
  for (const name of ['backtest_run', 'model_performance', 'champion_model', 'run_backtest', 'set_manual_champion']) assert.match(sql, new RegExp(name, 'i'));
  for (const name of ['v_model_performance', 'v_champion_model', 'v_model_comparison']) assert.match(sql, new RegExp(name, 'i'));
});

test('성능지표·rank·후보 전체 근거를 SQL로 저장한다', () => {
  for (const name of ['WAPE', 'MAPE', 'Bias', 'RMSE', 'MAE', 'baseline_improvement', 'candidate_performance', 'selection_reason']) assert.match(sql, new RegExp(name, 'i'));
  assert.match(sql, /row_number\(\)/i);
  assert.match(sql, /champion_metric/i);
  assert.match(sql, /NO_NONZERO_ACTUAL|NO_FORECAST/i);
});

test('scoring은 저장 Forecast와 검증 view를 사용하고 raw usage를 직접 조회하지 않는다', () => {
  const functionBody = sql.match(/create or replace function core\.run_backtest[\s\S]*?\$\$;/i)?.[0] ?? '';
  assert.match(functionBody, /forecast_result/i);
  assert.match(functionBody, /v_test_actual/i);
  assert.doesNotMatch(functionBody, /raw\.usage_history/i);
  assert.match(sql, /MANUAL/);
  assert.match(sql, /audit_log/i);
});
