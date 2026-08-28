import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const migration = readFileSync('supabase/migrations/20260828000100_create_auth_rbac.sql', 'utf8');

test('RBAC migration defines app user, audit log, and admin guard', () => {
  assert.match(migration, /create table if not exists core\.app_user/i);
  assert.match(migration, /create table if not exists core\.audit_log/i);
  assert.match(migration, /create or replace function core\.is_admin/i);
  assert.match(migration, /after insert on auth\.users/i);
  assert.doesNotMatch(migration, /insert into core\.app_user[^;]*@/is);
});

test('RBAC SQL does not grant anon mutation or keep open policies', () => {
  const grants = readFileSync('sql/01-grants.sql', 'utf8');
  const policies = readFileSync('sql/02-policies.sql', 'utf8');
  assert.doesNotMatch(grants, /grant\s+[^;]*(insert|update|delete)[^;]*\s+to\s+anon/i);
  assert.doesNotMatch(policies, /to\s+anon[^;]*using\s*\(true\)/is);
});
