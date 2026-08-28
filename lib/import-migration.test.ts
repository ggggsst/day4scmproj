import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20260828000300_create_import_pipeline.sql', 'utf8');

test('import migration defines batch staging errors and mappings', () => {
  for (const table of ['upload_batch', 'import_staging', 'column_mapping', 'validation_error']) assert.match(sql, new RegExp(`create table if not exists core\\.${table}`, 'i'));
  assert.match(sql, /create or replace function core\.import_batch/i);
  assert.match(sql, /create or replace function core\.rollback_batch/i);
  assert.match(sql, /revoke all on .* from anon/i);
  assert.doesNotMatch(sql, /grant .* on .*raw.* to anon/i);
});

test('rollback is scoped by batch and replace is explicitly limited', () => {
  assert.match(sql, /where batch_id = \$1/i);
  assert.match(sql, /replace batch는 완전 rollback을 지원하지 않습니다/i);
});

test('every imported row receives a deterministic source record id', () => {
  assert.match(sql, /row_number integer := 0/i);
  assert.match(sql, /p_batch_id::text \|\| ':' \|\| row_number/i);
});
