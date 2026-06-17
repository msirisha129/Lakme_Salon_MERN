const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendDailySummaryEmail } = require('./emailService');
const logger = require('../utils/logger');

async function generateAndSendDailySummary() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Fetch new bookings for yesterday
    const newBookings = await Booking.find({
      createdAt: { $gte: yesterday, $lt: today },
      status: 'confirmed'
    }).populate('service', 'name price');

    // Calculate total revenue from new confirmed bookings yesterday
    const totalRevenue = newBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

    // Get all admin users
    const admins = await User.find({ role: 'admin' }).select('email name');

    if (admins.length > 0) {
      for (const admin of admins) {
        await sendDailySummaryEmail({
          toEmail: admin.email,
          toName: admin.name,
          newBookingsCount: newBookings.length,
          totalRevenue: totalRevenue,
          newBookingsList: newBookings.map(b => ({
            service: b.service.name,
            amount: b.totalAmount,
            time: new Date(b.createdAt).toLocaleTimeString('en-IN')
          }))
        });
        logger.info('email', `Daily summary email sent to admin: ${admin.email}`);
      }
    } else {
      logger.warn('app', 'No admin users found to send daily summary email.');
    }

    console.log('✅ Daily summary generated and sent.');
  } catch (err) {
    logger.error('app', `Error generating and sending daily summary: ${err.message}`, { error: err.message });
    console.error('❌ Error generating and sending daily summary:', err.message);
  }
}

function startDailySummaryJob() {
  // Schedule to run every day at 00:05 (5 minutes past midnight)
  cron.schedule('5 0 * * *', generateAndSendDailySummary, { timezone: "Asia/Kolkata" }); // Assuming IST timezone
  console.log('⏰ Daily summary job scheduled.');
}

module.exports = startDailySummaryJob;