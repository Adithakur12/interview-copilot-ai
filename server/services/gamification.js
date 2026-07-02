const { v4: uuidv4 } = require('uuid');
const { getDbClient } = require('../db/database');

async function awardXP(userId, amount, reason) {
  const db = getDbClient();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  const newXp = (user.xp || 0) + amount;
  const newLevel = Math.floor(newXp / 500) + 1;
  const badges = JSON.parse(user.badges || '[]');
  const newBadges = [...badges];

  if (newLevel > user.level && !badges.includes(`level_${newLevel}`)) {
    newBadges.push(`level_${newLevel}`);
  }

  await db.run(
    'UPDATE users SET xp = ?, level = ?, badges = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [newXp, newLevel, JSON.stringify(newBadges), userId]
  );

  if (amount >= 100) {
    await createNotification(userId, 'xp', `+${amount} XP`, reason || 'Achievement unlocked!');
  }

  return { xp: newXp, level: newLevel, xpAwarded: amount, reason };
}

async function updateStreak(userId) {
  const db = getDbClient();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  const lastActive = user.last_active ? user.last_active.split('T')[0] : null;

  let newStreak = user.streak || 0;
  if (lastActive !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    newStreak = lastActive === yesterday ? (user.streak || 0) + 1 : 1;
  }

  const badges = JSON.parse(user.badges || '[]');
  const newBadges = [...badges];
  if (newStreak >= 7 && !badges.includes('streak_7')) newBadges.push('streak_7');
  if (newStreak >= 30 && !badges.includes('streak_30')) newBadges.push('streak_30');

  await db.run(
    'UPDATE users SET streak = ?, last_active = datetime(\'now\'), badges = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [newStreak, JSON.stringify(newBadges), userId]
  );

  if (newStreak % 7 === 0 && newStreak > 0) {
    const bonus = newStreak * 5;
    await awardXP(userId, bonus, `${newStreak}-day streak bonus`);
    await createNotification(userId, 'achievement', `${newStreak}-Day Streak!`, `You earned ${bonus} XP for your streak!`);
  }

  return { streak: newStreak, badges: newBadges };
}

async function createNotification(userId, type, title, message) {
  const db = getDbClient();
  await db.run(
    'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), userId, type || 'info', title || '', message || '']
  );
}

module.exports = { awardXP, updateStreak, createNotification };
