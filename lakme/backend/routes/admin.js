const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const Service = require('../models/Service');
const { protect, adminOnly } = require('../middleware/auth');

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
    
    if (type === 'booking') {
      const logs = await Booking.find()
        .populate('user', 'name email phone')
        .populate('service', 'name price category')
        .sort({ createdAt: -1 })
        .limit(500);
      return res.json({ success: true, data: logs });
    }

    if (type === 'user') {
      const User = require('../models/User');
      const logs = await User.find()
        .select('name email phone role loyaltyPoints createdAt')
        .sort({ createdAt: -1 })
        .limit(500);
      return res.json({ success: true, data: logs });
    }

    if (type === 'error' || type === 'app') {
      // Read from log file
      const fs = require('fs');
      const path = require('path');
      const logFile = path.join(__dirname, '../logs', `${type}.log`);
      
      if (!fs.existsSync(logFile)) {
        return res.json({ success: true, data: [] });
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean).reverse().slice(0, 200);
      const parsed = lines.map(line => {
        try { return JSON.parse(line); }
        catch { return { timestamp: new Date(), level: type, message: line, details: '' }; }
      });
      return res.json({ success: true, data: parsed });
    }

    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
