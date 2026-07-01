import { useEffect, useMemo, useRef, useState } from 'react';
import Landing from './Landing';
import AdminDashboard from './AdminDashboard';
import InterviewRoom from './InterviewRoom';
import OnboardingWizard from './OnboardingWizard';
import ReadinessDashboard from './ReadinessDashboard';
import JDMatcher from './JDMatcher';
import AnswerRevision from './AnswerRevision';
import InterviewTemplates from './InterviewTemplates';
import SpacedRepetition from './SpacedRepetition';
import PracticeRoom from './PracticeRoom';
import { parseApiResponse, normalizeArray, normalizeObject } from './apiUtils.js';



const companies = ['Amazon', 'Google', 'Microsoft', 'Adobe', 'TCS'];
const companyTips = {
  Amazon: ['Lead with scalability and operational excellence.', 'Mention trade-offs around consistency and latency.'],
  Google: ['Emphasize clarity, low latency, and elegant trade-offs.', 'Show strong reasoning for distributed systems.'],
  Microsoft: ['Talk about reliability, security, and user experience.', 'Highlight observability and platform thinking.'],
  Adobe: ['Focus on collaboration, performance, and product intuition.', 'Discuss how you make complex design systems easy to use.'],
  TCS: ['Demonstrate delivery mindset, maintainability, and client impact.', 'Show structured problem solving and teamwork.']
};
const AUTH_KEY = 'interview-copilot-auth';
const SETUP_KEY = 'interview-copilot-setup';
const PROFILE_KEY = 'interview-copilot-profile';

const APP_TABS = [
  { id: 'dashboard', label: '📊 Dashboard', requiresSetup: false, icon: '📊' },
  { id: 'resume', label: '📄 Resume', requiresSetup: false, icon: '📄' },
  { id: 'room', label: '🎙️ Live Room', requiresSetup: true, icon: '🎙️' },
  { id: 'interview', label: '🎤 Interview', requiresSetup: true, icon: '🎤' },
  { id: 'dsa', label: '💻 DSA', requiresSetup: true, icon: '💻' },
  { id: 'coach', label: '🧠 Coach', requiresSetup: true, icon: '🧠' },
  { id: 'practice', label: '👥 Practice', requiresSetup: true, icon: '👥' },
  { id: 'leaderboard', label: '🏆 Ranks', requiresSetup: false, icon: '🏆' },
];

