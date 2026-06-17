const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Subscription = require('./Subscription');
const Payment = require('./Payment');

// @desc    Get current subscription and payment history
// @route   GET /api/billing/info
router.get('/info', protect, adminOnly, async (req, res) => {
  try {
    let sub = await Subscription.findOne();
    if (!sub) {
      sub = await Subscription.create({ 
        plan: 'Free', 
        status: 'active', 
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
      });
    }
    const history = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, subscription: sub, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Change/Upgrade subscription
// @route   POST /api/billing/subscribe
router.post('/subscribe', protect, adminOnly, async (req, res) => {
  const { planName, amount } = req.body;
  try {
    let sub = await Subscription.findOne();
    if (!sub) sub = new Subscription();
    
    sub.plan = planName;
    sub.status = 'active';
    sub.voiceCallsUsed = 0; // Reset counter on upgrade
    sub.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await sub.save();

    // Log Payment
    await Payment.create({
      transactionId: 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      planName,
      amount,
      status: 'success'
    });

    res.json({ success: true, message: `Successfully subscribed to ${planName} plan.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Cancel subscription
// @route   POST /api/billing/cancel
router.post('/cancel', protect, adminOnly, async (req, res) => {
  try {
    const sub = await Subscription.findOne();
    if (sub) {
      sub.status = 'cancelled';
      await sub.save();
    }
    res.json({ success: true, message: 'Subscription cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;