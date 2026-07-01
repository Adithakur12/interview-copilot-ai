import { useEffect, useState } from 'react';

export default function SpacedRepetition({ apiGet, apiPost, runApi }) {
  const [plan, setPlan] = useState(null);

  const load = () => {
    apiGet('/api/interview/spaced-repetition').then(setPlan).catch(() => setPlan(null));
  };

  useEffect(() => { load(); }, []);

  const complete = async (topic) => {
    await runApi(() => apiPost('/api/interview/spaced-repetition/complete', { topic }));
    load();
  };

  if (!plan) return <div className="card shimmer-card"><p>Loading spaced repetition plan...</p></div>;

  return (
    <section className="card feature-card-accent">
      <div className="section-title"><h2>DSA Spaced Repetition</h2><span className="pill">Weak Topics</span></div>
      <p className="hint">{plan.streakBonus}</p>
      {plan.nextReview && (
        <div className="next-review-box">
          <strong>Today's focus: {plan.nextReview.topic}</strong>
          <p>{plan.nextReview.problem}</p>
          <button className="btn-outline" onClick={() => complete(plan.nextReview.topic)}>Mark Complete</button>
        </div>
      )}
      <div className="queue-list">
        {plan.queue?.map((item) => (
          <div key={item.topic} className={`queue-item priority-${item.priority}`}>
            <span>{item.topic}</span>
            <small>Due in {item.dueInDays}d · {item.priority}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
