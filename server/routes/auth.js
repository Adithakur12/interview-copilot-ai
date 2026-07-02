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
router.post('/register', (req, res) => {
  const { name, email, password, referralCode } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hashedPassword = hashPassword(password);
  const userId = uuidv4();
  const referralCodeStr = generateReferralCode(name);

  const user = {
    id: userId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    plan: 'Free',
    streak: 1,
    xp: 120,
    level: 1,
    badges: JSON.stringify(['first_login']),
    referral_code: referralCodeStr,
    referred_by: null,
  };

  db.prepare(`INSERT INTO users (id, name, email, password, plan, streak, xp, level, badges, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    user.id, user.name, user.email, user.password, user.plan, user.streak, user.xp, user.level, user.badges, user.referral_code, user.referred_by
  );

  createNotification(userId, 'welcome', 'Welcome to Interview Copilot!', 'Start by uploading your resume or taking a mock interview.');

  // Handle referral
  if (referralCode) {
    const referrer = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(referralCode.toUpperCase());
    if (referrer) {
      db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(referrer.id, userId);
      db.prepare(`INSERT INTO referrals (id, referrer_id, referred_email, referred_id, status) VALUES (?, ?, ?, ?, ?)`).run(
        uuidv4(), referrer.id, user.email, userId, 'pending'
      );
      awardXP(referrer.id, 100, 'Referral signup bonus');
      createNotification(referrer.id, 'referral', 'Friend Joined!', `${user.name} joined using your referral link!`);
    }
  }

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
      badges: ['first_login'],
      referralCode: referralCodeStr,
    }
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Update streak
  updateStreak(user.id);

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
});

// Get profile
router.get('/profile', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const interviewCount = db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?').get(user.id).c;
  const avgScore = db.prepare('SELECT COALESCE(AVG(score), 0) as avg FROM interviews WHERE user_id = ?').get(user.id).avg;

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
    interviewCount,
    avgScore: Math.round(avgScore),
    createdAt: user.created_at,
  });
});

// Update profile
router.put('/profile', authenticate, (req, res) => {
  const { name } = req.body;
  const db = getDb();

  const updates = {};
  if (name) updates.name = name.trim();
  updates.updated_at = new Date().toISOString();

  const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);

  if (setClauses) {
    db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...values, req.user.id);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    xp: user.xp,
    level: user.level,
    streak: user.streak,
  });
});

// Request password reset
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email.' });
  }

  // In production, send email with reset token
  // For now, just acknowledge
  res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
});

// Get referral info
router.get('/referral', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const referrals = db.prepare(`
    SELECT r.*, u.name as referred_name, u.xp as referred_xp
    FROM referrals r
    LEFT JOIN users u ON r.referred_id = u.id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);

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
});

module.exports = router;
