const test = require('node:test');
const assert = require('node:assert/strict');
const { parseApiResponse, normalizeArray, normalizeObject } = require('../../src/src/apiUtils.cjs');





test('parseApiResponse parses successful JSON payloads', async () => {
  const response = {
    ok: true,
    text: async () => JSON.stringify({ success: true, value: 42 }),
  };

  const data = await parseApiResponse(response);
  assert.deepEqual(data, { success: true, value: 42 });
});

test('parseApiResponse throws a friendly error for failed responses', async () => {
  const response = {
    ok: false,
    status: 401,
    text: async () => JSON.stringify({ error: 'Authentication required.' }),
  };

  await assert.rejects(() => parseApiResponse(response), (error) => {
    assert.equal(error.message, 'Authentication required.');
    assert.equal(error.status, 401);
    return true;
  });
});

test('normalize helpers return safe fallback values', () => {
  assert.deepEqual(normalizeArray([1, 2]), [1, 2]);
  assert.deepEqual(normalizeArray({ items: ['a'] }), ['a']);
  assert.deepEqual(normalizeArray(null), []);
  assert.deepEqual(normalizeObject({ foo: 'bar' }), { foo: 'bar' });
  assert.deepEqual(normalizeObject(null, { ok: true }), { ok: true });
});
