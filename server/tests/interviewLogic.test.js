const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRecruiterReport,
  buildCareerCoachReport,
  buildResumeJobMatch,
  buildDailyChallenge,
  scoreResumeForATS,
  buildLearningPath,
  generateCodingChallenge,
  buildCommunityChallenge,
  buildAssistantReply,
  buildCoachGuidance
} = require('../interviewLogic');

test('buildRecruiterReport rewards structure and measurable impact', () => {
  const report = buildRecruiterReport(
    'Tell me about a project you led.',
    'I led a team of 5 engineers and improved throughput by 35% using caching and a new deployment strategy.',
    'Amazon',
    { skills: ['java', 'react'] }
  );

  assert.ok(report.score >= 80);
  assert.ok(report.strengths.includes('Clear structure'));
  assert.ok(report.strengths.includes('Quantified impact'));
  assert.ok(report.improvements.some((item) => item.includes('trade')));
});

test('buildCareerCoachReport creates a personalized roadmap', () => {
  const report = buildCareerCoachReport({ skills: ['java', 'react'] }, [{ overallScore: 55 }]);

  assert.ok(report.focusAreas.length > 0);
  assert.ok(report.roadmap.some((item) => item.includes('mock interview')));
  assert.ok(report.roadmap.some((item) => item.includes('system design')) || report.roadmap.some((item) => item.includes('project')));
});

test('buildResumeJobMatch and buildDailyChallenge generate useful outputs', () => {
  const match = buildResumeJobMatch('Java React Node SQL', 'Senior Software Engineer');
  const challenge = buildDailyChallenge('Java');

  assert.ok(match.score >= 60);
  assert.ok(match.matches.some((item) => item.includes('Java')));
  assert.ok(challenge.title.length > 0);
  assert.ok(challenge.tasks.length > 0);
});

test('scoreResumeForATS produces actionable ATS feedback', () => {
  const result = scoreResumeForATS('Java Spring Boot React SQL AWS', 'Senior Backend Engineer');

  assert.ok(result.score >= 60);
  assert.ok(result.improvements.length > 0);
  assert.ok(result.summary.length > 0);
});

test('buildLearningPath creates a role-specific roadmap', () => {
  const path = buildLearningPath({ skills: ['java', 'react'] }, 'Senior Software Engineer');

  assert.ok(path.modules.length > 0);
  assert.ok(path.modules.some((module) => module.title.includes('System')) || path.modules.some((module) => module.title.includes('Behavioral')));
});

test('generateCodingChallenge and buildCommunityChallenge return structured prompts', () => {
  const challenge = generateCodingChallenge('medium', 'arrays');
  const community = buildCommunityChallenge('software');

  assert.ok(challenge.title.length > 0);
  assert.ok(challenge.hints.length > 0);
  assert.ok(community.title.length > 0);
  assert.ok(community.tasks.length > 0);
});

test('buildAssistantReply and buildCoachGuidance provide helpful guidance', () => {
  const reply = buildAssistantReply('How should I answer a system design question?', { company: 'Amazon' });
  const guidance = buildCoachGuidance({ skills: ['java', 'react'] }, [{ overallScore: 70 }], 'Be more concise');

  assert.ok(reply.length > 0);
  assert.ok(guidance.summary.length > 0);
  assert.ok(guidance.actions.length > 0);
});

test('buildRoomReview aggregates voice interview session scores', () => {
  const { buildRoomReview } = require('../interviewLogic');
  const review = buildRoomReview([
    { question: 'Q1', answer: 'A1', overallScore: 80, technicalKnowledge: 82, communication: 78, confidence: 76 },
    { question: 'Q2', answer: 'A2', overallScore: 70, technicalKnowledge: 72, communication: 68, confidence: 70 }
  ], 'Amazon');

  assert.equal(review.overallScore, 75);
  assert.equal(review.exchanges.length, 2);
  assert.ok(review.summary.includes('Amazon'));
});
