import { useState } from 'react';

export default function AnswerRevision({ question, answer, company, apiPost, runApi }) {
  const [draft, setDraft] = useState(answer || '');
  const [revision, setRevision] = useState(null);
  const [scaffold, setScaffold] = useState(null);
  const [loading, setLoading] = useState(false);

  const buildScaffold = async () => {
    setLoading(true);
    const data = await runApi(() => apiPost('/api/interview/star-scaffold', { answer: draft }));
    if (data) setScaffold(data);
    setLoading(false);
  };

  const revise = async () => {
    setLoading(true);
    const data = await runApi(() => apiPost('/api/interview/revise-answer', { question, answer: draft, company }));
    if (data) setRevision(data);
    setLoading(false);
  };

  return (
    <section className="card feature-card-accent">
      <div className="section-title"><h2>STAR Answer Coach</h2><span className="pill">Revision Loop</span></div>
      <p className="hint">Structure your answer with STAR and compare AI-improved version.</p>
      <textarea rows="4" placeholder="Write your draft answer..." value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div className="button-row">
        <button className="btn-outline" onClick={buildScaffold} disabled={loading}>STAR Scaffold</button>
        <button onClick={revise} disabled={loading || !draft.trim()}>{loading ? 'Revising...' : 'Revise Answer'}</button>
      </div>
      {scaffold && (
        <div className="star-grid animate-in">
          {['situation', 'task', 'action', 'result'].map((key) => (
            <div key={key} className="star-box">
              <strong>{key.charAt(0).toUpperCase() + key.slice(1)}</strong>
              <p>{scaffold[key]}</p>
            </div>
          ))}
        </div>
      )}
      {revision && (
        <div className="revision-compare animate-in">
          <div className="revision-col">
            <h4>Original ({revision.scores?.original}/100)</h4>
            <p>{revision.original}</p>
          </div>
          <div className="revision-arrow">→</div>
          <div className="revision-col improved">
            <h4>Revised ({revision.scores?.revised}/100) +{revision.scores?.delta}</h4>
            <p>{revision.revised}</p>
          </div>
          <ul>{revision.improvements?.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
