const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDbClient } = require('../db/database');
const { generateToken, authenticate } = require('../middleware/auth');
const { awardXP, updateStreak, createNotification } = require('../services/gamification');

const router = express.Router();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateReferralCode(name) {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, referralCode } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const db = getDbClient();
    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = hashPassword(password);
    const userId = uuidv4();
    const referralCodeStr = generateReferralCode(name);

    await db.run(
      `INSERT INTO users (id, name, email, password, plan, streak, xp, level, badges, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name.trim(), email.toLowerCase().trim(), hashedPassword, 'Free', 1, 120, 1, JSON.stringify(['first_login']), referralCodeStr, null]
    );

    await createNotification(userId, 'welcome', 'Welcome to Interview Copilot!', 'Start by uploading your resume or taking a mock interview.');

    // Handle referral
    if (referralCode) {
      const referrer = await db.get('SELECT * FROM users WHERE referral_code = ?', [referralCode.toUpperCase()]);
      if (referrer) {
        await db.run('UPDATE users SET referred_by = ? WHERE id = ?', [referrer.id, userId]);
        await db.run('INSERT INTO referrals (id, referrer_id, referred_email, referred_id, status) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), referrer.id, email.toLowerCase().trim(), userId, 'pending']);
        await awardXP(referrer.id, 100, 'Referral signup bonus');
        await createNotification(referrer.id, 'referral', 'Friend Joined!', `${name.trim()} joined using your referral link!`);
      }
    }

    const token = generateToken({ id: userId, email: email.toLowerCase().trim(), name: name.trim(), plan: 'Free' });
    res.json({
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        plan: 'Free',
        xp: 120,
        level: 1,
        streak: 1,
        badges: ['first_login'],
        referralCode: referralCodeStr,
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const db = getDbClient();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await updateStreak(user.id);

    const token = generateToken({ id: user.id, email: user.email, name: user.name, plan: user.plan });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        badges: JSON.parse(user.badges || '[]'),
        referralCode: user.referral_code,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const interviewCount = await db.get('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?', [user.id]);
    const avgScore = await db.get('SELECT COALESCE(AVG(score), 0) as avg FROM interviews WHERE user_id = ?', [user.id]);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      badges: JSON.parse(user.badges || '[]'),
      referralCode: user.referral_code,
      interviewCount: interviewCount.c,
      avgScore: Math.round(avgScore.avg),
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  const { name } = req.body;
  try {
    const db = getDbClient();
    const updates = {};
    if (name) updates.name = name.trim();
    updates.updated_at = new Date().toISOString();

    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    if (setClauses) {
      await db.run(`UPDATE users SET ${setClauses} WHERE id = ?`, [...values, req.user.id]);
    }

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const db = getDbClient();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }
    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get referral info
router.get('/referral', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    const referrals = await db.all(
      `SELECT r.*, u.name as referred_name, u.xp as referred_xp
      FROM referrals r
      LEFT JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    const referralCount = referrals.length;
    const completedCount = referrals.filter(r => r.status === 'completed').length;

    res.json({
      referralCode: user.referral_code,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?ref=${user.referral_code}`,
      referralCount,
      completedCount,
      xpEarned: completedCount * 200,
      referrals,
    });
  } catch (err) {
    console.error('Referral error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
