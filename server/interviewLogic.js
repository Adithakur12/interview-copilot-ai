const companyTemplates = {
  Amazon: [
    'Design a scalable notification service for a high-traffic e-commerce app.',
    'Explain how you would optimize a slow API under peak traffic.',
    'How would you ensure data consistency in a distributed checkout system?'
  ],
  Google: [
    'How would you design a search suggestion service with low latency?',
    'Explain how you would debug a flaky distributed cache.',
    'What trade-offs would you consider in a large-scale recommendation system?'
  ],
  Microsoft: [
    'How would you design a secure authentication flow for a modern SaaS app?',
    'Explain how you would make a monolith more resilient to failures.',
    'How would you handle observability for a growing platform?'
  ],
  Adobe: [
    'How would you design a collaborative editing feature at scale?',
    'Explain how you would improve performance for a media-heavy web application.',
    'How would you manage version conflicts in a shared document system?'
  ],
  TCS: [
    'How would you approach a client-facing enterprise application migration?',
    'Explain how you would design a reliable internal workflow system.',
    'How would you balance speed and quality in a delivery team context?'
  ]
};

function analyzeResume(text, company = 'Amazon') {
  const lower = text.toLowerCase();
  const skillKeywords = [
    'spring boot', 'java', 'react', 'node', 'typescript', 'python', 'postgresql',
    'docker', 'aws', 'kubernetes', 'redis', 'mongodb', 'jwt', 'microservices',
    'rest api', 'graphql', 'ai', 'machine learning', 'nlp', 'system design', 'c++', 'sql'
  ];

  const skills = skillKeywords.filter((skill) => lower.includes(skill));
  const projects = text
    .split(/\n|\r/)
    .map((line) => line.trim())
    .filter((line) => /project|built|developed|implemented|created/i.test(line) && line.length > 8)
    .slice(0, 4);
  const experience = /\b(\d+)(\s*\+?\s*(year|years|yr|yrs))\b/i.test(text)
    ? text.match(/\b(\d+)(\s*\+?\s*(year|years|yr|yrs))\b/i)?.[0] || 'Experience noted in resume'
    : 'Experience details available in your resume';

  const techStack = skills.length > 0 ? skills.slice(0, 6) : ['Backend', 'Frontend', 'Cloud'];
  const personalizedQuestions = [
    `Explain ${skills[0] || 'your strongest technology'} in simple terms.`,
    `How did you evaluate the quality of a project built with ${skills[1] || 'your stack'}?`,
    `What trade-offs did you consider while choosing ${skills[2] || 'your main framework'}?`,
    `How would you debug a production issue in a system using ${techStack[0]}?`
  ];
  const summary = `${company} interview prep detected ${skills.length} core skills and ${projects.length} relevant project highlights.`;

  return {
    skills,
    projects,
    experience,
    techStack,
    personalizedQuestions,
    summary,
    company
  };
}

function evaluateAnswer(question, answer, company = 'Amazon') {
  const lower = `${question} ${answer}`.toLowerCase();
  const technicalHits = ['design', 'scalability', 'latency', 'cache', 'database', 'api', 'security', 'consistency', 'trade-off', 'architecture', 'performance'].filter((word) => lower.includes(word));
  const clarityScore = Math.min(95, 45 + Math.min(20, Math.floor(answer.split(/\s+/).length / 3)) + (answer.length > 80 ? 10 : 0));
  const technicalScore = Math.min(95, 40 + technicalHits.length * 8 + (answer.length > 80 ? 8 : 0));
  const confidenceScore = Math.min(95, 50 + (answer.includes('i would') || answer.includes('because') ? 15 : 0) + (answer.length > 60 ? 10 : 0));
  const problemScore = Math.min(95, 42 + technicalHits.length * 6 + (answer.includes('edge') || answer.includes('trade') ? 10 : 0));

  const overall = Math.round((technicalScore * 0.35 + clarityScore * 0.25 + confidenceScore * 0.2 + problemScore * 0.2));
  const feedback = overall >= 80
    ? 'Strong answer with clear reasoning and concrete trade-offs.'
    : overall >= 60
      ? 'Solid response, but add more structure and concrete examples.'
      : 'Good start. Expand on trade-offs, edge cases, and implementation specifics.';
  const followUp = companyTemplates[company]?.[Math.floor(Math.random() * companyTemplates[company].length)] || 'Why would you choose this approach over a simpler one?';

  return {
    technicalKnowledge: technicalScore,
    communication: clarityScore,
    confidence: confidenceScore,
    clarity: clarityScore,
    problemSolving: problemScore,
    overallScore: overall,
    feedback,
    followUpQuestion: followUp
  };
}