function App() {
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 'landing';
    try {
      const stored = JSON.parse(localStorage.getItem(AUTH_KEY));
      return stored?.token ? 'app' : 'landing';
    } catch {
      return 'landing';
    }
  });
  const [resumeText, setResumeText] = useState('');
  const [company, setCompany] = useState('Amazon');
  const [analysis, setAnalysis] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [coach, setCoach] = useState(null);
  const [dsaQuestion, setDsaQuestion] = useState('');
  const [dsaAnswer, setDsaAnswer] = useState('');
  const [dsaResult, setDsaResult] = useState(null);
  const [dsaLevel, setDsaLevel] = useState('easy');
  const [voiceHint, setVoiceHint] = useState('Voice mode is ready.');
  const [aiStatus, setAiStatus] = useState('Checking...');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isListening, setIsListening] = useState(false);
  const [voiceInterviewActive, setVoiceInterviewActive] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceAssistantReply, setVoiceAssistantReply] = useState('');
  const [auth, setAuth] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = JSON.parse(localStorage.getItem(AUTH_KEY));
      if (stored && stored.token) return stored;
      return null;
    } catch { return null; }
  });
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', referralCode: '' });
  const [authMode, setAuthMode] = useState('login');
  const [resumeFileName, setResumeFileName] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hi! Ask me anything about interview answers, resume stories, STAR method, or company-specific prep. I respond in real time.' }
  ]);
  const [dsaChatInput, setDsaChatInput] = useState('');
  const [dsaChatLoading, setDsaChatLoading] = useState(false);
  const [resumeBuilder, setResumeBuilder] = useState({ name: '', role: '', summary: '', skills: '' });
  const [resumeDraft, setResumeDraft] = useState(null);
  const [jobRecs, setJobRecs] = useState([]);
  const [planChoice, setPlanChoice] = useState('Pro');
  const [jobMatch, setJobMatch] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [speechAdvice, setSpeechAdvice] = useState(null);
  const [voiceCoachTarget, setVoiceCoachTarget] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dailyTip, setDailyTip] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [resumeSetupComplete, setResumeSetupComplete] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const storedAuth = JSON.parse(localStorage.getItem(AUTH_KEY));
      const setup = JSON.parse(localStorage.getItem(SETUP_KEY) || '{}');
      return Boolean(storedAuth?.user?.id && setup[storedAuth.user.id]);
    } catch {
      return false;
    }
  });
  const [atsScore, setAtsScore] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [codingChallenge, setCodingChallenge] = useState(null);
  const [communityChallenge, setCommunityChallenge] = useState(null);
  const [codingDifficulty, setCodingDifficulty] = useState('medium');
  const [codingTopic, setCodingTopic] = useState('arrays');
  const [communityCategory, setCommunityCategory] = useState('software');
  const [coachGuidance, setCoachGuidance] = useState(null);
  const [coachChatInput, setCoachChatInput] = useState('');
  const [coachChatLoading, setCoachChatLoading] = useState(false);
  const [coachChatMessages, setCoachChatMessages] = useState([
    { sender: 'bot', text: 'I am your career coach. Ask about readiness, weak areas, learning plans, or how to improve your interview performance.' }
  ]);
  const [dsaChatMessages, setDsaChatMessages] = useState([
    { sender: 'bot', text: 'Ask me for a hint, a brute-force idea, or help improving your approach for this DSA problem.' }
  ]);
  const [userProfile, setUserProfile] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const storedAuth = JSON.parse(localStorage.getItem(AUTH_KEY));
      const profiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      return storedAuth?.user?.id ? profiles[storedAuth.user.id] || null : null;
    } catch { return null; }
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const storedAuth = JSON.parse(localStorage.getItem(AUTH_KEY));
      const profiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      return Boolean(storedAuth?.token && storedAuth?.user?.id && !profiles[storedAuth.user.id]);
    } catch { return false; }
  });
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const recognitionRef = useRef(null);
  const speechRef = useRef(null);
  const transcriptRef = useRef('');
  const chatScrollRef = useRef(null);
  const dsaChatScrollRef = useRef(null);
  const coachChatScrollRef = useRef(null);

  const token = auth?.token || (typeof window !== 'undefined' ? (() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed?.token || null;
    } catch {
      return null;
    }
  })() : null);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const resumeReady = resumeSetupComplete || Boolean(analysis);

  const markResumeReady = () => {
    setResumeSetupComplete(true);
    if (auth?.user?.id) {
      try {
        const setup = JSON.parse(localStorage.getItem(SETUP_KEY) || '{}');
        setup[auth.user.id] = true;
        localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleTabClick = (tabId) => {
    const tab = APP_TABS.find((item) => item.id === tabId);
    if (tab?.requiresSetup && !resumeReady) {
      setStatus('Upload and analyze your resume first to unlock this feature.');
      setActiveTab('resume');
      return;
    }
    setActiveTab(tabId);
  };


  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => setAiStatus(d.geminiEnabled ? 'Gemini AI enabled' : 'Fallback mode')).catch(() => setAiStatus('Unavailable'));
    return () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); };
  }, []);

  useEffect(() => {
    if (auth) { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); }
    else { localStorage.removeItem(AUTH_KEY); }
  }, [auth]);

  useEffect(() => {
    if (!auth?.user?.id) return;
    try {
      const setup = JSON.parse(localStorage.getItem(SETUP_KEY) || '{}');
      if (setup[auth.user.id]) setResumeSetupComplete(true);
    } catch {
      // ignore storage errors
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    if (auth && token) {
      fetchInterviewHistory();
      fetchNotifications();
      fetchDailyTip();
      fetchLeaderboard();
      fetchUserStats();
      fetchReadiness();
    }
  }, [auth?.token, analysis, history.length, userProfile?.company]);

  useEffect(() => {
    const tab = APP_TABS.find((item) => item.id === activeTab);
    if (tab?.requiresSetup && !resumeReady) setActiveTab('resume');
  }, [resumeReady]);

  useEffect(() => {
    if (activeTab === 'dsa' && !dsaQuestion && resumeReady) generateDsaQuestion(dsaLevel);
  }, [activeTab, dsaLevel, resumeReady]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    dsaChatScrollRef.current?.scrollTo({ top: dsaChatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [dsaChatMessages, dsaChatLoading]);

  useEffect(() => {
    coachChatScrollRef.current?.scrollTo({ top: coachChatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [coachChatMessages, coachChatLoading]);

  async function apiPost(url, body = {}) {
    const res = await fetch(url, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
    return parseApiResponse(res);
  }

  async function apiGet(url) {
    const res = await fetch(url, { headers: authHeaders });
    return parseApiResponse(res);
  }

  async function runApi(action, { busy, success } = {}) {
    try {
      if (busy) setStatus(busy);
      const data = await action();
      if (success) setStatus(success);
      return data;
    } catch (err) {
      setStatus(err.message || 'Request failed.');
      return null;
    }
  }

  async function fetchInterviewHistory() {
    try {
      const h = await apiGet('/api/interview/history');
      setHistory(normalizeArray(h));
    } catch {
      setHistory([]);
    }
  }

  async function fetchNotifications() {
    if (!token) return;
    try {
      const n = await apiGet('/api/coach/notifications');
      setNotifications(normalizeArray(n));
    } catch {
      setNotifications([]);
    }
  }

  async function fetchDailyTip() {
    if (!token) return;
    try {
      const t = await apiGet('/api/coach/daily-tip');
      setDailyTip(normalizeObject(t, { content: 'Practice makes perfect. Keep showing up every day!' }));
    } catch {
      setDailyTip({ content: 'Practice makes perfect. Keep showing up every day!' });
    }
  }

  async function fetchLeaderboard() {
    try {
      const l = await apiGet('/api/coach/leaderboard?limit=10');
      setLeaderboard(normalizeArray(l));
    } catch {
      setLeaderboard([]);
    }
  }

  async function fetchReadiness() {
    if (!token) return;
    setReadinessLoading(true);
    try {
      const data = await apiPost('/api/coach/readiness', {
        analysis: analysis || {},
        interviewHistory: history,
        profile: userProfile || {},
        company,
        role: userProfile?.role || targetRole
      });
      setReadiness(normalizeObject(data));
    } catch {
      setReadiness(null);
    } finally {
      setReadinessLoading(false);
    }
  }

  const completeOnboarding = (profile) => {
    setUserProfile(profile);
    setCompany(profile.company || company);
    setTargetRole(profile.role || targetRole);
    if (auth?.user?.id) {
      try {
        const profiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
        profiles[auth.user.id] = profile;
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
      } catch { /* ignore */ }
    }
    setShowOnboarding(false);
    setActiveTab('resume');
    setStatus(`Welcome! Your ${profile.timeline} plan for ${profile.company} is ready.`);
  };

  async function fetchUserStats() {
    if (!token) return;
    try {
      const s = await apiGet('/api/coach/stats');
      setUserStats(normalizeObject(s?.stats, null));
    } catch {
      setUserStats(null);
    }
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authForm.email.trim()) { setStatus('Please enter your email.'); return; }
    if (authMode === 'register' && !authForm.name.trim()) { setStatus('Please enter your name.'); return; }

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = authMode === 'register'
        ? { name: authForm.name, email: authForm.email, password: authForm.password, referralCode: authForm.referralCode }
        : { email: authForm.email, password: authForm.password };

      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');

      setAuth(data);
      setPage('app');
      setActiveTab('dashboard');
      setShowOnboarding(true);
      setStatus(authMode === 'register' ? 'Account created! Upload your resume to get started.' : 'Logged in! Upload your resume to unlock all features.');
      setAuthForm({ name: '', email: '', password: '', referralCode: '' });
    } catch (err) {
      setStatus(err.message);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    setPage('landing');
    setActiveTab('resume');
    setAnalysis(null);
    setResumeSetupComplete(false);
    setStatus('Signed out.');
  };

  const analyzeResume = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    if (!resumeText.trim()) { setStatus('Paste or upload your resume first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/resume/analyze', { resumeText, company }), { busy: 'Analyzing...', success: 'Resume analyzed! AI Interview, DSA, and Coach are now unlocked.' });
    if (data) {
      setAnalysis(normalizeObject(data));
      markResumeReady();
    }
  };

  const uploadResume = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    if (!resumeText.trim()) { setStatus('Paste or upload your resume first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/resume/upload', { resumeText, company }), { busy: 'Uploading...', success: 'Resume saved! All features are now unlocked.' });
    if (data?.analysis) {
      setAnalysis(normalizeObject(data.analysis));
      markResumeReady();
    } else if (data) {
      markResumeReady();
    }
  };

  const startInterview = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/start', { company, resumeText }), { success: 'Question ready.' });
    if (data) setQuestion(data.question || '');
  };

  const evaluateAnswer = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/evaluate', { question, answer, company }), { success: 'Evaluated.' });
    if (data) {
      setResult(normalizeObject(data));
      fetchInterviewHistory();
      fetchLeaderboard();
      fetchUserStats();
    }
  };

  const getCoachReport = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/coach/report', { analysis, interviewHistory: history }), { busy: 'Generating AI coach report...', success: 'Report generated.' });
    if (data) setCoach(normalizeObject(data));
  };

  const generateDsaQuestion = (level = dsaLevel) => {
    const templates = {
      easy: ['Given an array of integers, return the two numbers that add up to a target value.', 'Write a function to reverse a string without using built-in reverse methods.', 'Given a sorted array, remove duplicates in place and return the new length.'],
      medium: ['Given a string, find the length of the longest substring without repeating characters.', 'Given an array of intervals, merge all overlapping intervals and return the result.', 'Given a binary tree, return the level order traversal of its nodes values.'],
      hard: ['Design an LRU cache with O(1) average time complexity for get and put operations.', 'Given an array of integers, find the maximum sum of a subarray with at least one element.', 'Implement a sliding window solution to find the longest subarray with at most K distinct characters.']
    };
    const pool = templates[level] || templates.easy;
    setDsaQuestion(pool[Math.floor(Math.random() * pool.length)]);
    setDsaAnswer('');
    setDsaResult(null);
    setStatus(`Generated ${level} question.`);
  };

  const evaluateDsa = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/dsa-evaluate', { question: dsaQuestion, answer: dsaAnswer }), { success: 'DSA evaluated.' });
    if (data) {
      setDsaResult(normalizeObject(data));
      fetchLeaderboard();
      fetchUserStats();
    }
  };

  const handlePlanUpgrade = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/payment/upgrade', { plan: planChoice }));
    if (data?.success) {
      setAuth(prev => ({ ...prev, user: { ...prev.user, plan: planChoice } }));
      setStatus(`Upgraded to ${planChoice}.`);
    }
  };

  const buildResume = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/resume/build', resumeBuilder), { success: 'Draft ready.' });
    if (data) setResumeDraft(normalizeObject(data));
  };

  const fetchJobRecommendations = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/jobs/recommend', { skills: analysis?.skills || ['java', 'react'], company }), { success: 'Job recommendations ready.' });
    if (data) setJobRecs(normalizeArray(data.recommendations));
  };

  const analyzeJobMatch = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/coach/job-match', { resumeText, role: voiceCoachTarget || 'Software Engineer' }), { success: 'Match complete.' });
    if (data) setJobMatch(normalizeObject(data));
  };

  const generateDailyChallenge = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/coach/daily-challenge', { skill: analysis?.skills?.[0] || 'General' }), { success: 'Challenge generated.' });
    if (data) setDailyChallenge(normalizeObject(data));
  };

  const runAtsScoring = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/resume/ats-score', { resumeText, role: company }), { success: 'ATS score ready.' });
    if (data) setAtsScore(normalizeObject(data));
  };

  const loadLearningPath = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/learning-path', { analysis: analysis || {}, role: company }), { success: 'Learning path ready.' });
    if (data) setLearningPath(normalizeObject(data));
  };

  const loadCodingChallenge = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/coding-challenge', { difficulty: codingDifficulty, topic: codingTopic }), { success: 'Coding challenge ready.' });
    if (data) setCodingChallenge(normalizeObject(data));
  };

  const loadCommunityChallenge = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/interview/community-challenge', { category: communityCategory }), { success: 'Community challenge ready.' });
    if (data) setCommunityChallenge(normalizeObject(data));
  };

  const completeDailyChallenge = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/coach/daily-challenge/complete', { skill: analysis?.skills?.[0] || 'General' }));
    if (data) {
      setStatus(data.xpAwarded ? `Challenge complete! +${data.xpAwarded} XP` : 'Already completed today.');
      fetchLeaderboard();
      fetchUserStats();
    }
  };

  const analyzeSpeechCoaching = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/coach/speech-coaching', { answer }), { success: 'Speech analyzed.' });
    if (data) setSpeechAdvice(normalizeObject(data));
  };

  const loadCoachGuidance = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    const data = await runApi(() => apiPost('/api/coach/coach-guidance', { analysis, interviewHistory: history, feedback: result?.feedback || '' }), { success: 'Coach guidance ready.' });
    if (data) setCoachGuidance(normalizeObject(data));
  };

  const readNotifications = async () => {
    if (!token) return;
    await apiPost('/api/coach/notifications/read-all');
    setNotifications(n => n.map(n => ({ ...n, read: 1 })));
  };

  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1; u.pitch = 1;
    speechRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const startVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceHint('Voice input not available.'); return; }
    if (recognitionRef.current) recognitionRef.current.stop();
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = true; r.continuous = false;
    r.onstart = () => { setIsListening(true); setVoiceHint('Listening...'); };
    r.onresult = (e) => { setAnswer(Array.from(e.results).map(r => r[0].transcript).join(' ')); setVoiceHint('Captured.'); };
    r.onerror = () => { setIsListening(false); };
    r.onend = () => { setIsListening(false); setVoiceHint('Voice capture ended.'); };
    recognitionRef.current = r;
    r.start();
  };

  const stopVoiceInput = () => { recognitionRef.current?.stop(); setIsListening(false); setVoiceHint('Stopped.'); };

  const startVoiceInterview = async () => {
    if (!token) { setStatus('Sign in first.'); return; }
    setVoiceInterviewActive(true); setVoiceProcessing(false); setVoiceAssistantReply(''); setAnswer(''); transcriptRef.current = '';
    const data = await runApi(() => apiPost('/api/interview/start', { company, resumeText }));
    if (!data) { setVoiceInterviewActive(false); return; }
    const nextQ = data.question || '';
    setQuestion(nextQ);
    setVoiceHint('AI is asking...'); speakText(`Interview question for ${company}. ${nextQ}`);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceHint('Voice reply unavailable.'); setVoiceInterviewActive(false); return; }
    if (recognitionRef.current) recognitionRef.current.stop();
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false; r.continuous = false;
    r.onstart = () => setIsListening(true);
    r.onresult = (e) => { transcriptRef.current = Array.from(e.results).map(r => r[0].transcript).join(' '); setAnswer(transcriptRef.current); };
    r.onerror = () => setIsListening(false);
    r.onend = async () => {
      setIsListening(false);
      const final = transcriptRef.current.trim();
      if (!final) { setVoiceHint('No answer captured.'); setVoiceInterviewActive(false); return; }
      setVoiceProcessing(true);
      const evalData = await runApi(() => apiPost('/api/interview/evaluate', { question: nextQ, answer: final, company }));
      if (!evalData) { setVoiceHint('Evaluation failed.'); setVoiceInterviewActive(false); setVoiceProcessing(false); return; }
      const normalizedEval = normalizeObject(evalData);
      setResult(normalizedEval);
      const reply = `Feedback: ${normalizedEval.feedback || 'You did well. Keep practicing.'}`;
      setVoiceAssistantReply(reply);
      setVoiceHint('AI replied.'); speakText(reply);
      setVoiceInterviewActive(false); setVoiceProcessing(false);
      fetchInterviewHistory(); fetchLeaderboard(); fetchUserStats();
    };
    recognitionRef.current = r;
    r.start();
  };

  const stopVoiceInterview = () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); setVoiceInterviewActive(false); setVoiceProcessing(false); setVoiceHint('Voice interview stopped.'); };

  const simulateVoice = () => { setVoiceHint('Voice mode: "Tell me about a system you designed."'); setAnswer('I would explain the architecture in layers, choose a reliable database, and discuss trade-offs in consistency and scalability.'); };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    const t = chatInput.trim();
    if (!t || !token || chatLoading) return;

    const userMsg = { sender: 'user', text: t };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const data = await apiPost('/api/coach/chat', {
        message: t,
        history: nextHistory,
        context: { company, resumeText, analysis }
      });
      setChatMessages((prev) => [...prev, { sender: 'bot', text: data.reply, mode: data.mode }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: 'bot', text: err.message || 'Could not reach AI coach right now.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDsaChatSubmit = async (e) => {
    e.preventDefault();
    const t = dsaChatInput.trim();
    if (!t || !token || dsaChatLoading) return;

    const userMsg = { sender: 'user', text: t };
    const nextHistory = [...dsaChatMessages, userMsg];
    setDsaChatMessages(nextHistory);
    setDsaChatInput('');
    setDsaChatLoading(true);

    try {
      const data = await apiPost('/api/coach/dsa-chat', {
        message: t,
        history: nextHistory,
        question: dsaQuestion,
        answer: dsaAnswer
      });
      setDsaChatMessages((prev) => [...prev, { sender: 'bot', text: data.reply, mode: data.mode }]);
    } catch (err) {
      setDsaChatMessages((prev) => [...prev, { sender: 'bot', text: err.message || 'Could not reach DSA coach right now.' }]);
    } finally {
      setDsaChatLoading(false);
    }
  };

  const handleCoachChatSubmit = async (e) => {
    e.preventDefault();
    const t = coachChatInput.trim();
    if (!t || !token || coachChatLoading) return;

    const userMsg = { sender: 'user', text: t };
    const nextHistory = [...coachChatMessages, userMsg];
    setCoachChatMessages(nextHistory);
    setCoachChatInput('');
    setCoachChatLoading(true);

    try {
      const data = await apiPost('/api/coach/chat', {
        message: t,
        history: nextHistory,
        context: {
          company,
          resumeText,
          analysis,
          interviewHistory: history,
          coachFocus: 'career growth and placement readiness'
        }
      });
      setCoachChatMessages((prev) => [...prev, { sender: 'bot', text: data.reply, mode: data.mode }]);
    } catch (err) {
      setCoachChatMessages((prev) => [...prev, { sender: 'bot', text: err.message || 'Could not reach career coach right now.' }]);
    } finally {
      setCoachChatLoading(false);
    }
  };

  const readinessScore = useMemo(() => {
    const skillScore = Math.min(100, (analysis?.skills?.length || 3) * 8 + 45);
    const historyScore = Math.min(100, (history.length || 0) * 7 + 55);
    const resultScore = result?.overallScore ? Math.round(result.overallScore * 0.4) : 0;
    return Math.min(100, Math.round(skillScore * 0.45 + historyScore * 0.35 + resultScore * 0.2));
  }, [analysis, history, result]);

  if (page === 'landing' && !auth) {
    return (
      <Landing
        onGetStarted={() => { setPage('auth'); setAuthMode('register'); }}
        onLogin={() => { setPage('auth'); setAuthMode('login'); }}
      />
    );
  }

  if (page === 'admin' && auth) {
    return <AdminDashboard token={token} onBack={() => setPage('app')} />;
  }

  // Auth screen (sign in / register before app access)
  if (!auth) {
    return (
      <div className="app-shell">
        <div className="card" style={{ maxWidth: 480, margin: '80px auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎙️</div>
            <h2>{authMode === 'register' ? 'Create Account' : 'Sign In'}</h2>
            <p>Step 1 of 2 — Sign in to upload your resume and unlock AI interviews, DSA practice, and coaching.</p>
          </div>
          <form onSubmit={handleAuthSubmit}>
            {authMode === 'register' && <input placeholder="Your name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />}
            <input placeholder="Email" type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
            <input placeholder="Password" type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
            {authMode === 'register' && <input placeholder="Referral code (optional)" value={authForm.referralCode} onChange={e => setAuthForm({ ...authForm, referralCode: e.target.value })} />}
            <button type="submit">{authMode === 'register' ? 'Create Account' : 'Sign In'}</button>
            <button type="button" className="btn-outline" style={{ marginTop: 10 }} onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}>
              {authMode === 'register' ? 'Already have an account? Sign in' : 'New here? Create account'}
            </button>
            <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setPage('landing')}>← Back to home</button>
          </form>
        </div>
        <p className="status" style={{ textAlign: 'center' }}>{status}</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="app-layout">
      {showOnboarding && <OnboardingWizard onComplete={completeOnboarding} defaultCompany={company} />}

      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🎙️</span>
          <div>
            <strong>Interview Copilot</strong>
            <small>{auth?.user?.plan || 'Free'} Plan</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {APP_TABS.map((tab) => {
            const locked = tab.requiresSetup && !resumeReady;
            return (
              <button
                key={tab.id}
                type="button"
                className={`sidebar-link ${activeTab === tab.id ? 'active' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => handleTabClick(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label.replace(/^[^\s]+\s/, '')}</span>
                {locked && <small>🔒</small>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-stat"><span>⭐ {auth?.user?.xp || 0} XP</span></div>
          <div className="sidebar-stat"><span>🔥 {auth?.user?.streak || 0} day streak</span></div>
          <button className="btn-outline btn-small" onClick={() => setPage('admin')}>Admin</button>
          <button className="btn-ghost btn-small" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="app-main">
      <div className="top-bar">
        <div className="top-bar-left">
          <h1 className="page-title">{APP_TABS.find((t) => t.id === activeTab)?.label || 'Dashboard'}</h1>
          {userProfile && <span className="top-bar-badge">{userProfile.goal} · {userProfile.timeline}</span>}
        </div>
        <div className="top-bar-right">
          <span className={`ai-pill ${aiStatus.includes('enabled') ? 'live' : ''}`}>{aiStatus}</span>
          {dailyTip && <span className="tip-display" title={dailyTip.content}>💡</span>}
          <div className="notif-bell" onClick={readNotifications}>
            🔔 {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
          </div>
        </div>
      </div>

      {/* Notifications Bar */}
      {notifications.length > 0 && (
        <div className="notif-bar">
          {notifications.slice(0, 3).map((n, i) => (
            <div key={i} className={`notif-item ${n.read ? 'read' : ''}`}>
              <span>{n.type === 'xp' ? '⭐' : n.type === 'achievement' ? '🏆' : n.type === 'referral' ? '🔗' : '💡'}</span>
              <span>{n.title}: {n.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Onboarding progress */}
      <div className="onboarding-steps">
        <div className={`onboarding-step ${auth ? 'done' : ''}`}>
          <span className="step-dot">1</span>
          <span>Sign In</span>
        </div>
        <div className="onboarding-arrow">→</div>
        <div className={`onboarding-step ${resumeReady ? 'done' : auth ? 'active' : ''}`}>
          <span className="step-dot">2</span>
          <span>Upload Resume</span>
        </div>
        <div className="onboarding-arrow">→</div>
        <div className={`onboarding-step ${resumeReady ? 'active' : ''}`}>
          <span className="step-dot">3</span>
          <span>Practice & Coach</span>
        </div>
      </div>

      {!resumeReady && activeTab !== 'dashboard' && activeTab !== 'resume' && (
        <div className="onboarding-banner">
          <strong>Step 2: Upload your resume</strong>
          <p>Paste or upload your resume on the Resume tab and click <em>Analyze Resume</em> to unlock all features.</p>
          <button className="btn-outline" onClick={() => setActiveTab('resume')}>Go to Resume →</button>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <>
          <ReadinessDashboard data={readiness} loading={readinessLoading} />
          <div className="stats-grid mini">
            <div className="stat-card"><div className="stat-info"><strong>{history.length}</strong><span>Sessions</span></div></div>
            <div className="stat-card"><div className="stat-info"><strong>{userStats?.avgScore || 0}</strong><span>Avg Score</span></div></div>
            <div className="stat-card"><div className="stat-info"><strong>#{userStats?.rank || '-'}</strong><span>Rank</span></div></div>
            <div className="stat-card"><div className="stat-info"><strong>{readiness?.daysToReady || '-'}</strong><span>Days to Ready</span></div></div>
          </div>
          <InterviewTemplates apiGet={apiGet} onSelect={(t) => { setCompany(t.companies?.[0] || company); setStatus(`Template loaded: ${t.name}`); }} />
          <JDMatcher role={targetRole} setRole={setTargetRole} resumeText={resumeText} apiPost={apiPost} runApi={runApi} />
        </>
      )}

      {activeTab === 'resume' && (
        <section className="card">
          <div className="section-title"><h2>Resume Setup</h2><span className="pill">Step 2</span></div>
          <p className="hint">Upload your resume first. We use it to personalize interview questions, DSA drills, and coaching.</p>
          <textarea rows="6" placeholder="Paste your resume or experience summary here..." value={resumeText} onChange={e => setResumeText(e.target.value)} />
          <div className="upload-box">
            <label className="file-label">
              <span>Upload resume from your device</span>
              <input type="file" accept=".txt,.md,.json,.pdf" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setResumeFileName(file.name);
                  try { const text = await file.text(); setResumeText(text); } catch { setResumeText(`Uploaded: ${file.name}`); }
                }
              }} />
            </label>
            {resumeFileName && <p className="hint">Loaded: {resumeFileName}</p>}
          </div>
          <select value={company} onChange={e => setCompany(e.target.value)}>{companies.map(c => <option key={c}>{c}</option>)}</select>
          <div className="button-row">
            <button onClick={analyzeResume}>Analyze Resume</button>
            <button className="btn-outline" onClick={uploadResume}>Upload & Save</button>
          </div>
          {analysis && (
            <div className="result-box">
              <h3>{analysis.summary}</h3>
              <div className="tip-box">
                <strong>Company focus for {company}</strong>
                <ul>{companyTips[company].map(t => <li key={t}>{t}</li>)}</ul>
              </div>
              <h4>Detected Skills</h4>
              <div className="skill-tags">{analysis.skills.map(s => <span key={s} className="pill">{s}</span>)}</div>
              <h4>Suggested Questions</h4>
              <ul>{analysis.personalizedQuestions.map(q => <li key={q}>{q}</li>)}</ul>
              <div className="button-row" style={{ marginTop: 16 }}>
                <button onClick={() => handleTabClick('room')}>Enter Live Interview Room →</button>
                <button className="btn-outline" onClick={() => handleTabClick('interview')}>Go to AI Interview →</button>
                <button className="btn-outline" onClick={() => handleTabClick('dsa')}>Go to DSA Practice →</button>
                <button className="btn-outline" onClick={() => handleTabClick('coach')}>Go to Career Coach →</button>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'room' && resumeReady && (
        <InterviewRoom
          companies={companies}
          company={company}
          setCompany={setCompany}
          resumeText={resumeText}
          apiPost={apiPost}
          runApi={runApi}
          onSessionComplete={() => {
            fetchInterviewHistory();
            fetchLeaderboard();
            fetchUserStats();
          }}
        />
      )}

      {activeTab === 'interview' && resumeReady && (
        <>
          <AnswerRevision question={question} answer={answer} company={company} apiPost={apiPost} runApi={runApi} />
          <section className="card">
            <div className="section-title">
              <h2>Interview Help Chatbot</h2>
              <span className="pill">{aiStatus.includes('enabled') ? 'AI Live' : 'Fallback'}</span>
            </div>
            <div className="chat-window" ref={chatScrollRef}>
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.sender}`}>
                  {m.text}
                  {m.mode === 'ai' && m.sender === 'bot' && <span className="chat-mode-tag">AI</span>}
                </div>
              ))}
              {chatLoading && <div className="chat-bubble bot chat-typing">Coach is typing...</div>}
            </div>
            <form className="chat-form" onSubmit={handleChatSubmit}>
              <input
                placeholder="Ask for help replying to a question..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()}>{chatLoading ? '...' : 'Send'}</button>
            </form>
          </section>

          <section className="card">
            <div className="section-title"><h2>AI Mock Interview</h2><span className="pill">Live</span></div>
            <select value={company} onChange={e => setCompany(e.target.value)}>{companies.map(c => <option key={c}>{c}</option>)}</select>
            <div className="button-row">
              <button onClick={startInterview}>Generate Question</button>
              <button className="btn-outline" onClick={simulateVoice}>Simulate Voice</button>
              <button className="btn-outline" onClick={isListening ? stopVoiceInput : startVoiceInput}>{isListening ? 'Stop Voice Input' : 'Start Voice Input'}</button>
              <button onClick={voiceInterviewActive ? stopVoiceInterview : startVoiceInterview}>
                {voiceInterviewActive ? 'Stop Voice Interview' : 'Start Voice Interview'}
              </button>
            </div>
            <p className="hint">{voiceHint}</p>
            {voiceProcessing && <p className="hint">Evaluating your spoken answer...</p>}
            {question && <div className="question-box">{question}</div>}
            <textarea rows="5" placeholder="Your answer..." value={answer} onChange={e => setAnswer(e.target.value)} />
            <button onClick={evaluateAnswer}>Evaluate Answer</button>
            {voiceAssistantReply && <div className="result-box"><h3>AI Voice Reply</h3><p>{voiceAssistantReply}</p></div>}
            {result && (
              <div className="result-box">
                <h3>Score Breakdown</h3>
                <div className="score-grid">
                  <div><strong>{result.overallScore}</strong><span>Overall</span></div>
                  <div><strong>{result.technicalKnowledge}</strong><span>Tech</span></div>
                  <div><strong>{result.communication}</strong><span>Comm</span></div>
                  <div><strong>{result.confidence}</strong><span>Confidence</span></div>
                </div>
                <p>{result.feedback}</p>
                <p><strong>Follow-up:</strong> {result.followUpQuestion}</p>
                {result.rubric && (
                  <div className="rubric-grid">
                    <p><strong>Hire signal:</strong> {result.rubric.hireSignal}</p>
                    {result.rubric.rubric?.map((r) => (
                      <div key={r.category} className="rubric-item">
                        <span>{r.category}</span><strong>{r.score}</strong><small>{r.weight}</small>
                      </div>
                    ))}
                  </div>
                )}
                {result.recruiterReport && (
                  <div className="tip-box">
                    <strong>{result.recruiterReport.verdict}</strong>
                    <p>{result.recruiterReport.summary}</p>
                    <p><strong>Strengths:</strong> {result.recruiterReport.strengths.join(', ')}</p>
                    <ul>{result.recruiterReport.improvements.map(i => <li key={i}>{i}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'dsa' && resumeReady && (
        <>
        <SpacedRepetition apiGet={apiGet} apiPost={apiPost} runApi={runApi} />
        <section className="card">
          <div className="section-title"><h2>DSA Mock Interview</h2><span className="pill">Practice</span></div>
          <div className="button-row">
            <select value={dsaLevel} onChange={e => setDsaLevel(e.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button className="btn-outline" onClick={() => generateDsaQuestion(dsaLevel)}>Generate New</button>
          </div>
          <textarea rows="3" placeholder="Problem will appear here..." value={dsaQuestion} onChange={e => setDsaQuestion(e.target.value)} />
          <textarea rows="5" placeholder="Write your approach, complexity, and edge cases..." value={dsaAnswer} onChange={e => setDsaAnswer(e.target.value)} />
          <section className="card inner-card">
            <div className="section-title">
              <h3>DSA Help Chatbot</h3>
              <span className="pill">{aiStatus.includes('enabled') ? 'AI Live' : 'Fallback'}</span>
            </div>
            <div className="chat-window" ref={dsaChatScrollRef}>
              {dsaChatMessages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.sender}`}>
                  {m.text}
                  {m.mode === 'ai' && m.sender === 'bot' && <span className="chat-mode-tag">AI</span>}
                </div>
              ))}
              {dsaChatLoading && <div className="chat-bubble bot chat-typing">DSA coach is typing...</div>}
            </div>
            <form className="chat-form" onSubmit={handleDsaChatSubmit}>
              <input
                placeholder="Ask for a hint or help..."
                value={dsaChatInput}
                onChange={e => setDsaChatInput(e.target.value)}
                disabled={dsaChatLoading}
              />
              <button type="submit" disabled={dsaChatLoading || !dsaChatInput.trim()}>{dsaChatLoading ? '...' : 'Ask'}</button>
            </form>
          </section>
          <button onClick={evaluateDsa}>Evaluate DSA Answer</button>
          {dsaResult && (
            <div className="result-box">
              <p><strong>Score:</strong> {dsaResult.score}/100</p>
              <p>{dsaResult.feedback}</p>
            </div>
          )}
        </section>
        </>
      )}

      {activeTab === 'practice' && resumeReady && (
        <PracticeRoom apiGet={apiGet} apiPost={apiPost} userName={auth?.user?.name} runApi={runApi} />
      )}

      {activeTab === 'coach' && resumeReady && (
        <>
          <section className="card">
            <div className="section-title">
              <h2>AI Career Coach Chat</h2>
              <span className="pill">{aiStatus.includes('enabled') ? 'Real-time AI' : 'Fallback'}</span>
            </div>
            <p className="hint">Ask about readiness, weak areas, interview strategy, resume improvements, or your learning plan.</p>
            <div className="chat-window coach-chat-window" ref={coachChatScrollRef}>
              {coachChatMessages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.sender}`}>
                  {m.text}
                  {m.mode === 'ai' && m.sender === 'bot' && <span className="chat-mode-tag">AI</span>}
                </div>
              ))}
              {coachChatLoading && <div className="chat-bubble bot chat-typing">Career coach is typing...</div>}
            </div>
            <form className="chat-form" onSubmit={handleCoachChatSubmit}>
              <input
                placeholder="Ask your career coach anything..."
                value={coachChatInput}
                onChange={e => setCoachChatInput(e.target.value)}
                disabled={coachChatLoading}
              />
              <button type="submit" disabled={coachChatLoading || !coachChatInput.trim()}>{coachChatLoading ? '...' : 'Ask Coach'}</button>
            </form>
          </section>

          <section className="card">
            <div className="section-title"><h2>AI Career Coach</h2><span className="pill">Readiness</span></div>
            <div className="profile-card">
              <div>
                <strong>{auth?.user?.name}</strong>
                <p>{auth?.user?.plan || 'Free'} · {auth?.user?.streak || 0} day streak · {auth?.user?.xp || 0} XP · Level {auth?.user?.level || 1}</p>
              </div>
              <div className="badge-row">
                {(auth?.user?.badges || ['first_login']).map(b => <span key={b} className="pill">🏅 {b.replace(/_/g, ' ')}</span>)}
              </div>
            </div>

            <button onClick={getCoachReport}>Generate Placement Readiness</button>
            <div className="progress-card">
              <div className="progress-row"><span>Placement readiness</span><strong>{readinessScore}/100</strong></div>
              <div className="progress-bar"><div style={{ width: `${readinessScore}%` }} /></div>
              <p>You are tracking better than {Math.max(45, Math.min(95, readinessScore + 8))}% of similar prep paths.</p>
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Upgrade Plan</h3><span className="pill">Monetize</span></div>
              <select value={planChoice} onChange={e => setPlanChoice(e.target.value)}>
                <option value="Free">Free</option>
                <option value="Pro">Pro - $19.99/yr</option>
                <option value="Elite">Elite - $49.99/yr</option>
              </select>
              <button onClick={handlePlanUpgrade}>Upgrade Plan</button>
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Resume Builder</h3><span className="pill">AI Draft</span></div>
              <input placeholder="Your name" value={resumeBuilder.name} onChange={e => setResumeBuilder({ ...resumeBuilder, name: e.target.value })} />
              <input placeholder="Target role" value={resumeBuilder.role} onChange={e => setResumeBuilder({ ...resumeBuilder, role: e.target.value })} />
              <textarea rows="2" placeholder="Professional summary" value={resumeBuilder.summary} onChange={e => setResumeBuilder({ ...resumeBuilder, summary: e.target.value })} />
              <input placeholder="Skills (comma separated)" value={resumeBuilder.skills} onChange={e => setResumeBuilder({ ...resumeBuilder, skills: e.target.value })} />
              <button onClick={buildResume}>Generate Draft</button>
              {resumeDraft && <div className="result-box"><h4>{resumeDraft.headline}</h4><p>{resumeDraft.summary}</p><p><strong>Skills:</strong> {resumeDraft.skills.join(', ')}</p></div>}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Job Recommendations</h3><span className="pill">Match</span></div>
              <button onClick={fetchJobRecommendations}>Suggest Roles</button>
              {jobRecs.map(j => <div key={j.title} className="history-item"><strong>{j.title}</strong><p>{j.match} · {j.company}<br />{j.reason}</p></div>)}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Resume-to-Role Match</h3><span className="pill">Smart Match</span></div>
              <input placeholder="Target role" value={voiceCoachTarget} onChange={e => setVoiceCoachTarget(e.target.value)} />
              <button onClick={analyzeJobMatch}>Check Match</button>
              {jobMatch && <div className="result-box"><p><strong>Score:</strong> {jobMatch.score}/100</p><p><strong>Role:</strong> {jobMatch.role}</p><p>{jobMatch.insight}</p><p><strong>Matches:</strong> {jobMatch.matches.join(', ')}</p></div>}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>ATS Resume Scoring</h3><span className="pill">Recruiter-ready</span></div>
              <button onClick={runAtsScoring}>Check ATS Fit</button>
              {atsScore && <div className="result-box"><p><strong>Score:</strong> {atsScore.score}/100</p><p>{atsScore.summary}</p><p><strong>Matched keywords:</strong> {atsScore.matchedKeywords.join(', ')}</p><ul>{atsScore.improvements.map(i => <li key={i}>{i}</li>)}</ul></div>}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Personalized Learning Path</h3><span className="pill">Roadmap</span></div>
              <button onClick={loadLearningPath}>Generate Path</button>
              {learningPath && <div className="result-box"><p><strong>Next step:</strong> {learningPath.nextStep}</p><ul>{learningPath.modules.map(m => <li key={m.title}><strong>{m.title}</strong>: {m.focus}</li>)}</ul></div>}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Coding Interview Simulator</h3><span className="pill">Live</span></div>
              <div className="button-row">
                <select value={codingDifficulty} onChange={e => setCodingDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <select value={codingTopic} onChange={e => setCodingTopic(e.target.value)}>
                  <option value="arrays">Arrays</option>
                  <option value="strings">Strings</option>
                  <option value="trees">Trees</option>
                  <option value="graphs">Graphs</option>
                </select>
                <button className="btn-outline" onClick={loadCodingChallenge}>Generate</button>
              </div>
              {codingChallenge && <div className="result-box"><p><strong>{codingChallenge.title}</strong></p><p>{codingChallenge.prompt}</p><ul>{codingChallenge.hints.map(h => <li key={h}>{h}</li>)}</ul></div>}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Community Challenge</h3><span className="pill">Team</span></div>
              <select value={communityCategory} onChange={e => setCommunityCategory(e.target.value)}>
                <option value="software">Software</option>
                <option value="system-design">System Design</option>
                <option value="behavioral">Behavioral</option>
              </select>
              <button onClick={loadCommunityChallenge}>Create Challenge</button>
              {communityChallenge && <div className="result-box"><p><strong>{communityChallenge.title}</strong></p><p>{communityChallenge.description}</p><ul>{communityChallenge.tasks.map(t => <li key={t}>{t}</li>)}</ul><p>{communityChallenge.leaderboardHint}</p></div>}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Daily Challenge</h3><span className="pill">Streak</span></div>
              <button onClick={generateDailyChallenge}>Generate Challenge</button>
              {dailyChallenge && (
                <div className="result-box">
                  <p><strong>{dailyChallenge.title}</strong></p>
                  <ul>{dailyChallenge.tasks.map(t => <li key={t}>{t}</li>)}</ul>
                  <button className="btn-outline" onClick={completeDailyChallenge}>Mark Complete</button>
                </div>
              )}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Voice Coaching</h3><span className="pill">Filler words</span></div>
              <button onClick={analyzeSpeechCoaching}>Analyze My Speech</button>
              {speechAdvice && <div className="result-box"><p>{speechAdvice.feedback}</p><p><strong>Filler words:</strong> {speechAdvice.fillerCount}</p><p><strong>Sentences:</strong> {speechAdvice.sentenceCount}</p></div>}
            </div>

            <div className="card inner-card">
              <div className="section-title"><h3>Coach Guidance</h3><span className="pill">Personalized</span></div>
              <button onClick={loadCoachGuidance}>Get Guidance</button>
              {coachGuidance && (
                <div className="result-box">
                  {coachGuidance.mode === 'ai' && <span className="chat-mode-tag">AI</span>}
                  <p>{coachGuidance.summary}</p>
                  <ul>{coachGuidance.actions.map(a => <li key={a}>{a}</li>)}</ul>
                </div>
              )}
            </div>

            {coach && (
              <div className="result-box">
                {coach.mode === 'ai' && <span className="chat-mode-tag">AI Report</span>}
                <p><strong>Readiness:</strong> {coach.readiness}/100</p>
                <p><strong>Strengths:</strong> {coach.strengths.join(', ')}</p>
                <p><strong>Weak Areas:</strong> {coach.weakAreas.join(', ')}</p>
                <p><strong>Focus Areas:</strong> {coach.focusAreas.join(', ')}</p>
                <p>{coach.summary}</p>
                <ul>{coach.roadmap.map(i => <li key={i}>{i}</li>)}</ul>
              </div>
            )}
          </section>

          <section className="card analytics-card">
            <div className="section-title"><h2>Analytics</h2><span className="pill">Trend</span></div>
            {userStats && (
              <div className="stats-grid mini">
                <div className="stat-card"><strong>{userStats.interviewCount}</strong><span>Interviews</span></div>
                <div className="stat-card"><strong>{userStats.avgScore}</strong><span>Avg Score</span></div>
                <div className="stat-card"><strong>{userStats.dsaCount}</strong><span>DSA Done</span></div>
                <div className="stat-card"><strong>{userStats.challengesDone}</strong><span>Challenges</span></div>
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-title"><h2>Interview History</h2><span className="pill">Timeline</span></div>
            {history.length === 0 ? <p>No activity yet.</p> : history.map((item, i) => (
              <div key={i} className="history-item">
                <p><strong>{item.type === 'dsa' ? 'DSA Practice' : 'Mock Interview'}</strong> · {item.company || 'General'} · Score: {item.score || '-'}</p>
                {item.question && <p>Q: {item.question.substring(0, 80)}</p>}
              </div>
            ))}
          </section>
        </>
      )}

      {activeTab === 'leaderboard' && (
        <section className="card">
          <div className="section-title"><h2>🏆 Leaderboard</h2><span className="pill">Top Performers</span></div>
          <table className="leaderboard-table">
            <thead>
              <tr><th>Rank</th><th>Name</th><th>Plan</th><th>XP</th><th>Level</th><th>Streak</th><th>Interviews</th><th>Avg Score</th></tr>
            </thead>
            <tbody>
              {leaderboard.map((u, i) => (
                <tr key={u.id} className={u.id === auth?.user?.id ? 'highlight-row' : ''}>
                  <td>#{i + 1}</td>
                  <td>{u.name} {u.id === auth?.user?.id && '(You)'}</td>
                  <td><span className={`plan-badge ${u.plan.toLowerCase()}`}>{u.plan}</span></td>
                  <td>{u.xp}</td>
                  <td>{u.level}</td>
                  <td>{u.streak}🔥</td>
                  <td>{u.interview_count}</td>
                  <td>{Math.round(u.avg_score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="status">{status}</p>
      </main>
    </div>
  );
}

export default App;
