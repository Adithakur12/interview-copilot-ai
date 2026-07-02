const { getDbClient } = require('../db/database');

const { v4: uuidv4 } = require('uuid');
const { awardXP, createNotification } = require('./gamification');

const PLANS = {
  Free: { price: 0, features: ['Basic resume analysis', '5 mock interviews/month', 'DSA practice'] },
  Pro: { price: 1999, stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro', features: ['Unlimited interviews', 'AI-powered analysis', 'Voice interviews', 'Speech coaching', 'Priority support'] },
  Elite: { price: 4999, stripePriceId: process.env.STRIPE_ELITE_PRICE_ID || 'price_elite', features: ['Everything in Pro', '1-on-1 coaching sessions', 'Resume review', 'Mock system design interviews', 'Referral bonuses'] },
};

function getPlanPrice(plan) {
  return PLANS[plan]?.price || 0;
}

async function createCheckoutSession(user, plan) {
  const stripe = getStripe();
  if (!stripe) {
    // Fallback: upgrade directly without payment (for development)
    return upgradePlanDirect(user.email, plan);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Interview Copilot - ${plan} Plan`,
            description: PLANS[plan]?.features?.join(', ') || '',
          },
          unit_amount: PLANS[plan]?.price || 0,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        plan,
      },
    });

    // Record payment
    const db = getDb();
    db.prepare(`INSERT INTO payments (id, user_id, stripe_session_id, plan, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), user.id, session.id, plan, PLANS[plan]?.price || 0, 'usd', 'pending'
    );

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Stripe session creation failed:', error.message);
    // Fallback
    return upgradePlanDirect(user.email, plan);
  }
}

async function handleStripeWebhook(event) {
  const db = getDb();
  const stripe = getStripe();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { user_id, plan } = session.metadata;

      // Update payment status
      db.prepare('UPDATE payments SET status = ? WHERE stripe_session_id = ?').run('completed', session.id);

      // Upgrade user plan
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
      if (user) {
        db.prepare('UPDATE users SET plan = ?, updated_at = datetime(\'now\') WHERE id = ?').run(plan, user_id);
        awardXP(user_id, plan === 'Elite' ? 250 : 100, `${plan} plan upgrade`);
        createNotification(user_id, 'payment', 'Plan Upgraded', `You've been upgraded to the ${plan} plan!`);
      }
      break;
    }
    case 'checkout.session.expired': {
      const expired = event.data.object;
      db.prepare('UPDATE payments SET status = ? WHERE stripe_session_id = ?').run('expired', expired.id);
      break;
    }
  }
}

function upgradePlanDirect(email, plan) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) throw new Error('User not found');

  db.prepare('UPDATE users SET plan = ?, updated_at = datetime(\'now\') WHERE email = ?').run(plan, email);

  // Record payment
  db.prepare(`INSERT INTO payments (id, user_id, plan, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), user.id, plan, PLANS[plan]?.price || 0, 'usd', 'completed'
  );

  const xpAmount = plan === 'Elite' ? 250 : 100;
  awardXP(user.id, xpAmount, `${plan} plan upgrade`);
  createNotification(user.id, 'payment', 'Plan Upgraded', `You've been upgraded to the ${plan} plan!`);

  return { success: true, plan };
}

function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return null;
  try {
    const Stripe = require('stripe');
    return new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  } catch {
    return null;
  }
}

function getPaymentHistory(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(userId);
}

module.exports = {
  PLANS,
  getPlanPrice,
  createCheckoutSession,
  handleStripeWebhook,
  upgradePlanDirect,
  getPaymentHistory,
};
