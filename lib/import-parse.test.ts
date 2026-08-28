import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from './import/parse.ts';

test('parses CSV headers and preserves empty values', async () => {
  const result = await parseCsv(Buffer.from('품목코드,출고일,출고수량\nITEM001,2026-01-01,\n'));
  assert.deepEqual(result.headers, ['품목코드', '출고일', '출고수량']);
  assert.equal(result.rows[0]['출고수량'], '');
});
