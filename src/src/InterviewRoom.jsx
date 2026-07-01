import { useEffect, useRef, useState } from 'react';

const PHASE_LABELS = {
  idle: 'Ready to begin',
  'ai-speaking': 'AI interviewer is asking...',
  listening: 'Listening to your answer...',
  processing: 'Evaluating your response...',
  review: 'Session complete'
};

export default function InterviewRoom({
  companies,
  company,
  setCompany,
  resumeText,
  apiPost,
  runApi,
  onSessionComplete
}) {
  const [roomPhase, setRoomPhase] = useState('idle');
  const [questionCount, setQuestionCount] = useState(3);
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [finalReview, setFinalReview] = useState(null);
  const [roomError, setRoomError] = useState('');
  const [roundType, setRoundType] = useState('technical');
  const [interviewMode, setInterviewMode] = useState('standard');

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const exchangesRef = useRef([]);
  const sessionRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    exchangesRef.current = exchanges;
  }, [exchanges]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => () => {
    cancelledRef.current = true;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (text) => new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });

  const listenForAnswer = () => new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setRoomError('Voice input is not supported in this browser. Try Chrome or Edge.');
      resolve('');
      return;
    }

    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    transcriptRef.current = '';
    setLiveTranscript('');

    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0].transcript).join(' ');
      transcriptRef.current = text;
      setLiveTranscript(text);
    };

    recognition.onerror = () => resolve(transcriptRef.current.trim());
    recognition.onend = () => resolve(transcriptRef.current.trim());

    recognitionRef.current = recognition;
    recognition.start();
  });

  const appendTranscript = (speaker, text) => {
    setTranscript((prev) => [...prev, { speaker, text, time: new Date().toLocaleTimeString() }]);
  };

  const askQuestion = async (question, questionNumber, totalQuestions) => {
    setCurrentQuestion(question);
    setRoomPhase('ai-speaking');
    appendTranscript('ai', `Question ${questionNumber} of ${totalQuestions}: ${question}`);
    await speak(`Question ${questionNumber}. ${question}`);
    if (cancelledRef.current) return;
    setRoomPhase('listening');
    appendTranscript('system', 'Your turn — speak your answer now.');
    const answer = await listenForAnswer();
    if (cancelledRef.current) return;
    return answer;
  };

  const processTurn = async (question, answer, questionNumber) => {
    setRoomPhase('processing');
    const activeSession = sessionRef.current;
    if (!activeSession) return null;

    const previousQuestions = exchangesRef.current.map((item) => item.question);
    const data = await runApi(() => apiPost('/api/interview/room/turn', {
      company: activeSession.company,
      question,
      answer,
      questionNumber,
      totalQuestions: activeSession.totalQuestions,
      resumeText,
      previousQuestions,
      roundType: activeSession.roundType || roundType
    }));

    if (!data) return null;

    const evaluation = data.evaluation || {};
    const exchange = {
      question,
      answer,
      overallScore: evaluation.overallScore,
      technicalKnowledge: evaluation.technicalKnowledge,
      communication: evaluation.communication,
      confidence: evaluation.confidence,
      feedback: evaluation.feedback
    };

    setExchanges((prev) => [...prev, exchange]);
    appendTranscript('you', answer || '(No speech captured)');
    appendTranscript('ai', evaluation.feedback || 'Answer recorded.');

    if (data.done) {
      return { done: true };
    }

    return { done: false, nextQuestion: data.nextQuestion, questionNumber: data.questionNumber };
  };

  const finishSession = async () => {
    setRoomPhase('processing');
    const review = await runApi(() => apiPost('/api/interview/room/review', {
      company: sessionRef.current?.company || company,
      exchanges: exchangesRef.current
    }));

    if (review) {
      setFinalReview(review);
      setRoomPhase('review');
      appendTranscript('ai', `Final review: ${review.summary}`);
      await speak(`Interview complete. Your overall score is ${review.overallScore} out of 100. ${review.summary}`);
      onSessionComplete?.();
    } else {
      setRoomPhase('idle');
    }
  };

  const runInterviewLoop = async (startData) => {
    let question = startData.question;
    let questionNumber = startData.questionNumber;

    for (let turn = 0; turn < startData.totalQuestions; turn += 1) {
      const answer = await askQuestion(question, questionNumber, startData.totalQuestions);
      if (cancelledRef.current) return;

      if (!answer) {
        setRoomError('No voice detected. Please speak clearly or try again.');
        setRoomPhase('idle');
        return;
      }

      const turnResult = await processTurn(question, answer, questionNumber);
      if (!turnResult || cancelledRef.current) return;

      if (turnResult.done) {
        await finishSession();
        return;
      }

      question = turnResult.nextQuestion;
      questionNumber = turnResult.questionNumber;
      await speak('Thank you. Here is your next question.');
    }
  };

  const startRoom = async () => {
    setRoomError('');
    setFinalReview(null);
    setExchanges([]);
    setTranscript([]);
    setLiveTranscript('');
    cancelledRef.current = false;

    const data = await runApi(() => apiPost('/api/interview/room/start', {
      company,
      resumeText,
      totalQuestions: questionCount,
      roundType: interviewMode === 'multi' ? roundType : 'technical',
      roundSequence: ['hr', 'technical', 'manager']
    }), { busy: 'Preparing your interview room...' });

    if (!data) return;

    const sessionData = {
      sessionId: data.sessionId,
      company: data.company,
      totalQuestions: data.totalQuestions,
      questionNumber: data.questionNumber,
      roundType: data.roundType || roundType,
      roundLabel: data.roundLabel || 'Technical'
    };

    setSession(sessionData);
    sessionRef.current = sessionData;
    appendTranscript('system', `Interview room started for ${data.company}. ${data.totalQuestions} questions.`);
    await speak(`Welcome to your ${data.company} interview room. I will ask you ${data.totalQuestions} questions. Answer each one out loud.`);
    await runInterviewLoop(data);
  };

  const stopRoom = () => {
    cancelledRef.current = true;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setRoomPhase('idle');
    setRoomError('Interview room ended.');
  };

  const resetRoom = () => {
    cancelledRef.current = true;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setRoomPhase('idle');
    setSession(null);
    setCurrentQuestion('');
    setExchanges([]);
    setTranscript([]);
    setLiveTranscript('');
    setFinalReview(null);
    setRoomError('');
  };

  const isActive = roomPhase !== 'idle' && roomPhase !== 'review';

  return (
    <section className="card interview-room">
      <div className="section-title">
        <h2>Live Interview Room</h2>
        <span className="pill">Voice to Voice</span>
      </div>
      <p className="hint">
        Enter the room, listen to AI questions, answer by voice, and receive a full review at the end.
      </p>

      {roomPhase === 'idle' && (
        <div className="room-setup">
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            {companies.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}>
            <option value={2}>2 questions</option>
            <option value={3}>3 questions</option>
            <option value={4}>4 questions</option>
            <option value={5}>5 questions</option>
          </select>
          <select value={interviewMode} onChange={(e) => setInterviewMode(e.target.value)}>
            <option value="standard">Standard Interview</option>
            <option value="multi">Multi-Round (HR → Tech → Manager)</option>
          </select>
          {interviewMode === 'multi' && (
            <select value={roundType} onChange={(e) => setRoundType(e.target.value)}>
              <option value="hr">HR Round</option>
              <option value="technical">Technical Round</option>
              <option value="system-design">System Design</option>
              <option value="manager">Manager Round</option>
            </select>
          )}
          <button onClick={startRoom}>Enter Interview Room</button>
        </div>
      )}

      {roomPhase !== 'idle' && (
        <div className={`room-stage room-phase-${roomPhase}`}>
          <div className="room-visual">
            <div className={`room-avatar ${roomPhase === 'ai-speaking' ? 'speaking' : ''}`}>🤖</div>
            <div className={`room-user ${roomPhase === 'listening' ? 'speaking' : ''}`}>🎤 You</div>
          </div>
          <div className="room-status-pill">{PHASE_LABELS[roomPhase] || roomPhase}</div>
          {session && (
            <p className="hint room-progress">
              {session.roundLabel && <span>{session.roundLabel} · </span>}
              Question {Math.min(exchanges.length + (roomPhase === 'listening' || roomPhase === 'ai-speaking' ? 1 : 0), session.totalQuestions)} of {session.totalQuestions}
              {' · '}{session.company}
            </p>
          )}
          {currentQuestion && roomPhase !== 'review' && (
            <div className="question-box room-question">{currentQuestion}</div>
          )}
          {liveTranscript && roomPhase === 'listening' && (
            <div className="room-live-transcript">“{liveTranscript}”</div>
          )}
          {isActive && (
            <button className="btn-outline room-stop" onClick={stopRoom}>Leave Room</button>
          )}
        </div>
      )}

      {transcript.length > 0 && (
        <div className="room-transcript">
          <h3>Live Transcript</h3>
          {transcript.map((line, index) => (
            <div key={index} className={`room-line room-line-${line.speaker}`}>
              <strong>{line.speaker === 'ai' ? 'AI Interviewer' : line.speaker === 'you' ? 'You' : 'System'}</strong>
              <span>{line.time}</span>
              <p>{line.text}</p>
            </div>
          ))}
        </div>
      )}

      {exchanges.length > 0 && roomPhase !== 'review' && (
        <div className="room-turn-results">
          <h3>Answer Scores So Far</h3>
          {exchanges.map((item, index) => (
            <div key={index} className="history-item">
              <strong>Q{index + 1}: {item.overallScore}/100</strong>
              <p>{item.feedback}</p>
            </div>
          ))}
        </div>
      )}

      {finalReview && (
        <div className="room-review result-box">
          <h3>Final Interview Review</h3>
          <div className="score-grid">
            <div><strong>{finalReview.overallScore}</strong><span>Overall</span></div>
            <div><strong>{finalReview.technicalAverage}</strong><span>Technical</span></div>
            <div><strong>{finalReview.communicationAverage}</strong><span>Communication</span></div>
            <div><strong>{finalReview.confidenceAverage}</strong><span>Confidence</span></div>
          </div>
          <p><strong>Verdict:</strong> {finalReview.verdict}</p>
          <p>{finalReview.summary}</p>
          <p><strong>Strengths:</strong> {finalReview.strengths?.join(', ')}</p>
          <ul>{finalReview.improvements?.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="button-row">
            <button onClick={resetRoom}>Start New Room Session</button>
          </div>
        </div>
      )}

      {roomError && <p className="room-error">{roomError}</p>}
    </section>
  );
}