function evaluateDsaAnswer(question, answer) {
  const lower = `${question} ${answer}`.toLowerCase();
  const complexityMentions = ['time complexity', 'space complexity', 'o(n)', 'o(log n)', 'o(n log n)', 'o(1)'].filter((item) => lower.includes(item));
  const edgeMentions = ['edge case', 'empty', 'null', 'duplicate', 'sorted'].filter((item) => lower.includes(item));
  const communicationMentions = ['because', 'first', 'then', 'finally', 'approach'].filter((item) => lower.includes(item));

  const score = Math.min(95, 45 + complexityMentions.length * 10 + edgeMentions.length * 8 + communicationMentions.length * 6 + (answer.length > 100 ? 8 : 0));
  const feedback = score >= 80
    ? 'Excellent structure. You described complexity and edge cases clearly.'
    : score >= 60
      ? 'Good start. Add complexity analysis and a couple of edge cases.'
      : 'Add a clearer approach, complexity reasoning, and edge-case coverage.';

  return { score, feedback };
}

function buildRecruiterReport(question, answer, company = 'Amazon', analysis = {}) {
  const lower = `${question} ${answer}`.toLowerCase();
  const hasStructure = /situation|action|result|first|then|finally|because|i led|i built|i improved|my role|team/.test(lower);
  const hasMetrics = /%|million|thousand|increase|decrease|improve|reduced|faster|fewer|hours|days|users|customers|latency|throughput|score|35/.test(lower);
  const hasTradeoffs = /trade|trade-off|tradeoff|edge|challenge|consider|constraint|choice|strategy|deployment|architecture|scale/.test(lower);
  const hasClarity = answer && answer.trim().length > 60;

  const score = Math.min(100, 55 + (hasStructure ? 12 : 0) + (hasMetrics ? 14 : 0) + (hasTradeoffs ? 10 : 0) + (hasClarity ? 9 : 0));
  const strengths = [];
  if (hasStructure) strengths.push('Clear structure');
  if (hasMetrics) strengths.push('Quantified impact');
  if (hasTradeoffs) strengths.push('Thoughtful trade-offs');
  if (analysis?.skills?.length) strengths.push(`Relevant skills: ${analysis.skills.slice(0, 2).join(', ')}`);

  const improvements = [];
  if (!hasStructure) improvements.push('Use a STAR-style structure with situation, action, and result.');
  if (!hasMetrics) improvements.push('Add numbers, percentages, or measurable outcomes to make the impact tangible.');
  improvements.push('Mention the trade-offs you considered to sound more senior.');
  if (!hasClarity) improvements.push('Expand the response slightly so the reasoning feels more complete.');

  return {
    score,
    company,
    verdict: score >= 80 ? 'Strong recruiter signal' : score >= 65 ? 'Promising answer' : 'Needs refinement',
    strengths: strengths.length > 0 ? strengths : ['Clear intent'],
    improvements,
    summary: score >= 80
      ? 'This answer sounds polished and recruiter-friendly.'
      : 'This answer shows potential, but it would benefit from stronger structure and evidence.'
  };
}

