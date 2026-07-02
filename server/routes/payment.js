const express = require('express');
const { getDbClient } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { createCheckoutSession, upgradePlanDirect, getPaymentHistory, handleStripeWebhook, PLANS } = require('../services/payments');

const router = express.Router();

// Get available plans
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// Create checkout session
router.post('/checkout', authenticate, async (req, res) => {
  const { plan } = req.body;
  if (!plan || !PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  if (PLANS[plan].price === 0) {
    // Free plan - just update
    const db = getDbClient();
    await db.run('UPDATE users SET plan = ?, updated_at = datetime(\'now\') WHERE id = ?', [plan, req.user.id]);
    return res.json({ success: true, plan, message: 'Free plan activated.' });
  }

  try {
    const result = await createCheckoutSession(req.user, plan);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});


// Direct upgrade (for development / when Stripe is not configured)
router.post('/upgrade', authenticate, async (req, res) => {
  const { plan } = req.body;
  if (!plan || !PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  const result = await upgradePlanDirect(req.user.email, plan);
  res.json(result);
});

// Payment history
router.get('/history', authenticate, async (req, res) => {
  const history = await getPaymentHistory(req.user.id);
  res.json(history);
});

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(200).json({ received: true });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  await handleStripeWebhook(event);
  res.json({ received: true });
});

function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return null;
  try {
    const Stripe = require('stripe');
    return new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  } catch { return null; }
}

module.exports = router;
