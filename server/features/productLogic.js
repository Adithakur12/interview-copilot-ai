const INTERVIEW_TEMPLATES = [
  {
    id: 'faang-sde',
    name: 'FAANG SDE',
    icon: '🚀',
    companies: ['Amazon', 'Google', 'Microsoft'],
    rounds: ['Behavioral', 'DSA', 'System Design'],
    duration: '45-60 min',
    focus: 'Scalability, ownership, measurable impact, and structured problem solving.',
    questions: ['Tell me about a time you improved system performance.', 'Design a rate limiter.', 'Explain a challenging bug you fixed in production.']
  },
  {
    id: 'startup-fullstack',
    name: 'Startup Full Stack',
    icon: '⚡',
    companies: ['Adobe', 'TCS'],
    rounds: ['Culture Fit', 'Technical', 'Product Sense'],
    duration: '30-45 min',
    focus: 'Speed, versatility, product thinking, and end-to-end delivery.',
    questions: ['How do you prioritize features under tight deadlines?', 'Walk through a full-stack feature you shipped.', 'How do you handle ambiguous requirements?']
  },
  {
    id: 'service-enterprise',
    name: 'Enterprise / Service',
    icon: '🏢',
    companies: ['TCS', 'Microsoft'],
    rounds: ['HR', 'Technical', 'Client Scenario'],
    duration: '40-50 min',
    focus: 'Communication, maintainability, client delivery, and teamwork.',
    questions: ['Describe handling a difficult client requirement.', 'How do you ensure code quality in a team?', 'Explain a migration or integration you led.']
  },
  {
    id: 'new-grad',
    name: 'New Grad / Intern',
    icon: '🎓',
    companies: ['Amazon', 'Google', 'Microsoft', 'Adobe', 'TCS'],
    rounds: ['Behavioral', 'DSA', 'Fundamentals'],
    duration: '30-40 min',
    focus: 'Learning ability, fundamentals, projects, and collaboration.',
    questions: ['Tell me about your best academic or personal project.', 'Solve an array or string problem.', 'Why this company and role?']
  }
];

const ROUND_TYPES = [
  { id: 'hr', label: 'HR / Behavioral', icon: '👋', prompt: 'Ask a behavioral question using STAR format expectations.' },
  { id: 'technical', label: 'Technical', icon: '💻', prompt: 'Ask a technical or coding-oriented interview question.' },
  { id: 'system-design', label: 'System Design', icon: '🏗️', prompt: 'Ask a system design question appropriate for the role.' },
  { id: 'manager', label: 'Manager Round', icon: '🎯', prompt: 'Ask a leadership, ownership, or cross-team collaboration question.' }
];

const DSA_TOPICS = ['arrays', 'strings', 'trees', 'graphs', 'dynamic-programming', 'hashing', 'sliding-window'];

function getInterviewTemplates() {
  return INTERVIEW_TEMPLATES;
}

function getRoundTypes() {
  return ROUND_TYPES;
}

function buildSTARScaffold(answer = '') {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const hasMetrics = /%|\d+\s*(users|ms|hours|days|percent)/i.test(answer);
  return {
    situation: answer ? `Context: ${words.slice(0, Math.min(25, words.length)).join(' ')}...` : 'Describe the context — team, product, and constraints.',
    task: 'What was your specific responsibility or goal?',
    action: answer.length > 40 ? `Actions taken: ${words.slice(25, Math.min(55, words.length)).join(' ') || 'Expand on the steps you personally drove.'}` : 'List the key actions YOU took (not the team).',
    result: hasMetrics ? 'Quantify impact: metrics, latency, revenue, users, or quality improvements.' : 'Add measurable outcome: numbers, % improvement, or business impact.',
    tip: 'Lead with Result in 1 sentence, then unpack Situation → Action if time allows.'
  };
}

function reviseAnswer(question, answer, company = 'Amazon') {
  const scaffold = buildSTARScaffold(answer);
  const lower = answer.toLowerCase();
  const improved = [
    scaffold.situation !== answer ? `Situation: ${scaffold.situation.replace('Context: ', '')}` : '',
    `Task: I was responsible for delivering a high-impact solution for ${company}.`,
    `Action: ${answer || 'I broke the problem into phases, aligned stakeholders, and implemented the core solution with clear trade-offs.'}`,
    scaffold.result.includes('Quantify') ? 'Result: Improved key metrics by 35%, reduced latency, and enabled the team to ship faster.' : scaffold.result
  ].filter(Boolean).join('\n\n');

  const originalScore = Math.min(95, 40 + Math.floor(answer.length / 8));
  const revisedScore = Math.min(98, originalScore + 18);

  return {
    original: answer,
    revised: improved,
    scaffold,
    improvements: [
      'Added STAR structure for clarity',
      'Stronger ownership language ("I led", "I built")',
      'Clearer result with measurable impact',
      `Tailored framing for ${company} interview style`
    ],
    scores: { original: originalScore, revised: revisedScore, delta: revisedScore - originalScore }
  };
}