function buildCareerCoachReport(analysis, interviewHistory = []) {
  const skillCount = analysis?.skills?.length || 0;
  const interviewAverage = interviewHistory.length > 0
    ? interviewHistory.reduce((acc, item) => acc + (item.overallScore || 0), 0) / interviewHistory.length
    : 68;

  const readiness = Math.min(100, Math.round(55 + skillCount * 4 + interviewAverage * 0.3));
  const strengths = analysis?.skills?.slice(0, 3) || ['Problem solving', 'Communication'];
  const weakAreas = ['Database design', 'Operating systems', 'System design'].filter((item) => !analysis?.skills?.some((skill) => skill.includes(item.toLowerCase().split(' ')[0]) || skill.includes('database')));
  const focusAreas = [
    readiness < 70 ? 'System design depth' : 'Behavioral storytelling',
    'Communication polish',
    'Project-based evidence'
  ];
  const roadmap = [
    'Practice one mock interview every day and record your answers for review.',
    'Revise one system design topic and one behavioral pattern each week.',
    'Build one project that demonstrates your strongest skills end-to-end.'
  ];

  return {
    readiness,
    strengths,
    weakAreas: weakAreas.length > 0 ? weakAreas : ['Communication confidence'],
    focusAreas,
    roadmap,
    summary: readiness >= 80
      ? 'You are on track for strong placement readiness.'
      : readiness >= 65
        ? 'You have a solid foundation and should focus on system design depth.'
        : 'You are building well; prioritize consistency and targeted practice.'
  };
}

function buildResumeJobMatch(resumeText = '', role = '') {
  const lowerResume = `${resumeText} ${role}`.toLowerCase();
  const keywords = ['java', 'react', 'node', 'sql', 'python', 'aws', 'docker', 'system design', 'api', 'microservices'];
  const matches = keywords.filter((keyword) => lowerResume.includes(keyword));
  const normalizedMatches = matches.map((match) => (match === 'java' ? 'Java' : match));
  const score = Math.min(100, 50 + matches.length * 8);
  return {
    score,
    role: role || 'Software Engineer',
    matches: normalizedMatches.length > 0 ? normalizedMatches : ['Problem solving', 'Communication', 'Delivery'],
    insight: score >= 80
      ? 'Your background is a strong match for this role.'
      : 'You have a solid foundation and should emphasize your most relevant skills.'
  };
}

function buildDailyChallenge(skill = 'General') {
  const challengeMap = {
    java: {
      title: 'Java Systems Challenge',
      tasks: ['Explain how you would design a thread-safe cache.', 'Write a short snippet showing dependency injection.', 'Summarize the trade-offs of using streams versus loops.']
    },
    react: {
      title: 'React Performance Challenge',
      tasks: ['Describe how you would optimize a slow component tree.', 'Explain memoization trade-offs.', 'Show how you would structure state for a complex form.']
    },
    default: {
      title: 'Daily Growth Challenge',
      tasks: ['Practice one behavioral answer.', 'Review one system design topic.', 'Record one reflection on your weakest area.']
    }
  };

  const selected = challengeMap[skill.toLowerCase()] || challengeMap.default;
  return {
    title: selected.title,
    skill: skill || 'General',
    tasks: selected.tasks
  };
}

function analyzeSpeechForCoaching(answer = '') {
  const fillerWords = ['um', 'uh', 'like', 'basically', 'actually'];
  const matches = fillerWords.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(answer));
  const sentenceCount = (answer.match(/[^.!?]+[.!?]+/g) || []).length || 1;
  return {
    fillerCount: matches.length,
    sentenceCount,
    feedback: matches.length > 0
      ? `You used ${matches.length} filler word${matches.length > 1 ? 's' : ''}. Try pausing instead of saying ${matches.join(', ')}.`
      : 'Your pacing sounds clear. Keep the rhythm steady.'
  };
}

function scoreResumeForATS(resumeText = '', role = '') {
  const lower = `${resumeText} ${role}`.toLowerCase();
  const keywords = ['java', 'react', 'node', 'python', 'sql', 'aws', 'docker', 'system design', 'api', 'leadership', 'communication'];
  const matched = keywords.filter((keyword) => lower.includes(keyword));
  const score = Math.min(100, 45 + matched.length * 7);
  const improvements = [];
  if (!matched.includes('system design')) improvements.push('Add a system design example or architecture project.');
  if (!matched.includes('aws')) improvements.push('Mention cloud or deployment experience to strengthen keyword match.');
  if (!matched.includes('leadership')) improvements.push('Highlight leadership, ownership, or mentoring experience.');
  return {
    score,
    role: role || 'Software Engineer',
    matchedKeywords: matched,
    improvements,
    summary: score >= 80 ? 'Your resume is ATS-friendly and aligned to this role.' : 'Your resume has a solid base but needs stronger keyword alignment.'
  };
}

