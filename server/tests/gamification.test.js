const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

function createTestDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      plan TEXT DEFAULT 'Free', streak INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
      badges TEXT DEFAULT '[]', referral_code TEXT UNIQUE, referred_by TEXT,
      created_at TEXT DEFAULT (datetime('now')), last_active TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE interviews (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company TEXT, type TEXT DEFAULT 'mock', question TEXT, answer TEXT, score INTEGER, feedback TEXT, skills TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE challenge_completions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, challenge_date TEXT DEFAULT (date('now')), skill TEXT, completed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE referrals (id TEXT PRIMARY KEY, referrer_id TEXT NOT NULL, referred_email TEXT, referred_id TEXT, status TEXT DEFAULT 'pending', xp_bonus INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT, type TEXT DEFAULT 'info', title TEXT, message TEXT, read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
  `);
  return db;
}

test('awardXP does not recurse infinitely when plan badges are earned', () => {
  const db = createTestDb();
  const userId = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, plan, xp, level, badges, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    userId, 'Upgrade User', 'upgrade-test@example.com', 'hash', 'Pro', 0, 1, '[]', 'UPG001'
  );

  const databaseModule = require('../db/database');
  const originalGetDb = databaseModule.getDb;
  databaseModule.getDb = () => db;

  delete require.cache[require.resolve('../services/gamification')];
  const { awardXP } = require('../services/gamification');

  assert.doesNotThrow(() => {
    const result = awardXP(userId, 100, 'Pro plan upgrade');
    assert.ok(result);
    assert.ok(result.xp >= 100);
    const user = db.prepare('SELECT badges FROM users WHERE id = ?').get(userId);
    const badges = JSON.parse(user.badges || '[]');
    assert.ok(badges.includes('premium_upgrade'));
  });

  databaseModule.getDb = originalGetDb;
  delete require.cache[require.resolve('../services/gamification')];
});
