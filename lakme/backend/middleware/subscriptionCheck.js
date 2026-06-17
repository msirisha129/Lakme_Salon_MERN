const Subscription = require('../models/Subscription');

const planRanks = {
  'Starter': 0,
  'Growth': 1,
  'Premium': 2
};

const checkPlan = (requiredPlan) => {
  return async (req, res, next) => {
    try {
      // Prefer per-user subscription when user is authenticated
      let sub = null;
      if (req.user && req.user._id) {
        sub = await Subscription.findOne({ user: req.user._id });
      }
      // Fallback to global subscription document if no user-scoped one exists
      if (!sub) {
        sub = await Subscription.findOne();
      }

      // Allow skipping subscription enforcement when a prior middleware
      // (e.g. checkVoiceTrial) explicitly set this flag for trial users.
      if (req.voiceTrialAllowed) return next();

      if (!sub || sub.status !== 'active') {
        return res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Please subscribe to use this feature.'
        });
      }

      if (planRanks[sub.plan] < planRanks[requiredPlan]) {
        return res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Please subscribe to use this feature.'
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ success: false, message: 'Subscription validation failed.' });
    }
  };
};

module.exports = { checkPlan };