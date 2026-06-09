const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const Service = require('../models/Service');
const { protect, adminOnly } = require('../middleware/auth');
const Log = require('../models/Log'); // Import Log model
const { sendBookingConfirmation } = require('../middleware/emailService');
const startReminderJob = require('../middleware/reminderJob');

// Admin: trigger reminder job immediately (for testing)
router.post('/run-reminders', protect, adminOnly, async (req, res) => {
  try {
    if (!startReminderJob || typeof startReminderJob.runNow !== 'function') {
      return res.status(500).json({ success: false, message: 'Reminder runner not available' });
    }
    await startReminderJob.runNow();
    return res.json({ success: true, message: 'Reminder job executed' });
  } catch (err) {
    console.error('Run reminders error:', err && err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Dashboard stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalBookings, confirmedBookings, totalUsers, totalRevenue] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      User.countDocuments({ role: 'user' }),
      Booking.aggregate([
        { $match: { status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const recentBookings = await Booking.find()
      .populate('user', 'name email')
      .populate('service', 'name price')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalBookings, confirmedBookings, totalUsers,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentBookings
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/logs', protect, adminOnly, async (req, res) => {
  try {
    const { type } = req.query;

    // Booking logs → return actual Booking documents (with service + user populated)
    if (type === 'booking') {
      const data = await Booking.find()
        .populate('user', 'name email phone')
        .populate('service', 'name price category')
        .sort({ createdAt: -1 })
        .limit(500);
      return res.json({ success: true, data });
    }

    // User logs → return actual User documents
    if (type === 'user') {
      const data = await User.find({ role: { $in: ['user', 'admin'] } })
        .select('name email phone role loyaltyPoints createdAt')
        .sort({ createdAt: -1 })
        .limit(500);
      return res.json({ success: true, data });
    }

    // Email / Voice / Error / App → query the Log model
    const Log = require('../models/Log');
    let query = {};

    if (type === 'app') {
      // App logs = info + warn from any non-core category
      query = { level: { $in: ['info', 'warn'] }, category: { $nin: ['email', 'voice', 'user'] } };
    } else if (type === 'error') {
      // Error logs = all error-level entries across all categories
      query = { level: 'error' };
    } else if (type === 'security') {
      // Security logs = all security-related entries
      query = { category: 'security' };
    } else if (type) {
      query = { category: type };
    }

    const data = await Log.find(query)
      .sort({ timestamp: -1 })
      .limit(500);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Dev: Send a test booking confirmation email (protected)
router.post('/test-email', protect, async (req, res) => {
  try {
    const { toEmail } = req.body;
    const user = req.user;
    const target = toEmail || user?.email;
    if (!target) return res.status(400).json({ success: false, message: 'toEmail or authenticated user required' });

    const source = 'Admin';
    console.log("BOOKING EMAIL DEBUG", {
      bookingId: null,
      email: target,
      name: user?.name || 'Test User',
      source,
      requestBody: req.body
    });
    const sent = await sendBookingConfirmation({
      toEmail: target,
      toName: user?.name || 'Test User',
      serviceName: 'Test Service',
      date: new Date().toLocaleDateString('en-IN'),
      timeSlot: '12:00 PM',
      amount: '0',
      loyaltyPoints: 0,
      source
    });
    if (sent) return res.json({ success: true, message: 'Test email sent' });
    return res.status(500).json({ success: false, message: 'Failed to send test email' });
  } catch (err) {
    console.error('Test email error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dev-only: Unauthenticated test endpoint (disabled in production)
router.post('/test-email/dev', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Not allowed in production' });
    }
    const { toEmail } = req.body;
    const target = toEmail || process.env.TEST_EMAIL;
    if (!target) return res.status(400).json({ success: false, message: 'toEmail or TEST_EMAIL env required' });

    const source = 'Admin';
    console.log("BOOKING EMAIL DEBUG", {
      bookingId: null,
      email: target,
      name: 'Dev Test',
      source,
      requestBody: req.body
    });
    const sent = await sendBookingConfirmation({
      toEmail: target,
      toName: 'Dev Test',
      serviceName: 'Dev Service',
      date: new Date().toLocaleDateString('en-IN'),
      timeSlot: '12:00 PM',
      amount: '0',
      loyaltyPoints: 0,
      source
    });
    if (sent) return res.json({ success: true, message: 'Dev test email sent' });
    return res.status(500).json({ success: false, message: 'Failed to send dev test email' });
  } catch (err) {
    console.error('Dev test email error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
