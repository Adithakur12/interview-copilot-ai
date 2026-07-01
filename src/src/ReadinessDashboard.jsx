export default function ReadinessDashboard({ data, loading }) {
  if (loading) return <div className="card shimmer-card"><p>Loading readiness dashboard...</p></div>;
  if (!data) return null;

  return (
    <section className="card dashboard-card">
      <div className="section-title">
        <h2>Readiness Dashboard</h2>
        <span className="pill glow">{data.overall}/100</span>
      </div>
      <p className="hint">{data.summary}</p>
      <div className="dashboard-hero">
        <div className="readiness-ring" style={{ '--score': data.overall }}>
          <strong>{data.overall}</strong>
          <span>Overall</span>
        </div>
        <div className="dashboard-meta">
          <p><strong>{data.company}</strong> · {data.role}</p>
          <p>Goal: {data.goal} · Timeline: {data.timeline}</p>
          <p className="days-badge">~{data.daysToReady} days to ready</p>
        </div>
      </div>
      <div className="category-bars">
        {data.categories?.map((cat) => (
          <div key={cat.name} className="category-bar">
            <div className="category-bar-header"><span>{cat.name}</span><strong>{cat.score}</strong></div>
            <div className="progress-bar"><div style={{ width: `${cat.score}%`, background: cat.color }} /></div>
          </div>
        ))}
      </div>
      {data.gaps?.length > 0 && (
        <div className="tip-box">
          <strong>Focus areas:</strong> {data.gaps.join(', ')}
        </div>
      )}
      <div className="milestone-grid">
        {data.milestones?.map((m) => (
          <div key={m.label} className={`milestone ${m.done ? 'done' : ''}`}>
            <span>{m.done ? '✓' : '○'}</span> {m.label}
          </div>
        ))}
      </div>
    </section>
  );
}
