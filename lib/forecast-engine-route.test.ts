import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Forecast 관리 화면은 ADMIN과 analytics view를 사용한다', () => {
  const models = readFileSync('app/(admin)/admin/forecast-models/page.tsx', 'utf8');
  const runs = readFileSync('app/(admin)/admin/forecast-runs/page.tsx', 'utf8');
  assert.match(models, /requireAdmin/);
  assert.match(models, /getForecastModels/);
  assert.match(runs, /requireAdmin/);
  assert.match(runs, /getForecastRuns/);
  assert.doesNotMatch(models, /core.*from/);
  assert.doesNotMatch(runs, /core.*from/);
});
