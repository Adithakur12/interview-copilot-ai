const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/dashboard', (req, res) => {
  const db = getDb();

  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalInterviews = db.prepare('SELECT COUNT(*) as c FROM interviews').get().c;
  const totalResumes = db.prepare('SELECT COUNT(*) as c FROM resumes').get().c;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = ?').get('completed').total;
  const premiumUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan IN ('Pro', 'Elite')").get().c;
  const freeUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'Free'").get().c;
  const activeToday = db.prepare("SELECT COUNT(*) as c FROM users WHERE date(last_active) = date('now')").get().c;
  const avgScore = db.prepare('SELECT COALESCE(AVG(score), 0) as avg FROM interviews').get().avg;
  const dsaCount = db.prepare("SELECT COUNT(*) as c FROM interviews WHERE type = 'dsa'").get().c;

  // Users per plan
  const proUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'Pro'").get().c;
  const eliteUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'Elite'").get().c;

  // Recent registrations
  const recentUsers = db.prepare('SELECT id, name, email, plan, xp, level, streak, created_at FROM users ORDER BY created_at DESC LIMIT 10').all();

  // Revenue by month (last 6)
  const revenueByMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as revenue
    FROM payments WHERE status = 'completed' AND created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month DESC
  `).all();

  // Interviews per day (last 7)
  const interviewsByDay = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM interviews WHERE created_at >= date('now', '-7 days')
    GROUP BY day ORDER BY day DESC
  `).all();

  res.json({
    stats: {
      totalUsers,
      totalInterviews,
      totalResumes,
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      premiumUsers,
      freeUsers,
      proUsers,
      eliteUsers,
      activeToday,
      avgScore: Math.round(avgScore),
      dsaCount,
    },
    recentUsers,
    revenueByMonth,
    interviewsByDay,
  });
});

