import { useState, useEffect } from 'react';

export default function AdminDashboard({ token, onBack }) {
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (token) fetchDashboard();
  }, [token]);

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/admin/dashboard', { headers });
      if (!res.ok) throw new Error('Not authorized');
      setDashboard(await res.json());
    } catch (err) {
      setDashboard({ error: err.message });
    }
  }

  if (!dashboard) return <div className="loading">Loading admin panel...</div>;
  if (dashboard.error) return <div className="error-card">Admin access required. Sign in as admin@interviewcopilot.com</div>;

  const { stats } = dashboard;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>📊 Admin Dashboard</h1>
        <button className="btn-outline" onClick={onBack}>← Back to App</button>
      </div>

      <div className="tab-row">
        {['overview', 'users', 'questions', 'revenue'].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewPanel data={dashboard} headers={headers} />}
      {activeTab === 'users' && <UsersPanel headers={headers} />}
      {activeTab === 'questions' && <QuestionsPanel headers={headers} />}
      {activeTab === 'revenue' && <RevenuePanel headers={headers} />}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div className="stat-info">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function OverviewPanel({ data, headers }) {
  const { stats, recentUsers } = data;

  return (
    <div className="admin-content">
      <div className="stats-grid">
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} />
        <StatCard icon="🎙️" label="Interviews" value={stats.totalInterviews} />
        <StatCard icon="💎" label="Premium" value={stats.premiumUsers} />
        <StatCard icon="💰" label="Revenue" value={`$${stats.totalRevenue?.toFixed(0) || '0'}`} />
        <StatCard icon="📈" label="Avg Score" value={stats.avgScore} />
        <StatCard icon="🔥" label="Active Today" value={stats.activeToday} />
      </div>

      <div className="card">
        <h3>Plan Distribution</h3>
        <div className="plan-bars">
          {[
            { name: 'Free', value: stats.freeUsers, total: stats.totalUsers, cls: 'free' },
            { name: 'Pro', value: stats.proUsers, total: stats.totalUsers, cls: 'pro' },
            { name: 'Elite', value: stats.eliteUsers, total: stats.totalUsers, cls: 'elite' },
          ].map(p => (
            <div key={p.name} className="plan-bar-row">
              <span>{p.name}</span>
              <div className="plan-bar-track">
                <div className={`plan-bar-fill ${p.cls}`} style={{ width: `${(p.value / Math.max(1, p.total)) * 100}%` }} />
              </div>
              <strong>{p.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Recent Users</h3>
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Plan</th><th>XP</th><th>Level</th></tr>
          </thead>
          <tbody>
            {recentUsers.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`plan-badge ${u.plan.toLowerCase()}`}>{u.plan}</span></td>
                <td>{u.xp}</td>
                <td>{u.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersPanel({ headers }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`/api/admin/users?page=${page}&limit=10&search=${search}`, { headers })
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setTotal(d.total || 0); })
      .catch(() => {});
  }, [page, search]);

  return (
    <div className="admin-content">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>All Users ({total})</h3>
          <input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="search-input" />
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Plan</th><th>XP</th><th>Level</th><th>Streak</th><th>Interviews</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`plan-badge ${u.plan.toLowerCase()}`}>{u.plan}</span></td>
                <td>{u.xp}</td>
                <td>{u.level}</td>
                <td>{u.streak}🔥</td>
                <td>{u.interviewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page} of {Math.ceil(total / 10)}</span>
          <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}

function QuestionsPanel({ headers }) {
  const [questions, setQuestions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ company: 'Amazon', category: 'behavioral', difficulty: 'medium', question: '', expectedAnswer: '' });

  useEffect(() => {
    fetch(`/api/admin/questions?page=${page}&limit=10`, { headers })
      .then(r => r.json())
      .then(d => { setQuestions(d.questions || []); setTotal(d.total || 0); })
      .catch(() => {});
  }, [page]);

  async function addQuestion() {
    if (!form.question) return;
    await fetch('/api/admin/questions', { method: 'POST', headers, body: JSON.stringify(form) });
    setForm({ company: 'Amazon', category: 'behavioral', difficulty: 'medium', question: '', expectedAnswer: '' });
    const res = await fetch(`/api/admin/questions?page=1&limit=10`, { headers });
    const d = await res.json();
    setQuestions(d.questions || []);
    setPage(1);
  }

  async function deleteQuestion(id) {
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE', headers });
    setQuestions(q => q.filter(x => x.id !== id));
  }

  return (
    <div className="admin-content">
      <div className="card">
        <h3>Question Bank ({total})</h3>
        <div className="add-question-form">
          <h4>Add New Question</h4>
          <div className="form-row">
            <select value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}>
              {['Amazon', 'Google', 'Microsoft', 'Adobe', 'TCS'].map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {['behavioral', 'system_design', 'algorithms', 'leadership'].map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
              {['easy', 'medium', 'hard'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <textarea placeholder="Question..." value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} rows={2} />
          <textarea placeholder="Expected answer (optional)..." value={form.expectedAnswer} onChange={e => setForm({ ...form, expectedAnswer: e.target.value })} rows={2} />
          <button onClick={addQuestion}>Add Question</button>
        </div>

        <table className="admin-table">
          <thead>
            <tr><th>Company</th><th>Category</th><th>Diff</th><th>Question</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {questions.map(q => (
              <tr key={q.id}>
                <td>{q.company}</td>
                <td>{q.category?.replace('_', ' ')}</td>
                <td><span className={`diff-badge ${q.difficulty}`}>{q.difficulty}</span></td>
                <td><span className="q-text">{q.question.substring(0, 60)}...</span></td>
                <td><button className="btn-small danger" onClick={() => deleteQuestion(q.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page} of {Math.ceil(total / 10)}</span>
          <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}

function RevenuePanel({ headers }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/admin/revenue', { headers }).then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="loading">Loading revenue...</div>;

  return (
    <div className="admin-content">
      <div className="stats-grid">
        <StatCard icon="💰" label="Total Revenue" value={`$${data.totalRevenue?.toFixed(0)}`} />
        <StatCard icon="📄" label="Transactions" value={data.totalPayments} />
        {data.byPlan?.map(p => (
          <StatCard key={p.plan} icon="💳" label={`${p.plan} Plans`} value={`${p.count} sold`} />
        ))}
      </div>
      <div className="card">
        <h3>Revenue by Month</h3>
        <table className="admin-table">
          <thead><tr><th>Month</th><th>Sales</th><th>Revenue</th></tr></thead>
          <tbody>
            {data.byMonth?.map(m => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td>{m.count}</td>
                <td>${m.revenue?.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
