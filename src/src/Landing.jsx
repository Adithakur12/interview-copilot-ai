import { useState } from 'react';

const FEATURES = [
  { icon: '🎯', title: 'Company-Specific Prep', desc: 'Tailored questions for Amazon, Google, Microsoft, Adobe, TCS and more.' },
  { icon: '🤖', title: 'AI-Powered Analysis', desc: 'Get instant feedback on your answers with detailed scoring across 4 dimensions.' },
  { icon: '🎙️', title: 'Live Interview Room', desc: 'Voice-to-voice mock interviews where AI asks questions and gives a full review at the end.' },
  { icon: '🎤', title: 'Voice Interviews', desc: 'Practice with real voice-based mock interviews and speech coaching.' },
  { icon: '💻', title: 'DSA Practice', desc: 'Algorithm problems with AI-guided hints and solution evaluation.' },
  { icon: '📊', title: 'Progress Analytics', desc: 'Track your score trends, skill breakdown, and placement readiness.' },
  { icon: '🏆', title: 'Gamification', desc: 'Earn XP, unlock badges, maintain streaks, and climb the leaderboard.' },
  { icon: '📝', title: 'Resume Builder', desc: 'AI-powered resume drafting tailored to your target role.' },
  { icon: '🔗', title: 'Referral Program', desc: 'Invite friends and earn XP bonuses for every successful signup.' },
];

const PRICING = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    features: ['5 mock interviews/month', 'Basic resume analysis', 'DSA practice', 'Progress tracking'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹1,999',
    period: '/year',
    features: ['Unlimited interviews', 'AI-powered analysis', 'Voice interviews', 'Speech coaching', 'Priority support', 'Advanced analytics'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Elite',
    price: '₹4,999',
    period: '/year',
    features: ['Everything in Pro', '1-on-1 coaching sessions', 'Resume review by experts', 'Mock system design interviews', 'Referral bonuses', 'Custom question bank'],
    cta: 'Go Elite',
    popular: false,
  },
];

const TESTIMONIALS = [
  { name: 'Rahul S.', role: 'SDE at Amazon', text: 'The company-specific questions were spot-on. I felt prepared for every round.', avatar: '👨‍💻' },
  { name: 'Priya M.', role: 'SWE at Google', text: 'The voice interview practice was a game-changer. My confidence improved dramatically.', avatar: '👩‍💻' },
  { name: 'Arjun K.', role: 'Engineer at Microsoft', text: 'The AI feedback helped me identify blind spots I never noticed. Landed my dream job!', avatar: '🧑‍💻' },
];

