import test from 'node:test';
import assert from 'node:assert/strict';
import { getImportDefinition } from './import/schema.ts';

test('supports only existing raw and STEP 3 import types', () => {
  assert.ok(getImportDefinition('usage_history'));
  assert.ok(getImportDefinition('business_event'));
  assert.ok(getImportDefinition('sales_order'));
  assert.equal(getImportDefinition('not_a_table'), null);
});

test('maps Korean headers to standard fields', () => {
  const definition = getImportDefinition('usage_history');
  assert.ok(definition);
  assert.equal(definition.aliases['품목코드'], 'item_id');
  assert.equal(definition.aliases['출고일'], 'use_date');
});
