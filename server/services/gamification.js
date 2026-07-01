const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const XP_THRESHOLDS = {
  INTERVIEW_COMPLETE: 50,
  HIGH_SCORE_BONUS: 30,
  DAILY_CHALLENGE: 40,
  REFERRAL_SIGNUP: 100,
  REFERRAL_COMPLETE: 200,
  PROFILE_COMPLETE: 25,
  STREAK_BONUS: 20,
  PERFECT_SCORE: 100,
};

const LEVEL_XP = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800,
  4700, 5700, 6800, 8000, 9300, 10700, 12200, 13800, 15500, 17500
];

const BADGE_DEFINITIONS = [
  { id: 'first_login', name: 'First Login', description: 'Signed up for the first time', xp: 10 },
  { id: 'first_interview', name: 'First Interview', description: 'Completed your first mock interview', xp: 30 },
  { id: 'streak_3', name: '3-Day Streak', description: 'Logged in for 3 consecutive days', xp: 50 },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day login streak', xp: 100 },
  { id: 'streak_30', name: 'Monthly Master', description: '30-day login streak', xp: 500 },
  { id: 'score_80', name: '80 Club', description: 'Scored 80+ on an interview', xp: 60 },
  { id: 'score_90', name: 'Elite Performer', description: 'Scored 90+ on an interview', xp: 100 },
  { id: 'perfect_score', name: 'Perfect Score', description: 'Scored 100 on an interview', xp: 200 },
  { id: 'interviews_5', name: 'Practice Makes Progress', description: 'Completed 5 interviews', xp: 80 },
  { id: 'interviews_10', name: 'Interview Veteran', description: 'Completed 10 interviews', xp: 150 },
  { id: 'interviews_25', name: 'Interview Legend', description: 'Completed 25 interviews', xp: 500 },
  { id: 'challenge_7', name: 'Challenge Seeker', description: 'Completed 7 daily challenges', xp: 100 },
  { id: 'challenge_30', name: 'Challenge Champion', description: 'Completed 30 daily challenges', xp: 500 },
  { id: 'referral_3', name: 'Community Builder', description: 'Referred 3 friends', xp: 200 },
  { id: 'referral_10', name: 'Growth Hacker', description: 'Referred 10 friends', xp: 1000 },
  { id: 'premium_upgrade', name: 'Premium Plan', description: 'Upgraded to a paid plan', xp: 100 },
  { id: 'elite_upgrade', name: 'Elite Member', description: 'Upgraded to Elite plan', xp: 250 },
  { id: 'profile_complete', name: 'Profile Pro', description: 'Completed your profile', xp: 25 },
  { id: 'dsa_master', name: 'DSA Master', description: 'Completed 10 DSA problems', xp: 300 },
  { id: 'all_companies', name: 'Company Explorer', description: 'Practiced for 5 different companies', xp: 200 },
];

function calculateLevel(xp) {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) return i + 1;
  }
  return 1;
}

function awardXP(userId, amount, reason, { checkBadges = true } = {}) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const newXp = user.xp + amount;
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > user.level;

  db.prepare('UPDATE users SET xp = ?, level = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newXp, newLevel, userId);

  const result = { xp: newXp, level: newLevel, leveledUp, amount, reason };

  if (checkBadges) {
    const badges = JSON.parse(user.badges || '[]');
    const newBadges = checkAndAwardBadges(userId, badges, user);
    if (newBadges.length > 0) {
      result.badges = newBadges;
    }
  }

  createNotification(userId, 'xp', 'XP Earned', `You earned ${amount} XP: ${reason}`);

  return result;
}

