import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRows } from './import/validate.ts';

const context = { itemIds: new Set(['ITEM001']), supplierIds: new Set(['SUP001']) };

test('returns errors for missing required values and invalid dates', () => {
  const result = validateRows('usage_history', [{ item_id: '', use_date: 'not-a-date', qty: null }], context);
  assert.equal(result.summary.errorRows, 1);
  assert.ok(result.errors.some((error) => error.errorCode === 'REQUIRED'));
  assert.ok(result.errors.some((error) => error.errorCode === 'INVALID_DATE'));
  assert.equal(result.rows[0].qty, null);
});

test('detects unknown items and duplicate source rows', () => {
  const rows = [
    { usage_id: 'u1', item_id: 'UNKNOWN', use_date: '2026-01-01', qty: 1 },
    { usage_id: 'u1', item_id: 'UNKNOWN', use_date: '2026-01-01', qty: 1 },
  ];
  const result = validateRows('usage_history', rows, context);
  assert.ok(result.errors.some((error) => error.errorCode === 'UNKNOWN_ITEM'));
  assert.ok(result.errors.some((error) => error.errorCode === 'DUPLICATE'));
});
