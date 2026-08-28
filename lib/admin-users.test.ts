import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('admin actions start with server-side admin authorization and use DB RPCs', () => {
  const source = readFileSync('app/(admin)/admin/users/actions.ts', 'utf8');
  assert.match(source, /const \{ user \} = await requireAdmin\(\);/g);
  assert.match(source, /admin_change_user_role/);
  assert.match(source, /admin_change_user_active/);
  assert.doesNotMatch(source, /@(?:gmail|example)\./i);
});