function buildJDMatch(jdText = '', resumeText = '', role = 'Software Engineer') {
  const jd = jdText.toLowerCase();
  const resume = resumeText.toLowerCase();
  const keywords = ['java', 'react', 'node', 'python', 'aws', 'docker', 'kubernetes', 'sql', 'system design', 'microservices', 'typescript', 'api', 'agile', 'leadership'];
  const matched = keywords.filter((k) => jd.includes(k) && resume.includes(k));
  const missing = keywords.filter((k) => jd.includes(k) && !resume.includes(k));
  const score = Math.min(100, 45 + matched.length * 10 + Math.min(20, Math.floor(resumeText.length / 200)));

  return {
    score,
    role,
    matchedSkills: matched.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    missingSkills: missing.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    insight: score >= 80 ? 'Strong alignment — focus on storytelling and depth in interviews.' : 'Good foundation — close skill gaps and practice targeted mocks.',
    practicePlan: [
      missing[0] ? `Study ${missing[0]} fundamentals (30 min)` : 'Review core CS fundamentals',
      'Complete 1 behavioral STAR answer from your resume',
      'Do 1 system design or DSA mock based on JD',
      `Practice 2 ${role} questions tailored to this JD`
    ],
    daysToReady: score >= 80 ? 7 : score >= 65 ? 14 : 21
  };
}

function buildReadinessDashboard({ analysis = {}, interviewHistory = [], profile = {}, company = 'Amazon', role = 'Software Engineer' }) {
  const skillCount = analysis?.skills?.length || 0;
  const avgScore = interviewHistory.length
    ? Math.round(interviewHistory.reduce((s, i) => s + (i.score || i.overallScore || 0), 0) / interviewHistory.length)
    : 0;
  const sessionCount = interviewHistory.length;

  const technical = Math.min(100, 35 + skillCount * 6 + avgScore * 0.25);
  const behavioral = Math.min(100, 40 + sessionCount * 5 + (avgScore > 70 ? 15 : 0));
  const communication = Math.min(100, 45 + avgScore * 0.35);
  const systemDesign = Math.min(100, 30 + (analysis?.skills?.some((s) => /design|cloud|aws|kubernetes/i.test(s)) ? 25 : 10) + avgScore * 0.2);
  const overall = Math.round((technical * 0.3 + behavioral * 0.25 + communication * 0.25 + systemDesign * 0.2));

  const categories = [
    { name: 'Technical', score: Math.round(technical), color: '#4cc9f0' },
    { name: 'Behavioral', score: Math.round(behavioral), color: '#6d5dfc' },
    { name: 'Communication', score: Math.round(communication), color: '#9ae6b4' },
    { name: 'System Design', score: Math.round(systemDesign), color: '#f6ad55' }
  ];

  const gaps = categories.filter((c) => c.score < 70).map((c) => c.name);
  const daysToReady = overall >= 80 ? 5 : overall >= 65 ? 12 : overall >= 50 ? 21 : 30;

  return {
    overall,
    company,
    role,
    goal: profile.goal || 'Land offer',
    timeline: profile.timeline || '30 days',
    categories,
    gaps,
    daysToReady,
    trend: sessionCount >= 2 ? 'improving' : sessionCount === 1 ? 'starting' : 'not-started',
    summary: overall >= 75
      ? `You are on track for ${company} ${role}. Focus on mock consistency.`
      : `Build toward ${company} readiness with targeted daily practice.`,
    milestones: [
      { label: 'Resume optimized', done: skillCount >= 2 },
      { label: '3+ mock sessions', done: sessionCount >= 3 },
      { label: 'Avg score 70+', done: avgScore >= 70 },
      { label: 'Ready signal 75+', done: overall >= 75 }
    ]
  };
}

function buildSpacedRepetition(weakTopics = [], history = []) {
  const dsaHistory = history.filter((h) => h.type === 'dsa');
  const inferredWeak = weakTopics.length ? weakTopics : DSA_TOPICS.slice(0, 3);

  const queue = inferredWeak.map((topic, index) => ({
    topic,
    dueInDays: index,
    priority: index === 0 ? 'high' : 'medium',
    problem: `Practice ${topic}: review pattern, solve 1 problem, explain complexity aloud.`,
    completed: false
  }));

  if (dsaHistory.length) {
    const lowScores = dsaHistory.filter((h) => (h.score || 0) < 70);
    if (lowScores.length && queue[0]) {
      queue[0].priority = 'high';
      queue[0].problem = `Retry weak area from last session: ${lowScores[0].question?.slice(0, 60) || 'DSA fundamentals'}...`;
    }
  }

  return { queue, nextReview: queue[0] || null, streakBonus: 'Complete today\'s topic to maintain your streak.' };
}

function buildRubricEvaluation(baseResult = {}) {
  return {
    rubric: [
      { category: 'Structure', score: baseResult.communication || baseResult.overallScore || 70, weight: '25%' },
      { category: 'Technical Depth', score: baseResult.technicalKnowledge || baseResult.score || 70, weight: '35%' },
      { category: 'Communication', score: baseResult.communication || 70, weight: '20%' },
      { category: 'Confidence', score: baseResult.confidence || 70, weight: '20%' }
    ],
    overallScore: baseResult.overallScore || baseResult.score || 70,
    feedback: baseResult.feedback || 'Solid effort — review rubric categories below.',
    hireSignal: (baseResult.overallScore || baseResult.score || 0) >= 75 ? 'Lean Hire' : (baseResult.overallScore || baseResult.score || 0) >= 60 ? 'Borderline' : 'Needs Practice'
  };
}

module.exports = {
  getInterviewTemplates,
  getRoundTypes,
  buildSTARScaffold,
  reviseAnswer,
  buildJDMatch,
  buildReadinessDashboard,
  buildSpacedRepetition,
  buildRubricEvaluation,
  INTERVIEW_TEMPLATES,
  ROUND_TYPES,
  DSA_TOPICS
};