function buildLearningPath(analysis = {}, role = 'Software Engineer') {
  const skills = (analysis?.skills || []).map((skill) => String(skill).toLowerCase());
  const modules = [];
  if (skills.some((skill) => skill.includes('java') || skill.includes('python') || skill.includes('node'))) {
    modules.push({ title: 'Core Coding Foundations', focus: 'Sharpen data structures, debugging, and clean implementation patterns.' });
  }
  if (skills.some((skill) => skill.includes('react') || skill.includes('frontend') || skill.includes('typescript'))) {
    modules.push({ title: 'Frontend Communication', focus: 'Explain component design, state flow, and user impact clearly.' });
  }
  modules.push({ title: 'System Design Depth', focus: 'Practice scaling patterns, trade-offs, and architecture storytelling.' });
  modules.push({ title: 'Behavioral Storytelling', focus: 'Use STAR framing and measurable achievements in interviews.' });
  if (role.toLowerCase().includes('senior')) {
    modules.push({ title: 'Leadership & Influence', focus: 'Prepare for stakeholder communication, mentoring, and decision-making questions.' });
  }
  return {
    role,
    modules,
    nextStep: modules[0]?.title || 'Start with daily practice'
  };
}

function generateCodingChallenge(difficulty = 'medium', topic = 'arrays') {
  const challengeMap = {
    easy: {
      arrays: { title: 'Two Sum', prompt: 'Given an array and target, return indices of two numbers that sum to the target.', hints: ['Use a hash map for O(n) time.', 'Check for duplicates carefully.'] },
      strings: { title: 'Valid Palindrome', prompt: 'Determine if a string is a palindrome ignoring non-alphanumeric characters.', hints: ['Normalize the string.', 'Use two pointers.'] }
    },
    medium: {
      arrays: { title: 'Group Anagrams', prompt: 'Group strings by anagram using a canonical signature.', hints: ['Use sorted strings or character counts.', 'Think about hashing.'] },
      trees: { title: 'Binary Tree Level Order', prompt: 'Return the level order traversal of a binary tree.', hints: ['Use BFS with a queue.', 'Track each level separately.'] }
    },
    hard: {
      arrays: { title: 'Sliding Window Maximum', prompt: 'Find the maximum for each window of size k.', hints: ['Use a deque.', 'Maintain monotonic order.'] },
      graphs: { title: 'Course Schedule', prompt: 'Determine if all courses can be completed given prerequisites.', hints: ['Use Kahn topological sort.', 'Track indegree.'] }
    }
  };

  const selected = challengeMap[difficulty]?.[topic] || challengeMap.medium.arrays;
  return {
    title: selected.title,
    prompt: selected.prompt,
    hints: selected.hints,
    difficulty,
    topic
  };
}

