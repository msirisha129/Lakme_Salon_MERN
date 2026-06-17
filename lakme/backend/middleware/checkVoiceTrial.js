const User = require('../models/User');
const Subscription = require('../models/Subscription');

// Middleware to allow up to 2 free voice trials per user when no active subscription
module.exports = async function checkVoiceTrial(req, res, next) {
  try {
    if (!req.user || !req.user._id) return res.status(401).json({ success: false, message: 'Authentication required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    // Check per-user subscription first
    const sub = await Subscription.findOne({ user: req.user._id }) || await Subscription.findOne();
    const hasSubscription = !!(sub && sub.status === 'active');

    console.log('Voice trial count:', user.voiceTrialsUsed);
    console.log('Subscription active:', hasSubscription);

    if (hasSubscription) {
      // Mark on request so downstream middleware can skip subscription checks if necessary
      req.voiceTrialAllowed = true;
      return next();
    }

    // No active subscription: check trial counter
    if ((user.voiceTrialsUsed || 0) < 2) {
      user.voiceTrialsUsed = (user.voiceTrialsUsed || 0) + 1;
      await user.save();
      console.log('Incremented voiceTrialsUsed to:', user.voiceTrialsUsed);
      // allow this request but indicate it was a trial
      req.voiceTrialAllowed = true;
      return next();
    }

    // Trials exhausted
    return res.status(403).json({
      success: false,
      code: 'VOICE_TRIAL_EXPIRED',
      message: 'Your free voice trials are exhausted. Please subscribe to continue using the Voice Assistant.'
    });

  } catch (err) {
    console.error('checkVoiceTrial error:', err && err.message);
    return res.status(500).json({ success: false, message: 'Voice trial check failed' });
  }
};
