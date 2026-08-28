import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const route = readFileSync(join(process.cwd(), 'app/analysis/demand-profile/page.tsx'), 'utf8');

test('수요 프로파일 화면은 저장된 analytics 결과와 공통 상태 컴포넌트를 사용한다', () => {
  assert.match(route, /getDemandProfileData/);
  assert.match(route, /EmptyValue/);
  assert.match(route, /Badge/);
  assert.match(route, /searchParams/);
  assert.doesNotMatch(route, /raw\.usage_history/);
  assert.doesNotMatch(route, /v_test_actual/);
});
