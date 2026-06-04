const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Service = require('../models/Service');
const { sendReminderEmail } = require('./emailService');

async function processReminders() {
  try {
    const now = new Date();

    // Target time = 25 minutes from now
    const targetTime = new Date(now.getTime() + 25 * 60 * 1000);

    // Find bookings in next 25-26 minute window
    const windowStart = new Date(targetTime.getTime() - 30 * 1000); // 30 sec before
    const windowEnd   = new Date(targetTime.getTime() + 30 * 1000); // 30 sec after

    // Get today's confirmed bookings not yet reminded
    const startOfDay = new Date(now);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23,59,59,999);

    const bookings = await Booking.find({
      status: 'confirmed',
      reminderSent: { $ne: true },
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('user service');

    for (const booking of bookings) {
      // Convert timeSlot (e.g. "03:00 PM") to today's Date object
      const slotTime = parseTimeSlot(booking.timeSlot, booking.date);
      if (!slotTime) continue;

      // Check if slot falls in our 25-min window
      if (slotTime >= windowStart && slotTime <= windowEnd) {
        const sent = await sendReminderForBooking(booking);
        if (sent) {
          // Mark as reminded so we don't send again
          await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });
          console.log(`✅ Reminder sent for booking ${booking._id}`);
        } else {
          console.warn(`⚠️ Reminder not sent for booking ${booking._id}`);
        }
      }
    }
  } catch (err) {
    console.error('Reminder job error:', err && err.message ? err.message : err);
  }
}

function startReminderJob() {
  // Runs every minute
  const task = cron.schedule('* * * * *', () => { processReminders(); });
  console.log('⏰ Appointment reminder job started');
  // expose stop method so callers can cancel it when shutting down
  return task;
}

function parseTimeSlot(timeSlot, bookingDate) {
  try {
    // e.g. "03:00 PM" → Date object
    const [time, meridiem] = timeSlot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const date = new Date(bookingDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  } catch {
    return null;
  }
}

// delegate email sending to shared email service
async function sendReminderForBooking(booking) {
  const userEmail = booking.user?.email || booking.guestEmail;
  if (!userEmail) return false;
  const userName = booking.user?.name || booking.guestName || 'Valued Customer';
  const serviceName = booking.service?.name || 'your service';
  const timeSlot = booking.timeSlot;
  return await sendReminderEmail({ toEmail: userEmail, toName: userName, serviceName, timeSlot });
}

// attach manual runner for admin-triggered tests
startReminderJob.runNow = processReminders;
startReminderJob.processReminders = processReminders;
module.exports = startReminderJob;