function buildCommunityChallenge(category = 'software') {
  return {
    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Weekly Challenge`,
    description: 'Complete a timed mock interview and earn community XP with your team.',
    tasks: [
      'Record one strong answer under 2 minutes.',
      'Share one improvement from your last mock interview.',
      'Mentor a peer with one actionable tip.'
    ],
    leaderboardHint: 'Top performers earn bonus XP and a featured badge.'
  };
}

function buildAssistantReply(query = '', context = {}) {
  const lower = `${query} ${context.company || ''}`.toLowerCase();
  if (lower.includes('system design')) {
    return 'Structure your answer with requirements, API boundaries, data model, and scale trade-offs. Start broad, then drill into one important decision.';
  }
  if (lower.includes('behavioral') || lower.includes('tell me about')) {
    return 'Use STAR: Situation, Task, Action, Result. Mention the impact and what you learned.';
  }
  if (lower.includes('dsa') || lower.includes('coding')) {
    return 'Explain your approach first, then walk through complexity, edge cases, and a clean implementation outline.';
  }
  if (lower.includes('resume')) {
    return `Tailor your answer around ${context.company || 'the target company'} by emphasizing ownership, measurable results, and relevant tools.`;
  }
  return 'I can help you answer more clearly by framing your response around impact, structure, and a concise example.';
}

function buildRoomReview(exchanges = [], company = 'Amazon') {
  if (!exchanges.length) {
    return {
      overallScore: 0,
      technicalAverage: 0,
      communicationAverage: 0,
      confidenceAverage: 0,
      summary: 'No answers were captured during this session.',
      strengths: [],
      improvements: ['Complete at least one spoken answer to receive feedback.'],
      verdict: 'Incomplete session',
      exchanges: []
    };
  }

  const scores = exchanges.map((item) => item.overallScore || item.score || 0);
  const technical = exchanges.map((item) => item.technicalKnowledge || item.score || 0);
  const communication = exchanges.map((item) => item.communication || item.score || 0);
  const confidence = exchanges.map((item) => item.confidence || item.score || 0);
  const avg = (list) => Math.round(list.reduce((sum, value) => sum + value, 0) / list.length);

  const overallScore = avg(scores);
  const technicalAverage = avg(technical);
  const communicationAverage = avg(communication);
  const confidenceAverage = avg(confidence);

  const strengths = [];
  const improvements = [];

  if (communicationAverage >= 75) strengths.push('Clear and structured communication');
  else improvements.push('Pause briefly, then answer in 3 concise points');

  if (technicalAverage >= 75) strengths.push('Strong technical depth and trade-off awareness');
  else improvements.push('Add architecture details, trade-offs, and edge cases');

  if (confidenceAverage >= 75) strengths.push('Confident delivery under interview pressure');
  else improvements.push('Lead with your recommendation, then justify it with evidence');

  if (overallScore >= 80) strengths.push('Consistent performance across the full interview room session');

  return {
    overallScore,
    technicalAverage,
    communicationAverage,
    confidenceAverage,
    summary: `You completed ${exchanges.length} voice answers for ${company} with an average score of ${overallScore}/100.`,
    strengths: strengths.length ? strengths : ['You showed up and completed a full spoken mock interview.'],
    improvements: improvements.length ? improvements : ['Keep practicing daily to sharpen your strongest stories.'],
    verdict: overallScore >= 85 ? 'Strong hire signal' : overallScore >= 70 ? 'Promising candidate' : overallScore >= 55 ? 'Needs more practice' : 'Keep building fundamentals',
    exchanges
  };
}

function pickRoomQuestion(company, resumeText = '', questionNumber = 1, previousQuestions = []) {
  const pool = companyTemplates[company] || companyTemplates.Amazon;
  const unused = pool.filter((question) => !previousQuestions.includes(question));
  const source = unused.length ? unused : pool;
  const base = source[(questionNumber - 1) % source.length];
  if (resumeText.trim()) {
    return `Based on your background, ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  }
  return base;
}

function buildCoachGuidance(analysis = {}, interviewHistory = [], feedback = '') {
  const skillCount = analysis?.skills?.length || 0;
  const avgScore = interviewHistory.length > 0
    ? interviewHistory.reduce((sum, item) => sum + (item.overallScore || item.score || 0), 0) / interviewHistory.length
    : 70;
  const actions = [];
  if (skillCount < 3) actions.push('Add one more technical project that demonstrates core backend or frontend depth.');
  if (avgScore < 75) actions.push('Practice one mock interview daily and record yourself to tighten your delivery.');
  if (feedback) actions.push(`Use this feedback to focus: ${feedback}`);
  actions.push('Review one system design topic weekly and one behavioral story every other day.');
  return {
    summary: avgScore >= 80 ? 'You are performing well and should keep refining your strongest stories.' : 'You are improving steadily; focus on consistency and clearer delivery.',
    actions: actions.slice(0, 4)
  };
}

module.exports = {
  analyzeResume,
  evaluateAnswer,
  evaluateDsaAnswer,
  buildRecruiterReport,
  buildCareerCoachReport,
  buildResumeJobMatch,
  buildDailyChallenge,
  analyzeSpeechForCoaching,
  scoreResumeForATS,
  buildLearningPath,
  generateCodingChallenge,
  buildCommunityChallenge,
  buildAssistantReply,
  buildCoachGuidance,
  buildRoomReview,
  pickRoomQuestion,
  companyTemplates
};
