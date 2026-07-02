const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDbClient } = require('../db/database');

const { authenticate } = require('../middleware/auth');
const { awardXP } = require('../services/gamification');
const {
  buildCareerCoachReport,
  buildResumeJobMatch,
  buildDailyChallenge,
  analyzeSpeechForCoaching,
  buildAssistantReply,
  buildCoachGuidance,
} = require('../interviewLogic');
const { callGemini, callGeminiChat, parseGeminiJson, isGeminiEnabled } = require('../utils/gemini');
const { buildReadinessDashboard } = require('../features/productLogic');

const router = express.Router();

function mapChatHistory(history = []) {
  return history
    .slice(-10)
    .filter((item) => item?.text)
    .map((item) => ({
      role: item.sender === 'user' ? 'user' : 'model',
      text: item.text,
    }));
}

function buildInterviewCoachReply(message, context = {}) {
  return buildAssistantReply(message, context);
}

function buildDsaCoachReply(message, question = '') {
  const lower = `${message} ${question}`.toLowerCase();
  if (lower.includes('hint')) {
    return 'Break the problem into smaller steps, solve a tiny example first, then generalize the pattern.';
  }
  if (lower.includes('complexity') || lower.includes('time') || lower.includes('space')) {
    return 'State brute-force complexity first, then explain the optimized approach and why it is better.';
  }
  if (lower.includes('edge')) {
    return 'Check empty input, single element, duplicates, negatives, overflow, and sorted vs unsorted cases.';
  }
  return 'Explain your approach first, mention the data structure, then analyze time and space complexity before coding.';
}

