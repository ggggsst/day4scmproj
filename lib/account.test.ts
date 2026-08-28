import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const action = readFileSync('app/(user)/account/actions.ts', 'utf8');

test('account update requires an authenticated user and only updates profile fields', () => {
  assert.match(action, /const \{ user \} = await requireUser\(\)/);
  assert.match(action, /update\(\{ name, department \}\)/);
  assert.doesNotMatch(action, /update\(\{[^}]*role/i);
  assert.doesNotMatch(action, /update\(\{[^}]*active/i);
  assert.doesNotMatch(action, /@example\.com|password|admin@/i);
});
