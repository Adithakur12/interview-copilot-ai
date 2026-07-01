import { useState } from 'react';

export default function JDMatcher({ role, setRole, resumeText, apiPost, runApi }) {
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!jdText.trim()) return;
    setLoading(true);
    const data = await runApi(() => apiPost('/api/interview/jd-match', { jdText, resumeText, role }));
    if (data) setResult(data);
    setLoading(false);
  };

  return (
    <section className="card feature-card-accent">
      <div className="section-title"><h2>JD Matcher</h2><span className="pill">Smart Match</span></div>
      <p className="hint">Paste a job description to get match score and a personalized practice plan.</p>
      <input placeholder="Target role" value={role} onChange={(e) => setRole(e.target.value)} />
      <textarea rows="5" placeholder="Paste job description here..." value={jdText} onChange={(e) => setJdText(e.target.value)} />
      <button onClick={analyze} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze JD Match'}</button>
      {result && (
        <div className="result-box animate-in">
          <div className="score-hero"><strong>{result.score}</strong><span>/100 match</span></div>
          <p>{result.insight}</p>
          <p><strong>Matched:</strong> {result.matchedSkills?.join(', ')}</p>
          {result.missingSkills?.length > 0 && <p><strong>Gaps:</strong> {result.missingSkills.join(', ')}</p>}
          <p className="days-badge">~{result.daysToReady} days to ready</p>
          <h4>Practice Plan</h4>
          <ul>{result.practicePlan?.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