// Readiness dashboard
router.get('/readiness', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    const history = await db.all('SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    const { analysis = {}, profile = {}, company = 'Amazon', role = 'Software Engineer' } = req.query;
    let parsedAnalysis = {};
    let parsedProfile = {};
    try { parsedAnalysis = JSON.parse(analysis); } catch { parsedAnalysis = {}; }
    try { parsedProfile = JSON.parse(profile); } catch { parsedProfile = {}; }
    res.json(buildReadinessDashboard({
      analysis: parsedAnalysis,
      interviewHistory: history,
      profile: parsedProfile,
      company: company || 'Amazon',
      role: role || 'Software Engineer'
    }));
  } catch (err) {
    console.error('Readiness error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/readiness', authenticate, async (req, res) => {
  const { analysis = {}, interviewHistory = [], profile = {}, company = 'Amazon', role = 'Software Engineer' } = req.body;
  res.json(buildReadinessDashboard({ analysis, interviewHistory, profile, company, role }));
});

// Real-time interview coach chatbot
router.post('/chat', authenticate, async (req, res) => {
  const { message = '', history = [], context = {} } = req.body;
  if (!message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const fallbackReply = buildInterviewCoachReply(message, context);
  if (!isGeminiEnabled()) {
    return res.json({ reply: fallbackReply, mode: 'fallback' });
  }

  const company = context.company || 'Amazon';
  const skills = (context.analysis?.skills || []).join(', ') || 'general software engineering';
  const resumeSnippet = (context.resumeText || '').slice(0, 600);
  const systemPrompt = `You are Interview Copilot, an expert real-time interview coach.
Answer clearly in 2-4 short paragraphs or bullet points.
Focus on practical help for ${company} interviews.
Use STAR for behavioral answers, trade-offs for system design, and structure for technical answers.
Never say you are an AI model.`;

  const messages = [
    {
      role: 'user',
      text: `Candidate context:\nCompany: ${company}\nSkills: ${skills}\nResume excerpt: ${resumeSnippet || 'Not provided'}`,
    },
    { role: 'model', text: 'I understand the candidate context and will coach them in real time.' },
    ...mapChatHistory(history),
    { role: 'user', text: message.trim() },
  ];

  const reply = await callGeminiChat(systemPrompt, messages);
  res.json({ reply: reply || fallbackReply, mode: reply ? 'ai' : 'fallback' });
});

// Real-time DSA coach chatbot
router.post('/dsa-chat', authenticate, async (req, res) => {
  const { message = '', history = [], question = '', answer = '' } = req.body;
  if (!message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const fallbackReply = buildDsaCoachReply(message, question);
  if (!isGeminiEnabled()) {
    return res.json({ reply: fallbackReply, mode: 'fallback' });
  }

  const systemPrompt = `You are a DSA interview coach helping in real time.
Give hints, not full solutions unless the student asks for approach review.
Keep answers concise and interview-focused.
Mention time/space complexity when relevant.`;

  const messages = [
    {
      role: 'user',
      text: `Current problem: ${question || 'Not provided'}\nStudent draft answer: ${answer || 'Not provided yet'}`,
    },
    { role: 'model', text: 'I will coach the student on this DSA problem.' },
    ...mapChatHistory(history),
    { role: 'user', text: message.trim() },
  ];

  const reply = await callGeminiChat(systemPrompt, messages);
  res.json({ reply: reply || fallbackReply, mode: reply ? 'ai' : 'fallback' });
});

// Career coach report
router.post('/report', authenticate, async (req, res) => {
  const { analysis = {}, interviewHistory = [] } = req.body;
  const coachReport = buildCareerCoachReport(analysis, interviewHistory);

  if (!isGeminiEnabled()) {
    return res.json({ ...coachReport, mode: 'fallback' });
  }

  const prompt = `You are a career coach for software engineers.
Analyze this candidate profile and return JSON only:
{ "readiness": number, "strengths": string[], "weakAreas": string[], "focusAreas": string[], "roadmap": string[], "summary": string }

Skills: ${(analysis.skills || []).join(', ')}
Interview history count: ${interviewHistory.length}
Average score: ${interviewHistory.length ? Math.round(interviewHistory.reduce((sum, item) => sum + (item.overallScore || item.score || 0), 0) / interviewHistory.length) : 0}`;

  const aiReport = parseGeminiJson(await callGemini(prompt));
  if (aiReport) {
    return res.json({
      ...coachReport,
      ...aiReport,
      strengths: aiReport.strengths?.length ? aiReport.strengths : coachReport.strengths,
      weakAreas: aiReport.weakAreas?.length ? aiReport.weakAreas : coachReport.weakAreas,
      focusAreas: aiReport.focusAreas?.length ? aiReport.focusAreas : coachReport.focusAreas,
      roadmap: aiReport.roadmap?.length ? aiReport.roadmap : coachReport.roadmap,
      mode: 'ai',
    });
  }

  res.json({ ...coachReport, mode: 'fallback' });
});

// Resume-to-role match
router.post('/job-match', authenticate, (req, res) => {
  const { resumeText = '', role = '' } = req.body;
  res.json(buildResumeJobMatch(resumeText, role));
});

// Daily challenge
router.post('/daily-challenge', authenticate, (req, res) => {
  const { skill = 'General' } = req.body;
  res.json(buildDailyChallenge(skill));
});

// Complete daily challenge
router.post('/daily-challenge/complete', authenticate, async (req, res) => {
  const { skill = 'General' } = req.body;
  try {
    const db = getDbClient();
    const today = new Date().toISOString().split('T')[0];
    const existing = await db.get('SELECT * FROM challenge_completions WHERE user_id = ? AND challenge_date = ?', [req.user.id, today]);
    if (!existing) {
      await db.run('INSERT INTO challenge_completions (id, user_id, challenge_date, skill, completed) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), req.user.id, today, skill, 1]);
      await awardXP(req.user.id, 40, 'Daily challenge completed');
      res.json({ success: true, xpAwarded: 40 });
    } else {
      res.json({ success: true, message: 'Challenge already completed today.' });
    }
  } catch (err) {
    console.error('Daily challenge complete error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Speech coaching
router.post('/speech-coaching', authenticate, (req, res) => {
  const { answer = '' } = req.body;
  res.json(analyzeSpeechForCoaching(answer));
});

// AI assistant reply (single-shot, kept for compatibility)
router.post('/assistant-reply', authenticate, async (req, res) => {
  const { query = '', context = {} } = req.body;
  const fallbackReply = buildInterviewCoachReply(query, context);

  if (!isGeminiEnabled()) {
    return res.json({ reply: fallbackReply, mode: 'fallback' });
  }

  const reply = await callGeminiChat(
    'You are an interview coach. Answer in one concise, practical paragraph.',
    [{ role: 'user', text: `Question: ${query}\nContext: ${JSON.stringify(context)}` }]
  );

  res.json({ reply: reply || fallbackReply, mode: reply ? 'ai' : 'fallback' });
});

// Enhanced coach guidance
router.post('/coach-guidance', authenticate, async (req, res) => {
  const { analysis = {}, interviewHistory = [], feedback = '' } = req.body;
  const guidance = buildCoachGuidance(analysis, interviewHistory, feedback);

  if (!isGeminiEnabled()) {
    return res.json({ ...guidance, mode: 'fallback' });
  }

  const prompt = `Return JSON only: { "summary": string, "actions": string[] }
Coach this candidate using their skills ${(analysis.skills || []).join(', ')} and recent feedback: ${feedback || 'none'}.`;

  const aiGuidance = parseGeminiJson(await callGemini(prompt));
  if (aiGuidance) {
    return res.json({
      summary: aiGuidance.summary || guidance.summary,
      actions: aiGuidance.actions?.length ? aiGuidance.actions : guidance.actions,
      mode: 'ai',
    });
  }

  res.json({ ...guidance, mode: 'fallback' });
});

// Get user stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const interviewCount = await db.get('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?', [req.user.id]);
    const avgScore = await db.get('SELECT COALESCE(AVG(score), 0) as avg FROM interviews WHERE user_id = ?', [req.user.id]);
    const dsaCount = await db.get('SELECT COUNT(*) as c FROM interviews WHERE user_id = ? AND type = ?', [req.user.id, 'dsa']);
    const challengesDone = await db.get('SELECT COUNT(*) as c FROM challenge_completions WHERE user_id = ? AND completed = 1', [req.user.id]);
    const rank = await db.get('SELECT COUNT(*) as c FROM users WHERE xp > ?', [user.xp]);

    const interviews = await db.all('SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.user.id]);

    const skillCounts = {};
    interviews.forEach((item) => {
      try {
        const skills = JSON.parse(item.skills || '[]');
        skills.forEach((skill) => { skillCounts[skill] = (skillCounts[skill] || 0) + 1; });
      } catch {
        // ignore malformed skill JSON
      }
    });

    const scoreTrend = interviews
      .filter((item) => item.score)
      .reverse()
      .slice(0, 10)
      .map((item) => ({ date: item.created_at, score: item.score }));

    res.json({
      stats: {
        interviewCount: interviewCount.c,
        avgScore: Math.round(avgScore.avg),
        dsaCount: dsaCount.c,
        challengesDone: challengesDone.c,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        rank: rank.c + 1,
        plan: user.plan,
      },
      skillBreakdown: Object.entries(skillCounts).map(([name, count]) => ({ name, count })),
      scoreTrend,
      recentInterviews: interviews.slice(0, 5),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const db = getDbClient();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const leaderboard = await db.all(`
      SELECT id, name, plan, xp, level, streak,
        (SELECT COUNT(*) FROM interviews WHERE user_id = users.id) as interview_count,
        (SELECT COALESCE(AVG(score), 0) FROM interviews WHERE user_id = users.id) as avg_score
      FROM users
      ORDER BY xp DESC
      LIMIT ?
    `, [limit]);
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    const notifications = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json(notifications);
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    await db.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Notification read error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/notifications/read-all', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Notification read-all error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/notifications/read-all', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Notification read-all error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/daily-tip', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    const tip = await db.get('SELECT * FROM daily_tips ORDER BY RANDOM() LIMIT 1');
    res.json(tip || { content: 'Practice makes perfect. Keep showing up every day!' });
  } catch (err) {
    console.error('Daily tip error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
