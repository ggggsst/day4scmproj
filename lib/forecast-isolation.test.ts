import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const sql = readFileSync('supabase/migrations/20260828000200_create_forecast_data_model.sql', 'utf8');

test('STEP 3 migration exposes raw inputs, policy tables, and isolated views', () => {
  for (const name of ['business_event', 'sales_order', 'item_substitute']) {
    assert.match(sql, new RegExp(`create table if not exists raw\\.${name}`, 'i'));
  }
  for (const name of ['policy_config', 'outlier_rule', 'item_policy', 'forecast_setting']) {
    assert.match(sql, new RegExp(`create table if not exists core\\.${name}`, 'i'));
  }
  assert.match(sql, /create or replace view core\.v_train_demand/i);
  assert.match(sql, /create or replace view core\.v_test_actual/i);
  assert.match(sql, /create or replace view analytics\.v_data_coverage/i);
});

test('train and test views read configured bounds without fixed dates', () => {
  assert.match(sql, /forecast_setting/i);
  assert.match(sql, /train_start/i);
  assert.match(sql, /train_end/i);
  assert.match(sql, /test_start/i);
  assert.match(sql, /test_end/i);
  assert.doesNotMatch(sql, /202[0-9]-[0-9]{2}-[0-9]{2}/);
  assert.doesNotMatch(sql, /raw\.usage_history[^;]*(insert|update|delete)/is);
});

test('raw ingestion tracking columns are added without replacing existing tables', () => {
  assert.match(sql, /foreach table_name in array array\[/i);
  assert.match(sql, /execute format\('alter table raw\.%I add column if not exists batch_id\s+uuid'/i);
  assert.match(sql, /'usage_history'/i);
  assert.match(sql, /'shipment_log'/i);
  assert.match(sql, /source_record_id/i);
  assert.doesNotMatch(sql, /drop table\s+if exists raw\./i);
});
