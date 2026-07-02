const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDbClient } = require('../db/database');

const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const db = getDbClient();

    const totalUsers = await db.get('SELECT COUNT(*) as c FROM users');
    const totalInterviews = await db.get('SELECT COUNT(*) as c FROM interviews');
    const totalResumes = await db.get('SELECT COUNT(*) as c FROM resumes');
    const totalRevenue = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = ?", ['completed']);
    const premiumUsers = await db.get("SELECT COUNT(*) as c FROM users WHERE plan IN ('Pro', 'Elite')");
    const freeUsers = await db.get("SELECT COUNT(*) as c FROM users WHERE plan = 'Free'");
    const activeToday = await db.get("SELECT COUNT(*) as c FROM users WHERE date(last_active) = date('now')");
    const avgScore = await db.get('SELECT COALESCE(AVG(score), 0) as avg FROM interviews');
    const dsaCount = await db.get("SELECT COUNT(*) as c FROM interviews WHERE type = 'dsa'");
    const proUsers = await db.get("SELECT COUNT(*) as c FROM users WHERE plan = 'Pro'");
    const eliteUsers = await db.get("SELECT COUNT(*) as c FROM users WHERE plan = 'Elite'");

    const recentUsers = await db.all('SELECT id, name, email, plan, xp, level, streak, created_at FROM users ORDER BY created_at DESC LIMIT 10');

    const revenueByMonth = await db.all(`
      SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as revenue
      FROM payments WHERE status = 'completed' AND created_at >= date('now', '-6 months')
      GROUP BY month ORDER BY month DESC
    `);

    const interviewsByDay = await db.all(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM interviews WHERE created_at >= date('now', '-7 days')
      GROUP BY day ORDER BY day DESC
    `);

    res.json({
      stats: {
        totalUsers: totalUsers.c,
        totalInterviews: totalInterviews.c,
        totalResumes: totalResumes.c,
        totalRevenue: (totalRevenue.total || 0) / 100,
        premiumUsers: premiumUsers.c,
        freeUsers: freeUsers.c,
        proUsers: proUsers.c,
        eliteUsers: eliteUsers.c,
        activeToday: activeToday.c,
        avgScore: Math.round(avgScore.avg),
        dsaCount: dsaCount.c,
      },
      recentUsers,
      revenueByMonth,
      interviewsByDay,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get all users (paginated)
router.get('/users', async (req, res) => {
  try {
    const db = getDbClient();
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
    const users = await db.all(query, [...params, limit, offset]);
    const total = await db.get(countQuery, search ? [`%${search}%`, `%${search}%`] : []);

    const usersWithCounts = await Promise.all(users.map(async (u) => {
      const interviewCount = await db.get('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?', [u.id]);
      return { ...u, interviewCount: interviewCount.c };
    }));

    res.json({
      users: usersWithCounts,
      total: total.c,
      page,
      totalPages: Math.ceil(total.c / limit),
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get single user details
router.get('/users/:id', async (req, res) => {
  try {
    const db = getDbClient();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const interviews = await db.all('SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.id]);
    const payments = await db.all('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC', [req.params.id]);
    const notifications = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]);

    res.json({
      user: {
        ...user,
        badges: JSON.parse(user.badges || '[]'),
      },
      interviews,
      payments,
      notifications,
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const db = getDbClient();
    const { name, plan, xp } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (plan) updates.plan = plan;
    if (xp !== undefined) updates.xp = parseInt(xp);
    updates.updated_at = new Date().toISOString();

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    if (setClauses) {
      await db.run(`UPDATE users SET ${setClauses} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    }

    await db.run('INSERT INTO admin_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)',
      [uuidv4(), req.adminUser.id, 'update_user', JSON.stringify({ userId: req.params.id, updates })]);

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ user });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const db = getDbClient();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await db.run('DELETE FROM interviews WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM resumes WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM payments WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM notifications WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM challenge_completions WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM referrals WHERE referrer_id = ? OR referred_id = ?', [req.params.id, req.params.id]);
    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);

    await db.run('INSERT INTO admin_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)',
      [uuidv4(), req.adminUser.id, 'delete_user', JSON.stringify({ userId: req.params.id, email: user.email })]);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Question bank management
