import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRole, safeNextPath } from './auth-model.ts';

test('normalizes only database roles', () => {
  assert.equal(normalizeRole('ADMIN'), 'ADMIN');
  assert.equal(normalizeRole('USER'), 'USER');
  assert.equal(normalizeRole('admin'), null);
  assert.equal(normalizeRole(null), null);
});

test('accepts only safe relative next paths', () => {
  assert.equal(safeNextPath('/analysis/leadtime'), '/analysis/leadtime');
  assert.equal(safeNextPath('https://evil.example'), '/');
  assert.equal(safeNextPath('//evil.example'), '/');
  assert.equal(safeNextPath(null), '/');
});
