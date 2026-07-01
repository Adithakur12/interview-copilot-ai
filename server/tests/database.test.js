const test = require('node:test');
const assert = require('node:assert/strict');
const { translateSqlForPostgres } = require('../db/database');

test('translateSqlForPostgres rewrites SQLite syntax for PostgreSQL', () => {
  const sql = "SELECT strftime('%Y-%m', created_at) as month, datetime('now') as now FROM users WHERE email = ? AND name = ?";
  const translated = translateSqlForPostgres(sql);

  assert.match(translated, /to_char\(created_at, 'YYYY-MM'\)/);
  assert.match(translated, /CURRENT_TIMESTAMP/);
  assert.match(translated, /\$1/);
  assert.match(translated, /\$2/);
});
