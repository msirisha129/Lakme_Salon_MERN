const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Razorpay = require('razorpay'); // Import Razorpay
const crypto = require('crypto');

// @desc    Get current subscription and payment history
// @route   GET /api/billing/info
router.get('/info', protect, adminOnly, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ user: req.user.id });
    const history = await Payment.find({
      user: req.user.id,
    }).sort({ createdAt: -1 });

    // Return default "Free" plan if none exists in DB
    if (!sub) {
      return res.json({ 
        success: true, 
        subscription: { 
          plan: 'Free', 
          status: 'active', 
          renewalDate: null 
        }, 
        history: history || [] 
      });
    }

    res.json({ success: true, subscription: sub, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Initiate Razorpay order for subscription
// @route   POST /api/billing/subscribe
router.post('/subscribe', protect, adminOnly, async (req, res) => {
  const { planName, amount } = req.body;
  try {
    
    // Initialize Razorpay (assuming keys are in environment variables)
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    
    });
    console.log("KEY ID:", process.env.RAZORPAY_KEY_ID);
console.log(
  "KEY SECRET:",
  process.env.RAZORPAY_KEY_SECRET ? "LOADED" : "MISSING"
);

    // Amount needs to be in the smallest currency unit (e.g., paise for INR)
    const razorpayAmount = amount * 100; 
    const currency = 'INR'; // Assuming INR as currency

    const options = {
      amount: razorpayAmount,
      currency: currency,
      receipt: `receipt_sub_${Date.now()}`, // Unique receipt ID
      payment_capture: 1 // Auto capture payment
    };

    const order = await razorpayInstance.orders.create(options);

    // Return necessary details to the frontend to open Razorpay checkout
    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID, // Public key for frontend
      planName: planName
    });
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

// @desc    Verify Razorpay payment signature and update subscription
// @route   POST /api/billing/payment-verify
router.post('/payment-verify', protect, adminOnly, async (req, res) => {
  const { 
    razorpay_payment_id, 
    razorpay_order_id, 
    razorpay_signature, 
    planName, 
    amount 
  } = req.body;

  try {
    console.log('--- Payment Verification Request ---');
    console.log('User ID:', req.user.id);
    console.log('Plan Name:', planName);
    console.log('Amount:', amount);
    console.log('Razorpay Payment ID:', razorpay_payment_id);

    // Verify the payment signature using Razorpay secret
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
      console.log('Signature Verification: FAILED');
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
    console.log('Signature Verification: PASSED');

    // Find existing or create new subscription for the user
    let sub = await Subscription.findOne({ user: req.user.id });
    if (!sub) {
      sub = new Subscription({ user: req.user.id });
    }
    console.log('Subscription document BEFORE update:', sub);

    sub.plan = planName;
    sub.status = "active";
    sub.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    await sub.save();
    console.log('Subscription document AFTER save:', sub);

    // Create a record of the successful payment associated with the user
    const paymentRecord = await Payment.create({
      user: req.user.id,
      transactionId: razorpay_payment_id,
      planName,
      amount,
      status: "success",
    });
    console.log('Payment document created:', paymentRecord);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;