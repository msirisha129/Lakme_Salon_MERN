const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBookingConfirmation({ toEmail, toName, serviceName, date, timeSlot, amount, loyaltyPoints }) {
  try {
    await resend.emails.send({
      from: 'Lakmé Salon <onboarding@resend.dev>',
      to: toEmail,
      subject: '✅ Booking Confirmed — Lakmé Salon',
      html: `
        <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px">
          <h2 style="color:#C9A84C">Booking Confirmed! 🎉</h2>
          <p>Hi ${toName}, your booking is confirmed!</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;color:#999">Service</td><td style="padding:8px;font-weight:bold">${serviceName}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#999">Date</td><td style="padding:8px">${date}</td></tr>
            <tr><td style="padding:8px;color:#999">Time</td><td style="padding:8px">${timeSlot}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#999">Amount</td><td style="padding:8px;color:#C9A84C;font-weight:bold">₹${amount}</td></tr>
          </table>
          <p style="background:#FDF8F0;padding:12px;border-radius:8px;text-align:center">🌟 You earned ${loyaltyPoints} loyalty points!</p>
          <p style="color:#999;font-size:12px">Lakmé Salon | +91 98765 43210</p>
        </div>
      `
    });
    console.log('✅ Email sent to:', toEmail);
    return true;
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    return false;
  }
}

async function sendReminderEmail({ toEmail, toName, serviceName, timeSlot }) {
  try {
    await resend.emails.send({
      from: 'Lakmé Salon <onboarding@resend.dev>',
      to: toEmail,
      subject: '⏰ Reminder: Your Lakmé Appointment in 25 Minutes!',
      html: `
        <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px">
          <h2 style="color:#C9A84C">⏰ See You Soon, ${toName}!</h2>
          <p>Your appointment is in <strong>25 minutes!</strong></p>
          <div style="background:#FDF8F0;border-left:4px solid #C9A84C;padding:16px;border-radius:4px;margin:20px 0">
            <p style="margin:0;font-size:16px">📅 <strong>${serviceName}</strong></p>
            <p style="margin:8px 0 0;color:#666">Today at <strong>${timeSlot}</strong></p>
          </div>
          <p style="color:#999;font-size:12px">Lakmé Salon | +91 98765 43210</p>
        </div>
      `
    });
    console.log('✅ Reminder sent to:', toEmail);
    return true;
  } catch (err) {
    console.error('❌ Reminder failed:', err.message);
    return false;
  }
}

module.exports = { sendBookingConfirmation, sendReminderEmail };