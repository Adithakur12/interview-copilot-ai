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

    const db = getDbClient();
    await db.run('INSERT INTO payments (id, user_id, stripe_session_id, plan, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), user.id, session.id, plan, PLANS[plan]?.price || 0, 'usd', 'pending']);

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Stripe session creation failed:', error.message);
    return upgradePlanDirect(user.email, plan);
  }
}

async function handleStripeWebhook(event) {
  const db = getDbClient();
  const stripe = getStripe();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { user_id, plan } = session.metadata;

      await db.run('UPDATE payments SET status = ? WHERE stripe_session_id = ?', ['completed', session.id]);

      const user = await db.get('SELECT * FROM users WHERE id = ?', [user_id]);
      if (user) {
        await db.run("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE id = ?", [plan, user_id]);
        await awardXP(user_id, plan === 'Elite' ? 250 : 100, `${plan} plan upgrade`);
        await createNotification(user_id, 'payment', 'Plan Upgraded', `You've been upgraded to the ${plan} plan!`);
      }
      break;
    }
    case 'checkout.session.expired': {
      const expired = event.data.object;
      await db.run('UPDATE payments SET status = ? WHERE stripe_session_id = ?', ['expired', expired.id]);
      break;
    }
  }
}

async function upgradePlanDirect(email, plan) {
  const db = getDbClient();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new Error('User not found');

  await db.run("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE email = ?", [plan, email]);

  await db.run('INSERT INTO payments (id, user_id, plan, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), user.id, plan, PLANS[plan]?.price || 0, 'usd', 'completed']);

  const xpAmount = plan === 'Elite' ? 250 : 100;
  await awardXP(user.id, xpAmount, `${plan} plan upgrade`);
  await createNotification(user.id, 'payment', 'Plan Upgraded', `You've been upgraded to the ${plan} plan!`);

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

async function getPaymentHistory(userId) {
  const db = getDbClient();
  return await db.all('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]);
}

module.exports = {
  PLANS,
  getPlanPrice,
  createCheckoutSession,
  handleStripeWebhook,
  upgradePlanDirect,
  getPaymentHistory,
};
