import { useState } from 'react';

const GOALS = ['Land my first job', 'Switch companies', 'Get promoted', 'Internship offer'];
const ROLES = ['Software Engineer', 'Full Stack Developer', 'Backend Engineer', 'Frontend Engineer', 'Data Engineer'];
const TIMELINES = ['2 weeks', '30 days', '60 days', '90 days'];

export default function OnboardingWizard({ onComplete, defaultCompany = 'Amazon' }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    goal: GOALS[0],
    role: ROLES[0],
    company: defaultCompany,
    timeline: TIMELINES[1]
  });

  const steps = ['Your Goal', 'Target Role', 'Dream Company', 'Timeline'];

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete(profile);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card animate-in">
        <div className="onboarding-header">
          <span className="onboarding-icon">🚀</span>
          <h2>Welcome to Interview Copilot</h2>
          <p>Let's personalize your prep journey in 4 quick steps.</p>
        </div>
        <div className="onboarding-progress">
          {steps.map((label, i) => (
            <div key={label} className={`onboarding-dot ${i <= step ? 'active' : ''}`}>
              <span>{i + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>
        <div className="onboarding-body">
          {step === 0 && (
            <div className="option-grid">
              {GOALS.map((g) => (
                <button key={g} type="button" className={`option-card ${profile.goal === g ? 'selected' : ''}`} onClick={() => setProfile({ ...profile, goal: g })}>{g}</button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="option-grid">
              {ROLES.map((r) => (
                <button key={r} type="button" className={`option-card ${profile.role === r ? 'selected' : ''}`} onClick={() => setProfile({ ...profile, role: r })}>{r}</button>
              ))}
            </div>
          )}
          {step === 2 && (
            <input placeholder="Target company (e.g. Amazon)" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
          )}
          {step === 3 && (
            <div className="option-grid">
              {TIMELINES.map((t) => (
                <button key={t} type="button" className={`option-card ${profile.timeline === t ? 'selected' : ''}`} onClick={() => setProfile({ ...profile, timeline: t })}>{t}</button>
              ))}
            </div>
          )}
        </div>
        <div className="button-row">
          {step > 0 && <button type="button" className="btn-outline" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="button" onClick={next}>{step === steps.length - 1 ? 'Start My Journey →' : 'Continue'}</button>
        </div>
      </div>
    </div>
  );
}