function checkAndAwardBadges(userId, currentBadges, user) {
  const db = getDb();
  const newBadges = [];
  const badgeIds = currentBadges.map(b => typeof b === 'string' ? b : b.id);

  const checks = [
    { id: 'first_interview', condition: () => db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?').get(userId).c >= 1 },
    { id: 'score_80', condition: () => db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ? AND score >= 80').get(userId).c >= 1 },
    { id: 'score_90', condition: () => db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ? AND score >= 90').get(userId).c >= 1 },
    { id: 'perfect_score', condition: () => db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ? AND score >= 100').get(userId).c >= 1 },
    { id: 'interviews_5', condition: () => db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?').get(userId).c >= 5 },
    { id: 'interviews_10', condition: () => db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?').get(userId).c >= 10 },
    { id: 'interviews_25', condition: () => db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?').get(userId).c >= 25 },
    { id: 'challenge_7', condition: () => db.prepare('SELECT COUNT(*) as c FROM challenge_completions WHERE user_id = ? AND completed = 1').get(userId).c >= 7 },
    { id: 'challenge_30', condition: () => db.prepare('SELECT COUNT(*) as c FROM challenge_completions WHERE user_id = ? AND completed = 1').get(userId).c >= 30 },
    { id: 'referral_3', condition: () => db.prepare('SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ? AND status = \'completed\'').get(userId).c >= 3 },
    { id: 'referral_10', condition: () => db.prepare('SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ? AND status = \'completed\'').get(userId).c >= 10 },
    { id: 'premium_upgrade', condition: () => user.plan === 'Pro' || user.plan === 'Elite' },
    { id: 'elite_upgrade', condition: () => user.plan === 'Elite' },
  ];

  for (const check of checks) {
    if (!badgeIds.includes(check.id) && check.condition()) {
      const badge = BADGE_DEFINITIONS.find(b => b.id === check.id);
      if (badge) {
        newBadges.push(badge);
        awardXP(userId, badge.xp, `Badge earned: ${badge.name}`, { checkBadges: false });
      }
    }
  }

  if (newBadges.length > 0) {
    const allBadges = [...currentBadges, ...newBadges.map(b => b.id)];
    db.prepare('UPDATE users SET badges = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(allBadges), userId);
  }

  return newBadges;
}

function updateStreak(userId) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  const lastActive = user.last_active ? user.last_active.split('T')[0] : null;

  if (lastActive === today) {
    return user.streak; // Already counted today
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let newStreak = lastActive === yesterday ? user.streak + 1 : 1;

  db.prepare('UPDATE users SET streak = ?, last_active = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').run(newStreak, userId);

  // Award streak bonuses
  if (newStreak === 3) {
    awardXP(userId, 50, '3-day streak bonus');
    createNotification(userId, 'achievement', '3-Day Streak!', 'You\'ve logged in for 3 days in a row. Keep it up!');
  } else if (newStreak === 7) {
    awardXP(userId, 100, '7-day streak bonus');
    createNotification(userId, 'achievement', 'Week Warrior!', '7-day streak! You\'re on fire!');
  } else if (newStreak === 30) {
    awardXP(userId, 500, '30-day streak bonus');
    createNotification(userId, 'achievement', 'Monthly Master!', '30-day streak! You\'re a true champion!');
  } else if (newStreak % 10 === 0) {
    awardXP(userId, 50, `${newStreak}-day streak milestone`);
  }

  return newStreak;
}

function createNotification(userId, type, title, message) {
  const db = getDb();
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
    uuidv4(), userId, type, title, message
  );
}

function getLeaderboard(limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT id, name, email, plan, xp, level, streak, badges,
      (SELECT COUNT(*) FROM interviews WHERE user_id = users.id) as interview_count,
      (SELECT COALESCE(AVG(score), 0) FROM interviews WHERE user_id = users.id) as avg_score
    FROM users
    ORDER BY xp DESC
    LIMIT ?
  `).all(limit);
}

function getUserStats(userId) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const interviewCount = db.prepare('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?').get(userId).c;
  const avgScore = db.prepare('SELECT COALESCE(AVG(score), 0) as avg FROM interviews WHERE user_id = ?').get(userId).avg;
  const challengesDone = db.prepare('SELECT COUNT(*) as c FROM challenge_completions WHERE user_id = ? AND completed = 1').get(userId).c;
  const referralCount = db.prepare('SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?').get(userId).c;
  const rank = db.prepare('SELECT COUNT(*) as c FROM users WHERE xp > ?').get(user.xp).c + 1;

  return {
    ...user,
    badges: JSON.parse(user.badges || '[]'),
    interviewCount,
    avgScore: Math.round(avgScore),
    challengesDone,
    referralCount,
    rank,
    nextLevelXp: LEVEL_XP[user.level] || LEVEL_XP[LEVEL_XP.length - 1],
    xpToNextLevel: (LEVEL_XP[user.level] || LEVEL_XP[LEVEL_XP.length - 1]) - user.xp,
  };
}

module.exports = {
  awardXP,
  updateStreak,
  createNotification,
  getLeaderboard,
  getUserStats,
  checkAndAwardBadges,
  calculateLevel,
  BADGE_DEFINITIONS,
  XP_THRESHOLDS,
};