// Get all users (paginated)
router.get('/users', (req, res) => {
  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  let query = 'SELECT id, name, email, plan, xp, level, streak, created_at, last_active FROM users';
  let countQuery = 'SELECT COUNT(*) as c FROM users';
  const params = [];

  if (search) {
    query += ' WHERE name LIKE ? OR email LIKE ?';
    countQuery += ' WHERE name LIKE ? OR email LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

  const users = db.prepare(query).all(...params, limit, offset);
  const total = db.prepare(countQuery).get(...(search ? [`%${search}%`, `%${search}%`] : [])).c;

  // Add interview counts
  const usersWithCounts = users.map(u => {
    const interviewCount = db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?').get(u.id).c;
    return { ...u, interviewCount };
  });

  res.json({
    users: usersWithCounts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// Get single user details
router.get('/users/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const interviews = db.prepare('SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  const payments = db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id);
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(req.params.id);

  res.json({
    user: {
      ...user,
      badges: JSON.parse(user.badges || '[]'),
    },
    interviews,
    payments,
    notifications,
  });
});

// Update user
router.put('/users/:id', (req, res) => {
  const db = getDb();
  const { name, plan, xp } = req.body;

  const updates = {};
  if (name) updates.name = name.trim();
  if (plan) updates.plan = plan;
  if (xp !== undefined) updates.xp = parseInt(xp);
  updates.updated_at = new Date().toISOString();

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  if (setClauses) {
    db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  // Log to admin logs
  db.prepare(`INSERT INTO admin_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)`).run(
    uuidv4(), req.adminUser.id, 'update_user', JSON.stringify({ userId: req.params.id, updates })
  );

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json({ user });
});

// Delete user
router.delete('/users/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('DELETE FROM interviews WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM resumes WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM payments WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM challenge_completions WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM referrals WHERE referrer_id = ? OR referred_id = ?').run(req.params.id, req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

  db.prepare(`INSERT INTO admin_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)`).run(
    uuidv4(), req.adminUser.id, 'delete_user', JSON.stringify({ userId: req.params.id, email: user.email })
  );

  res.json({ success: true });
});

// Question bank management
router.get('/questions', (req, res) => {
  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const company = req.query.company || '';
  const category = req.query.category || '';

  let query = 'SELECT * FROM question_bank WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as c FROM question_bank WHERE 1=1';
  const params = [];

  if (company) { query += ' AND company = ?'; countQuery += ' AND company = ?'; params.push(company); }
  if (category) { query += ' AND category = ?'; countQuery += ' AND category = ?'; params.push(category); }

  const total = db.prepare(countQuery).get(...params).c;
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const questions = db.prepare(query).all(...params, limit, offset);

  res.json({
    questions: questions.map(q => ({
      ...q,
      hints: JSON.parse(q.hints || '[]'),
      tags: JSON.parse(q.tags || '[]'),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// Add question
router.post('/questions', (req, res) => {
  const db = getDb();
  const { company, category, difficulty, question, expectedAnswer, hints, tags } = req.body;
  if (!company || !question) return res.status(400).json({ error: 'Company and question are required.' });

  db.prepare(`INSERT INTO question_bank (id, company, category, difficulty, question, expected_answer, hints, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), company, category || 'behavioral', difficulty || 'medium', question, expectedAnswer || '',
    JSON.stringify(hints || []), JSON.stringify(tags || [])
  );

  res.json({ success: true });
});

// Update question
router.put('/questions/:id', (req, res) => {
  const db = getDb();
  const { company, category, difficulty, question, expectedAnswer, hints, tags } = req.body;

  const updates = {};
  if (company) updates.company = company;
  if (category) updates.category = category;
  if (difficulty) updates.difficulty = difficulty;
  if (question) updates.question = question;
  if (expectedAnswer !== undefined) updates.expected_answer = expectedAnswer;
  if (hints) updates.hints = JSON.stringify(hints);
  if (tags) updates.tags = JSON.stringify(tags);

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  if (setClauses) {
    db.prepare(`UPDATE question_bank SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  res.json({ success: true });
});

// Delete question
router.delete('/questions/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM question_bank WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Manage daily tips
router.get('/tips', (req, res) => {
  const db = getDb();
  const tips = db.prepare('SELECT * FROM daily_tips ORDER BY created_at DESC').all();
  res.json(tips);
});

router.post('/tips', (req, res) => {
  const db = getDb();
  const { content, category } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required.' });
  db.prepare(`INSERT INTO daily_tips (id, content, category) VALUES (?, ?, ?)`).run(
    uuidv4(), content, category || 'general'
  );
  res.json({ success: true });
});

router.delete('/tips/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM daily_tips WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin logs
router.get('/logs', (req, res) => {
  const db = getDb();
  const logs = db.prepare(`
    SELECT al.*, u.name as admin_name
    FROM admin_logs al
    LEFT JOIN users u ON al.admin_id = u.id
    ORDER BY al.created_at DESC LIMIT 50
  `).all();
  res.json(logs);
});

// All interviews
router.get('/interviews', (req, res) => {
  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as c FROM interviews').get().c;
  const interviews = db.prepare(`
    SELECT i.*, u.name as user_name, u.email as user_email
    FROM interviews i
    LEFT JOIN users u ON i.user_id = u.id
    ORDER BY i.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    interviews,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// Revenue report
router.get('/revenue', (req, res) => {
  const db = getDb();

  const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'").get().total;
  const totalPayments = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'completed'").get().c;

  const byPlan = db.prepare(`
    SELECT plan, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM payments WHERE status = 'completed'
    GROUP BY plan
  `).all();

  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue
    FROM payments WHERE status = 'completed' AND created_at >= date('now', '-12 months')
    GROUP BY month ORDER BY month DESC
  `).all();

  res.json({
    totalRevenue: totalRevenue / 100,
    totalPayments,
    byPlan: byPlan.map(p => ({ ...p, total: p.total / 100 })),
    byMonth: byMonth.map(m => ({ ...m, revenue: m.revenue / 100 })),
  });
});

module.exports = router;
