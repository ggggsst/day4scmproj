import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Model Comparison은 저장 결과만 조회하고 재실행하지 않는다', () => {
  const route = readFileSync('app/analysis/model-comparison/page.tsx', 'utf8');
  const content = readFileSync('components/analysis/model-comparison-content.tsx', 'utf8');
  assert.match(route, /getModelComparison/);
  assert.match(content, /ForecastOverlayChart/);
  assert.match(route, /searchParams/);
  assert.doesNotMatch(route, /run_baseline_forecast|run_backtest/);
  assert.doesNotMatch(route, /raw\.usage_history/);
});

test('ADMIN Backtest action은 서버 권한과 수동 reason을 확인한다', () => {
  const action = readFileSync('app/(admin)/admin/backtest/actions.ts', 'utf8');
  assert.match(action, /requireAdmin/);
  assert.match(action, /run_backtest/);
  assert.match(action, /reason/);
  assert.match(action, /set_manual_champion/);
});
