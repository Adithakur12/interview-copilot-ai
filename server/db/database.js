const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const DB_PATH = path.join(__dirname, '..', 'app.db');

let db;
let pgPool;

function translateSqlForPostgres(sql) {
  let translated = sql
    .replace(/strftime\('%Y-%m',\s*([^\)]+)\)/g, "to_char($1, 'YYYY-MM')")
    .replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP')
    .replace(/datetime\('now'\s*,\s*'([^']+)'\)/g, 'CURRENT_TIMESTAMP')
    .replace(/date\('now'\)/g, 'CURRENT_DATE');

  let index = 0;
  translated = translated.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });

  return translated;
}

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function getPgPool() {
  if (!pgPool && process.env.DATABASE_URL) {
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pgPool;
}

async function queryPg(sql, params = []) {
  const pool = getPgPool();
  if (!pool) throw new Error('PostgreSQL pool is not available');
  const translated = translateSqlForPostgres(sql);
  const result = await pool.query(translated, params);
  return result.rows;
}

function isPostgresEnabled() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres'));
}

function logEvent(level, message, details = {}) {
  const entry = {
    level,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${message}`, details);
  return entry;
}

function initializeDatabase() {
  if (isPostgresEnabled()) {
    const pool = getPgPool();
    if (pool) {
      logEvent('info', 'Using PostgreSQL database for production persistence');
      return pool;
    }
  }

  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      plan TEXT DEFAULT 'Free',
      streak INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      badges TEXT DEFAULT '[]',
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company TEXT,
      type TEXT DEFAULT 'mock',
      question TEXT,
      answer TEXT,
      score INTEGER,
      feedback TEXT,
      skills TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT,
      analysis TEXT,
      company TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS challenge_completions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      challenge_date TEXT DEFAULT (date('now')),
      skill TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stripe_session_id TEXT,
      plan TEXT,
      amount INTEGER,
      currency TEXT DEFAULT 'usd',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT DEFAULT 'info',
      title TEXT,
      message TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS question_bank (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      category TEXT DEFAULT 'behavioral',
      difficulty TEXT DEFAULT 'medium',
      question TEXT NOT NULL,
      expected_answer TEXT,
      hints TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_email TEXT,
      referred_id TEXT,
      status TEXT DEFAULT 'pending',
      xp_bonus INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      action TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_tips (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  return db;
}

function seedDatabase() {
  const db = getDb();

  // Seed question bank if empty
  const questionCount = db.prepare('SELECT COUNT(*) as count FROM question_bank').get().count;
  if (questionCount === 0) {
    const questions = [
      { company: 'Amazon', category: 'system_design', difficulty: 'hard', question: 'Design a scalable notification service for a high-traffic e-commerce app.', expected_answer: 'Use a message queue (SQS/Kafka), fan-out pattern, push/pull strategies, consider idempotency and retry logic.' },
      { company: 'Amazon', category: 'behavioral', difficulty: 'medium', question: 'Tell me about a time you had to make a decision with incomplete data.', expected_answer: 'Describe the situation, actions taken with available data, and outcome using STAR method.' },
      { company: 'Google', category: 'system_design', difficulty: 'hard', question: 'Design Google Docs collaboration feature at scale.', expected_answer: 'Use operational transformation or CRDTs, WebSocket for real-time sync, versioning for conflict resolution.' },
      { company: 'Google', category: 'algorithms', difficulty: 'hard', question: 'Design a search suggestion service with sub-100ms latency.', expected_answer: 'Use a trie data structure, prefix caching, precomputed suggestions, CDN for static results.' },
      { company: 'Microsoft', category: 'system_design', difficulty: 'medium', question: 'Design a secure authentication flow for a SaaS platform.', expected_answer: 'OAuth 2.0 / OpenID Connect, JWT tokens, refresh token rotation, MFA support, session management.' },
      { company: 'Adobe', category: 'system_design', difficulty: 'hard', question: 'Design a collaborative photo editing service.', expected_answer: 'WebSocket for real-time sync, layer-based state management, conflict resolution, CDN for assets.' },
      { company: 'TCS', category: 'behavioral', difficulty: 'easy', question: 'How do you handle a difficult client requirement?', expected_answer: 'Listen actively, ask clarifying questions, propose alternatives, document decisions, maintain professional relationship.' },
      { company: 'Amazon', category: 'algorithms', difficulty: 'medium', question: 'Design a rate limiter for a high-traffic API.', expected_answer: 'Token bucket or sliding window algorithm, Redis for distributed counting, per-user quotas.' },
      { company: 'Google', category: 'algorithms', difficulty: 'medium', question: 'Design a URL shortening service like TinyURL.', expected_answer: 'Base62 encoding for short URLs, hash function, collision handling, redirect with 301/302.' },
      { company: 'Amazon', category: 'leadership', difficulty: 'hard', question: 'Tell me about a time you invented and simplified a process.', expected_answer: 'Identify the complexity, propose simplification, implement change, measure improvement. Use STAR format.' },
    ];

    const insert = db.prepare(`INSERT INTO question_bank (id, company, category, difficulty, question, expected_answer, hints, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertMany = db.transaction((items) => {
      for (const q of items) {
        insert.run(
          require('uuid').v4(),
          q.company,
          q.category,
          q.difficulty,
          q.question,
          q.expected_answer,
          JSON.stringify([]),
          JSON.stringify([q.category, q.difficulty])
        );
      }
    });
    insertMany(questions);
  }

  // Seed admin user if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('admin@interviewcopilot.com');
  if (adminCount.count === 0) {
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex');
    db.prepare(`INSERT INTO users (id, name, email, password, plan, xp, level, badges, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      require('uuid').v4(),
      'Admin',
      'admin@interviewcopilot.com',
      hashedPassword,
      'Elite',
      9999,
      50,
      JSON.stringify(['Admin', 'Early Adopter', 'Premium Plan']),
      'ADMIN001'
    );
  }

  // Seed daily tips if empty
  const tipCount = db.prepare('SELECT COUNT(*) as count FROM daily_tips').get().count;
  if (tipCount === 0) {
    const tips = [
      { content: 'Use the STAR method (Situation, Task, Action, Result) for behavioral questions.', category: 'behavioral' },
      { content: 'Always explain your thought process before writing code in DSA rounds.', category: 'dsa' },
      { content: 'For system design, start with requirements, then move to high-level design, then deep dive.', category: 'system_design' },
      { content: 'Track your progress with daily challenges to build consistency.', category: 'general' },
      { content: 'Record yourself answering questions to identify filler words and pacing issues.', category: 'communication' },
      { content: 'Research the company values and align your answers with them.', category: 'preparation' },
      { content: 'Focus on impact metrics (numbers, percentages) in your resume projects.', category: 'resume' },
    ];
    const insert = db.prepare(`INSERT INTO daily_tips (id, content, category) VALUES (?, ?, ?)`);
    const insertMany = db.transaction((items) => {
      for (const t of items) {
        insert.run(require('uuid').v4(), t.content, t.category);
      }
    });
    insertMany(tips);
  }
}

module.exports = { getDb, getPgPool, initializeDatabase, seedDatabase, logEvent, isPostgresEnabled, translateSqlForPostgres };