export default function Landing({ onGetStarted, onLogin }) {
  const [activeFaq, setActiveFaq] = useState(null);

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">🎙️ Interview Copilot</div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#faq">FAQ</a>
            <button className="btn-outline" onClick={onLogin}>Sign In</button>
            <button className="btn-primary" onClick={onGetStarted}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">🚀 #1 Interview Prep Platform</div>
          <h1>Ace Your Tech Interviews <span className="gradient-text">with AI</span></h1>
          <p className="hero-subtitle">Practice with company-specific questions, get real-time AI feedback, and track your progress. Join 10,000+ engineers who landed their dream jobs.</p>
          <div className="hero-cta">
            <button className="btn-primary btn-large" onClick={onGetStarted}>Start Free →</button>
            <button className="btn-outline btn-large" onClick={onLogin}>Sign In</button>
          </div>
          <div className="hero-stats-bar">
            <div><strong>10K+</strong><span>Active Users</span></div>
            <div><strong>95%</strong><span>Success Rate</span></div>
            <div><strong>500+</strong><span>Questions</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card-demo">
            <div className="demo-header">Mock Interview · Amazon</div>
            <div className="demo-body">
              <div className="demo-question">"Design a scalable notification service for a high-traffic e-commerce app."</div>
              <div className="demo-score">
                <div className="demo-score-item"><strong>85</strong>Tech</div>
                <div className="demo-score-item"><strong>92</strong>Comm</div>
                <div className="demo-score-item"><strong>78</strong>Conf</div>
                <div className="demo-score-item"><strong>88</strong>Overall</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section">
        <h2>Everything You Need to <span className="gradient-text">Succeed</span></h2>
        <p className="section-subtitle">From resume analysis to voice interviews — all powered by AI.</p>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="landing-section landing-section-alt">
        <h2>How It <span className="gradient-text">Works</span></h2>
        <p className="section-subtitle">Three simple steps to interview readiness.</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Upload Resume</h3>
            <p>Paste your resume and select your target company. Our AI analyzes your profile.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Practice & Learn</h3>
            <p>Answer company-specific questions, solve DSA problems, get instant AI feedback.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Track & Improve</h3>
            <p>Monitor your progress, earn badges, and climb the leaderboard as you improve.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing-section">
        <h2>Simple, <span className="gradient-text">Transparent</span> Pricing</h2>
        <p className="section-subtitle">Start free, upgrade when you're ready.</p>
        <div className="pricing-grid">
          {PRICING.map(p => (
            <div key={p.name} className={`pricing-card ${p.popular ? 'pricing-popular' : ''}`}>
              {p.popular && <div className="popular-badge">Most Popular</div>}
              <h3>{p.name}</h3>
              <div className="pricing-price">
                <span className="price-amount">{p.price}</span>
                <span className="price-period">{p.period}</span>
              </div>
              <ul className="pricing-features">
                {p.features.map(f => <li key={f}>✓ {f}</li>)}
              </ul>
              <button className={p.popular ? 'btn-primary btn-large' : 'btn-outline btn-large'} onClick={onGetStarted}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="landing-section landing-section-alt">
        <h2>What Users <span className="gradient-text">Say</span></h2>
        <p className="section-subtitle">Join thousands who transformed their interview prep.</p>
        <div className="testimonials-grid">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="testimonial-card">
              <span className="testimonial-avatar">{t.avatar}</span>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <strong>{t.name}</strong>
                <span>{t.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section">
        <h2>Frequently Asked <span className="gradient-text">Questions</span></h2>
        <div className="faq-list">
          {[
            { q: 'Is the free plan really free?', a: 'Yes! The Free plan includes 5 mock interviews per month, basic resume analysis, and DSA practice — no credit card required.' },
            { q: 'How does the AI scoring work?', a: 'Our AI evaluates your answers across 4 dimensions: technical knowledge, communication, confidence, and problem-solving. Each dimension gets a score out of 100.' },
            { q: 'Can I practice for specific companies?', a: 'Absolutely. We support Amazon, Google, Microsoft, Adobe, TCS, and more. Questions are tailored to each company\'s interview style.' },
            { q: 'What if I don\'t have a resume?', a: 'No problem! You can use our AI Resume Builder to create one from scratch, or just start practicing directly.' },
            { q: 'Can I cancel my subscription?', a: 'Yes, you can cancel anytime. Your access continues until the end of the billing period.' },
          ].map((faq, i) => (
            <div key={i} className={`faq-item ${activeFaq === i ? 'faq-open' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
              <div className="faq-question">
                <span>{faq.q}</span>
                <span className="faq-arrow">{activeFaq === i ? '−' : '+'}</span>
              </div>
              {activeFaq === i && <div className="faq-answer">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="cta-content">
          <h2>Ready to Ace Your Interview?</h2>
          <p>Join 10,000+ engineers who improved their interview skills with AI-powered practice.</p>
          <button className="btn-primary btn-large" onClick={onGetStarted}>Get Started Free →</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div>
            <div className="landing-logo">🎙️ Interview Copilot</div>
            <p>AI-powered interview preparation platform. Land your dream tech job.</p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Testimonials</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Blog</a>
            <a href="#">Contact</a>
          </div>
          <div>
            <h4>Legal</h4>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
        <div className="footer-bottom">© 2026 Interview Copilot. All rights reserved.</div>
      </footer>
    </div>
  );
}
