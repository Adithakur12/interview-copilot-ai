import { useEffect, useState } from 'react';

export default function InterviewTemplates({ apiGet, onSelect }) {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    apiGet('/api/interview/templates').then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const pick = (t) => {
    setSelected(t);
    onSelect?.(t);
  };

  return (
    <section className="card">
      <div className="section-title"><h2>Interview Templates</h2><span className="pill">Quick Start</span></div>
      <div className="template-grid">
        {templates.map((t) => (
          <button key={t.id} type="button" className={`template-card ${selected?.id === t.id ? 'selected' : ''}`} onClick={() => pick(t)}>
            <span className="template-icon">{t.icon}</span>
            <h3>{t.name}</h3>
            <p>{t.focus}</p>
            <small>{t.rounds?.join(' → ')} · {t.duration}</small>
          </button>
        ))}
      </div>
      {selected && (
        <div className="result-box animate-in">
          <h4>Sample questions for {selected.name}</h4>
          <ul>{selected.questions?.map((q) => <li key={q}>{q}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
