const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDbClient } = require('../db/database');

const { authenticate } = require('../middleware/auth');
const { awardXP, updateStreak } = require('../services/gamification');
const {
  analyzeResume,
  evaluateAnswer,
  evaluateDsaAnswer,
  buildRecruiterReport,
  scoreResumeForATS,
  buildLearningPath,
  generateCodingChallenge,
  buildCommunityChallenge,
  companyTemplates,
  buildRoomReview,
  pickRoomQuestion
} = require('../interviewLogic');
const {
  getInterviewTemplates,
  getRoundTypes,
  buildSTARScaffold,
  reviseAnswer,
  buildJDMatch,
  buildSpacedRepetition,
  buildRubricEvaluation
} = require('../features/productLogic');
const { createRoom, joinRoom, getRoom, postMessage, listPublicRooms } = require('../services/practiceRooms');
const { callGemini, parseGeminiJson } = require('../utils/gemini');

const router = express.Router();

function isGeminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Resume analysis
router.post('/resume/analyze', authenticate, async (req, res) => {
  const { resumeText, company = 'Amazon' } = req.body;
  if (!resumeText || typeof resumeText !== 'string') {
    return res.status(400).json({ error: 'Resume text is required' });
  }

  try {
    const analysis = analyzeResume(resumeText, company);
    const aiPrompt = `You are an AI interview copilot. Analyze this resume for a ${company} interview. Return JSON: { skills: string[], projects: string[], personalizedQuestions: string[], summary: string }. Resume:\n${resumeText}`;
    const aiResponse = await callGemini(aiPrompt);
    const aiAnalysis = parseGeminiJson(aiResponse);

    const finalAnalysis = aiAnalysis ? {
      ...analysis,
      skills: aiAnalysis.skills || analysis.skills,
      projects: aiAnalysis.projects || analysis.projects,
      personalizedQuestions: aiAnalysis.personalizedQuestions || analysis.personalizedQuestions,
      summary: aiAnalysis.summary || analysis.summary
    } : analysis;

    const db = getDbClient();
    await db.run('INSERT INTO resumes (id, user_id, text, analysis, company) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, resumeText, JSON.stringify(finalAnalysis), company]);

    res.json({ company, ...finalAnalysis });
  } catch (err) {
    console.error('Resume analyze error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Resume upload
router.post('/resume/upload', authenticate, async (req, res) => {
  const resumeText = req.body.resumeText || '';
  const company = req.body.company || 'Amazon';
  if (!resumeText) return res.status(400).json({ error: 'Resume text is required' });

  try {
    const analysis = analyzeResume(resumeText, company);
    const aiPrompt = `You are an AI interview copilot. Analyze this resume for a ${company} interview. Return JSON: { skills: string[], projects: string[], personalizedQuestions: string[], summary: string }. Resume:\n${resumeText}`;
    const aiResponse = await callGemini(aiPrompt);
    const aiAnalysis = parseGeminiJson(aiResponse);
    const finalAnalysis = aiAnalysis ? {
      ...analysis,
      skills: aiAnalysis.skills || analysis.skills,
      projects: aiAnalysis.projects || analysis.projects,
      personalizedQuestions: aiAnalysis.personalizedQuestions || analysis.personalizedQuestions,
      summary: aiAnalysis.summary || analysis.summary
    } : analysis;

    const db = getDbClient();
    await db.run('INSERT INTO resumes (id, user_id, text, analysis, company) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, resumeText, JSON.stringify(finalAnalysis), company]);

    await awardXP(req.user.id, 25, 'Resume upload');
    res.json({ success: true, analysis: finalAnalysis });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Start interview (generate question)
router.post('/start', authenticate, async (req, res) => {
  const { company = 'Amazon', resumeText = '' } = req.body;
  try {
    const fallbackQuestion = companyTemplates[company]?.[0] || companyTemplates.Amazon[0];
    const aiPrompt = `You are an interviewer at ${company}. Create one realistic interview question for: ${resumeText || 'a software engineer'}. Return only the question text.`;
    const aiResponse = await callGemini(aiPrompt);
    const question = aiResponse?.trim() || fallbackQuestion;

    await updateStreak(req.user.id);
    res.json({ company, question });
  } catch (err) {
    console.error('Start interview error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Evaluate answer
router.post('/evaluate', authenticate, async (req, res) => {
  const { question, answer, company = 'Amazon' } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required' });
  }

  try {
    const result = evaluateAnswer(question, answer, company);
    const recruiterReport = buildRecruiterReport(question, answer, company, { skills: [] });
    const aiPrompt = `Evaluate this interview answer. Question: ${question}\nAnswer: ${answer}\nCompany: ${company}. Return JSON: { feedback: string, followUpQuestion: string, overallScore: number }`;
    const aiResponse = await callGemini(aiPrompt);
    const aiResult = parseGeminiJson(aiResponse);
    const finalResult = aiResult ? {
      ...result,
      feedback: aiResult.feedback || result.feedback,
      followUpQuestion: aiResult.followUpQuestion || result.followUpQuestion,
      overallScore: aiResult.overallScore || result.overallScore,
      recruiterReport
    } : { ...result, recruiterReport };

    const rubric = buildRubricEvaluation(finalResult);

    const db = getDbClient();
    await db.run('INSERT INTO interviews (id, user_id, company, type, question, answer, score, feedback, skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, company, 'mock', question, answer, finalResult.overallScore, finalResult.feedback, JSON.stringify([])]);

    await awardXP(req.user.id, 50, 'Interview completed');
    if (finalResult.overallScore >= 80) await awardXP(req.user.id, 30, 'High score bonus');
    if (finalResult.overallScore >= 100) await awardXP(req.user.id, 100, 'Perfect score!');

    res.json({ ...finalResult, rubric });
  } catch (err) {
    console.error('Evaluate answer error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DSA evaluate
router.post('/dsa-evaluate', authenticate, async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required' });
  }

  try {
    const result = evaluateDsaAnswer(question, answer);
    const aiPrompt = `Grade this DSA answer. Problem: ${question}\nAnswer: ${answer}. Return JSON: { score: number, feedback: string }`;
    const aiResponse = await callGemini(aiPrompt);
    const aiResult = parseGeminiJson(aiResponse);
    const finalResult = aiResult ? {
      score: aiResult.score || result.score,
      feedback: aiResult.feedback || result.feedback
    } : result;

    const db = getDbClient();
    await db.run('INSERT INTO interviews (id, user_id, type, question, answer, score, feedback) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, 'dsa', question, answer, finalResult.score, finalResult.feedback]);

    await awardXP(req.user.id, 40, 'DSA practice completed');

    res.json(finalResult);
  } catch (err) {
    console.error('DSA evaluate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get interview history
router.get('/history', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    const history = await db.all('SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json(history);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get questions from bank
router.get('/questions', authenticate, async (req, res) => {
  const { company, category, difficulty } = req.query;
  try {
    const db = getDbClient();
    let query = 'SELECT * FROM question_bank WHERE 1=1';
    const params = [];

    if (company) { query += ' AND company = ?'; params.push(company); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (difficulty) { query += ' AND difficulty = ?'; params.push(difficulty); }

    query += ' ORDER BY RANDOM() LIMIT 10';
    const questions = await db.all(query, params);
    res.json(questions);
  } catch (err) {
    console.error('Questions error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Resume builder
router.post('/resume/build', authenticate, (req, res) => {
  const { name, role, summary, skills } = req.body;
  const skillList = (skills || '').split(',').map(s => s.trim()).filter(Boolean);
  const headline = role ? `Experienced ${role}` : 'Skilled Software Engineer';
  const fullText = [
    `${name || 'Candidate'} | ${headline}`,
    summary || 'Driven engineer with proven technical leadership and delivery track record.',
    `Core Skills: ${skillList.join(', ') || 'Problem Solving, System Design, Communication'}`,
    'Highlights: Measurable impact, cross-team collaboration, continuous learning.'
  ].join('\n');

  res.json({
    headline,
    summary: summary || 'Built for impactful technical interviews and compelling recruiter conversations.',
    skills: skillList.length ? skillList : ['Problem Solving', 'System Design', 'Communication'],
    highlights: ['Measurable Impact', 'Ownership & Leadership', 'Mentorship', 'Learning Mindset'],
    fullText
  });
});

// ATS resume scoring
router.post('/resume/ats-score', authenticate, (req, res) => {
  const { resumeText = '', role = '' } = req.body;
  res.json(scoreResumeForATS(resumeText, role));
});

// Personalized learning path
router.post('/learning-path', authenticate, (req, res) => {
  const { analysis = {}, role = 'Software Engineer' } = req.body;
  res.json(buildLearningPath(analysis, role));
});

// Coding interview simulator
router.post('/coding-challenge', authenticate, (req, res) => {
  const { difficulty = 'medium', topic = 'arrays' } = req.body;
  res.json(generateCodingChallenge(difficulty, topic));
});

// Community challenge
router.post('/community-challenge', authenticate, (req, res) => {
  const { category = 'software' } = req.body;
  res.json(buildCommunityChallenge(category));
});

// Job recommendations
router.post('/jobs/recommend', authenticate, (req, res) => {
  const { skills = [], company = 'Amazon' } = req.body;
  const skillList = (skills || []).map(s => String(s).toLowerCase());
  const roleMap = [
    { title: 'Software Engineer', match: skillList.some(s => ['javascript', 'react', 'node', 'python', 'java', 'backend'].includes(s)) ? 'high' : 'medium' },
    { title: 'Senior Software Engineer', match: skillList.some(s => ['system design', 'architecture', 'distributed', 'leadership', 'scalability'].includes(s)) ? 'high' : 'medium' },
    { title: 'Data Engineer', match: skillList.some(s => ['sql', 'python', 'data', 'etl', 'analytics', 'pipeline'].includes(s)) ? 'high' : 'medium' },
    { title: 'Product Engineer', match: skillList.some(s => ['product', 'communication', 'collaboration', 'analytics', 'user'].includes(s)) ? 'high' : 'medium' },
    { title: 'SDE Intern', match: 'intern' },
  ];

  const recommendations = roleMap.map(role => ({
    title: role.title,
    match: role.match === 'high' ? 'Strong match' : role.match === 'medium' ? 'Good fit' : 'Emerging fit',
    company,
    reason: `Aligned to your ${skillList.slice(0, 3).join(', ') || 'engineering'} profile.`
  }));

  res.json({ recommendations });
});

// Live interview room — start session
router.post('/room/start', authenticate, async (req, res) => {
  const { company = 'Amazon', resumeText = '', totalQuestions = 3, roundType = 'technical', roundSequence = [] } = req.body;
  try {
    const count = Math.min(Math.max(parseInt(totalQuestions, 10) || 3, 1), 5);
    const rounds = getRoundTypes();
    const round = rounds.find((r) => r.id === roundType) || rounds[1];
    const fallbackQuestion = pickRoomQuestion(company, resumeText, 1, []);
    const aiPrompt = `You are a professional interviewer at ${company}. Round: ${round.label}. ${round.prompt} Question 1 of ${count}. Resume:\n${resumeText || 'Software engineer candidate'}\nReturn only the interview question text.`;
    const aiResponse = await callGemini(aiPrompt);
    const question = aiResponse?.trim() || fallbackQuestion;

    await updateStreak(req.user.id);
    res.json({
      sessionId: uuidv4(),
      company,
      totalQuestions: count,
      questionNumber: 1,
      question,
      roundType,
      roundLabel: round.label,
      roundSequence: roundSequence.length ? roundSequence : ['hr', 'technical', 'manager']
    });
  } catch (err) {
    console.error('Room start error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Live interview room — evaluate a spoken answer and optionally return next question
router.post('/room/turn', authenticate, async (req, res) => {
  const { company = 'Amazon', question, answer, questionNumber = 1, totalQuestions = 3, resumeText = '', previousQuestions = [], roundType = 'technical' } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required.' });
  }

  try {
    const result = evaluateAnswer(question, answer, company);
    const recruiterReport = buildRecruiterReport(question, answer, company, { skills: [] });
    const aiPrompt = `Evaluate this spoken interview answer. Question: ${question}\nAnswer: ${answer}\nCompany: ${company}. Return JSON: { feedback: string, followUpQuestion: string, overallScore: number }`;
    const aiResponse = await callGemini(aiPrompt);
    const aiResult = parseGeminiJson(aiResponse);
    const evaluation = aiResult ? {
      ...result,
      feedback: aiResult.feedback || result.feedback,
      followUpQuestion: aiResult.followUpQuestion || result.followUpQuestion,
      overallScore: aiResult.overallScore || result.overallScore,
      recruiterReport,
      rubric: buildRubricEvaluation({ ...result, overallScore: aiResult.overallScore || result.overallScore })
    } : { ...result, recruiterReport, rubric: buildRubricEvaluation(result) };

    const db = getDbClient();
    await db.run('INSERT INTO interviews (id, user_id, company, type, question, answer, score, feedback, skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, company, 'voice-room', question, answer, evaluation.overallScore, evaluation.feedback, JSON.stringify([])]);

    await awardXP(req.user.id, 50, 'Voice room answer completed');
    if (evaluation.overallScore >= 80) await awardXP(req.user.id, 30, 'High score bonus');

    const current = parseInt(questionNumber, 10) || 1;
    const total = Math.min(Math.max(parseInt(totalQuestions, 10) || 3, 1), 5);
    const done = current >= total;

    let nextQuestion = null;
    if (!done) {
      const nextNumber = current + 1;
      const asked = [...previousQuestions, question];
      const rounds = getRoundTypes();
      const round = rounds.find((r) => r.id === roundType) || rounds[1];
      const fallback = pickRoomQuestion(company, resumeText, nextNumber, asked);
      const nextPrompt = `You are a professional interviewer at ${company}. Round: ${round.label}. ${round.prompt} Question ${nextNumber} of ${total}. Avoid repeating: ${asked.join(' | ')}. Resume:\n${resumeText || 'Software engineer candidate'}\nReturn only the question text.`;
      const nextAi = await callGemini(nextPrompt);
      nextQuestion = nextAi?.trim() || fallback;
    }

    res.json({
      evaluation,
      done,
      questionNumber: done ? current : current + 1,
      totalQuestions: total,
      nextQuestion
    });
  } catch (err) {
    console.error('Room turn error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Live interview room — final session review
router.post('/room/review', authenticate, async (req, res) => {
  const { company = 'Amazon', exchanges = [] } = req.body;
  if (!Array.isArray(exchanges) || exchanges.length === 0) {
    return res.status(400).json({ error: 'At least one completed exchange is required.' });
  }

  try {
    const baseReview = buildRoomReview(exchanges, company);
    const transcript = exchanges.map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}\nScore: ${item.overallScore || item.score || 0}`).join('\n\n');
    const aiPrompt = `You are a senior interview coach. Review this full voice interview for ${company}.\n${transcript}\nReturn JSON: { summary: string, strengths: string[], improvements: string[], verdict: string, overallScore: number }`;
    const aiResponse = await callGemini(aiPrompt);
    const aiReview = parseGeminiJson(aiResponse);

    const review = aiReview ? {
      ...baseReview,
      summary: aiReview.summary || baseReview.summary,
      strengths: aiReview.strengths?.length ? aiReview.strengths : baseReview.strengths,
      improvements: aiReview.improvements?.length ? aiReview.improvements : baseReview.improvements,
      verdict: aiReview.verdict || baseReview.verdict,
      overallScore: aiReview.overallScore || baseReview.overallScore
    } : baseReview;

    await awardXP(req.user.id, 120, 'Completed voice interview room session');
    res.json(review);
  } catch (err) {
    console.error('Room review error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Interview templates
router.get('/templates', authenticate, (req, res) => {
  res.json(getInterviewTemplates());
});

router.get('/round-types', authenticate, (req, res) => {
  res.json(getRoundTypes());
});

// STAR scaffold
router.post('/star-scaffold', authenticate, (req, res) => {
  const { answer = '' } = req.body;
  res.json(buildSTARScaffold(answer));
});

// Answer revision loop
router.post('/revise-answer', authenticate, async (req, res) => {
  const { question = '', answer = '', company = 'Amazon' } = req.body;
  const base = reviseAnswer(question, answer, company);
  if (isGeminiEnabled && answer.trim()) {
    const ai = parseGeminiJson(await callGemini(
      `Improve this interview answer using STAR. Return JSON: { revised: string, improvements: string[] }\nQuestion: ${question}\nAnswer: ${answer}\nCompany: ${company}`
    ));
    if (ai?.revised) {
      return res.json({ ...base, revised: ai.revised, improvements: ai.improvements || base.improvements, mode: 'ai' });
    }
  }
  res.json({ ...base, mode: 'fallback' });
});

// JD matcher with practice plan
router.post('/jd-match', authenticate, async (req, res) => {
  const { jdText = '', resumeText = '', role = 'Software Engineer' } = req.body;
  const base = buildJDMatch(jdText, resumeText, role);
  if (isGeminiEnabled && jdText.trim()) {
    const ai = parseGeminiJson(await callGemini(
      `Match resume to job description. Return JSON: { score: number, matchedSkills: string[], missingSkills: string[], insight: string, practicePlan: string[], daysToReady: number }\nJD:\n${jdText.slice(0, 2000)}\nResume:\n${resumeText.slice(0, 1500)}`
    ));
    if (ai) return res.json({ ...base, ...ai, mode: 'ai' });
  }
  res.json({ ...base, mode: 'fallback' });
});

// Spaced repetition for DSA
router.get('/spaced-repetition', authenticate, async (req, res) => {
  try {
    const db = getDbClient();
    const history = await db.all('SELECT * FROM interviews WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 20', [req.user.id, 'dsa']);
    const weak = (req.query.topics || 'arrays,trees,dynamic-programming').split(',').map((t) => t.trim());
    res.json(buildSpacedRepetition(weak, history));
  } catch (err) {
    console.error('Spaced repetition error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/spaced-repetition/complete', authenticate, async (req, res) => {
  const { topic = 'arrays' } = req.body;
  await awardXP(req.user.id, 35, `Spaced repetition: ${topic}`);
  res.json({ success: true, xpAwarded: 35, topic });
});

// Peer practice rooms
router.get('/practice-rooms', authenticate, (req, res) => {
  res.json(listPublicRooms());
});

router.post('/practice-rooms/create', authenticate, (req, res) => {
  const { topic = 'Mock Interview Practice' } = req.body;
  const room = createRoom(req.user.name || 'Host', topic);
  res.json(room);
});

router.post('/practice-rooms/join', authenticate, (req, res) => {
  const { code, name } = req.body;
  const room = joinRoom(code, name || req.user.name || 'Guest');
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  res.json(room);
});

router.get('/practice-rooms/:code', authenticate, (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  res.json(room);
});

router.post('/practice-rooms/:code/message', authenticate, (req, res) => {
  const { text = '' } = req.body;
  if (!text.trim()) return res.status(400).json({ error: 'Message is required.' });
  const room = postMessage(req.params.code, req.user.name || 'User', text.trim());
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  res.json(room);
});

module.exports = router;