router.get('/questions', async (req, res) => {
  try {
    const db = getDbClient();
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

    const total = await db.get(countQuery, params);
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const questions = await db.all(query, [...params, limit, offset]);

    res.json({
      questions: questions.map(q => ({
        ...q,
        hints: JSON.parse(q.hints || '[]'),
        tags: JSON.parse(q.tags || '[]'),
      })),
      total: total.c,
      page,
      totalPages: Math.ceil(total.c / limit),
    });
  } catch (err) {
    console.error('Admin questions error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Add question
router.post('/questions', async (req, res) => {
  try {
    const db = getDbClient();
    const { company, category, difficulty, question, expectedAnswer, hints, tags } = req.body;
    if (!company || !question) return res.status(400).json({ error: 'Company and question are required.' });

    await db.run('INSERT INTO question_bank (id, company, category, difficulty, question, expected_answer, hints, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), company, category || 'behavioral', difficulty || 'medium', question, expectedAnswer || '',
        JSON.stringify(hints || []), JSON.stringify(tags || [])]);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin add question error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update question
router.put('/questions/:id', async (req, res) => {
  try {
    const db = getDbClient();
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
      await db.run(`UPDATE question_bank SET ${setClauses} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Admin update question error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete question
router.delete('/questions/:id', async (req, res) => {
  try {
    const db = getDbClient();
    await db.run('DELETE FROM question_bank WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete question error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Manage daily tips
router.get('/tips', async (req, res) => {
  try {
    const db = getDbClient();
    const tips = await db.all('SELECT * FROM daily_tips ORDER BY created_at DESC');
    res.json(tips);
  } catch (err) {
    console.error('Admin tips error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/tips', async (req, res) => {
  try {
    const db = getDbClient();
    const { content, category } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required.' });
    await db.run('INSERT INTO daily_tips (id, content, category) VALUES (?, ?, ?)',
      [uuidv4(), content, category || 'general']);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin add tip error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/tips/:id', async (req, res) => {
  try {
    const db = getDbClient();
    await db.run('DELETE FROM daily_tips WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete tip error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Admin logs
router.get('/logs', async (req, res) => {
  try {
    const db = getDbClient();
    const logs = await db.all(`
      SELECT al.*, u.name as admin_name
      FROM admin_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC LIMIT 50
    `);
    res.json(logs);
  } catch (err) {
    console.error('Admin logs error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// All interviews
router.get('/interviews', async (req, res) => {
  try {
    const db = getDbClient();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const total = await db.get('SELECT COUNT(*) as c FROM interviews');
    const interviews = await db.all(`
      SELECT i.*, u.name as user_name, u.email as user_email
      FROM interviews i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY i.created_at DESC LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({
      interviews,
      total: total.c,
      page,
      totalPages: Math.ceil(total.c / limit),
    });
  } catch (err) {
    console.error('Admin interviews error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Revenue report
router.get('/revenue', async (req, res) => {
  try {
    const db = getDbClient();

    const totalRevenue = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'");
    const totalPayments = await db.get("SELECT COUNT(*) as c FROM payments WHERE status = 'completed'");

    const byPlan = await db.all(`
      SELECT plan, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments WHERE status = 'completed'
      GROUP BY plan
    `);

    const byMonth = await db.all(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue
      FROM payments WHERE status = 'completed' AND created_at >= date('now', '-12 months')
      GROUP BY month ORDER BY month DESC
    `);

    res.json({
      totalRevenue: (totalRevenue.total || 0) / 100,
      totalPayments: totalPayments.c,
      byPlan: byPlan.map(p => ({ ...p, total: (p.total || 0) / 100 })),
      byMonth: byMonth.map(m => ({ ...m, revenue: (m.revenue || 0) / 100 })),
    });
  } catch (err) {
    console.error('Admin revenue error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
