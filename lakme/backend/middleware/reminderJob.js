const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Service = require('../models/Service');
const nodemailer = require('nodemailer');

function startReminderJob() {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Target time = 25 minutes from now
      const targetTime = new Date(now.getTime() + 25 * 60 * 1000);

      // Find bookings in next 25-26 minute window
      const windowStart = new Date(targetTime.getTime() - 30 * 1000); // 30 sec before
      const windowEnd   = new Date(targetTime.getTime() + 30 * 1000); // 30 sec after

      // Get today's confirmed bookings not yet reminded
      const bookings = await Booking.find({
        status: 'confirmed',
        reminderSent: { $ne: true },
        date: {
          $gte: new Date(now.toDateString()), // today
          $lte: new Date(now.toDateString() + ' 23:59:59')
        }
      }).populate('user service');

      for (const booking of bookings) {
        // Convert timeSlot (e.g. "03:00 PM") to today's Date object
        const slotTime = parseTimeSlot(booking.timeSlot, booking.date);
        if (!slotTime) continue;

        // Check if slot falls in our 25-min window
        if (slotTime >= windowStart && slotTime <= windowEnd) {
          await sendReminderEmail(booking);
          // Mark as reminded so we don't send again
          await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });
          console.log(`✅ Reminder sent for booking ${booking._id}`);
        }
      }
    } catch (err) {
      console.error('Reminder job error:', err.message);
    }
  });

  console.log('⏰ Appointment reminder job started');
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

async function sendReminderEmail(booking) {
  if (!process.env.EMAIL_USER) return;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const userName = booking.user?.name || 'Valued Customer';
  const userEmail = booking.user?.email;
  const serviceName = booking.service?.name || 'your service';
  const timeSlot = booking.timeSlot;

  if (!userEmail) return;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: '⏰ Reminder: Your Lakmé Appointment in 25 Minutes!',
    html: `
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px">
        <h2 style="color:#C9A84C">⏰ See You Soon, ${userName}!</h2>
        <p>This is a friendly reminder that your appointment is in <strong>25 minutes</strong>!</p>
        
        <div style="background:#FDF8F0;border-left:4px solid #C9A84C;padding:16px;border-radius:4px;margin:20px 0">
          <p style="margin:0;font-size:16px">📅 <strong>${serviceName}</strong></p>
          <p style="margin:8px 0 0;color:#666">Today at <strong>${timeSlot}</strong></p>
        </div>

        <p>Please make sure you:</p>
        <ul style="color:#555;line-height:2">
          <li>Arrive 5 minutes early</li>
          <li>Bring any reference photos if needed</li>
          <li>Call us if you need to reschedule: <strong>+91 98765 43210</strong></li>
        </ul>

        <p style="background:#f9f9f9;padding:12px;border-radius:8px;text-align:center;color:#C9A84C;font-weight:bold">
          We're looking forward to seeing you! 💄✨
        </p>

        <p style="color:#999;font-size:12px;margin-top:20px">
          Lakmé Salon | +91 98765 43210
        </p>
      </div>
    `
  });
}

module.exports = startReminderJob;