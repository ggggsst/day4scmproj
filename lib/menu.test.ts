import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_MENU, USER_MENU } from './menu.ts';

test('user menu exposes both implemented analysis routes', () => {
  assert.deepEqual(
    USER_MENU.filter((item) => item.kind === 'analysis').map((item) => item.href),
    ['/analysis/leadtime', '/analysis/stockout']
  );
});

test('admin and user menus are separate definitions', () => {
  assert.notStrictEqual(ADMIN_MENU, USER_MENU);
  assert.equal(ADMIN_MENU.every((item) => item.role === 'ADMIN'), true);
});
