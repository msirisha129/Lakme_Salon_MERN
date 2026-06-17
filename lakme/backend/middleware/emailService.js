const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const logger = require('../utils/logger');

const hasResend = !!process.env.RESEND_API_KEY;
let resend;
if (hasResend) {
  try { resend = new Resend(process.env.RESEND_API_KEY); } catch (e) { resend = null; }
}

const hasBrevo = !!process.env.BREVO_API_KEY;

async function _sendWithResend({ from, to, subject, html }) {
  if (!resend) throw new Error('Resend not configured');
  return await resend.emails.send({ from, to, subject, html });
}

async function _sendWithBrevo({ from, to, subject, html }) {
  if (!process.env.BREVO_API_KEY) throw new Error('Brevo API key not configured');
  const payload = {
    sender: { name: from.split('<')[0].trim(), email: (from.match(/<([^>]+)>/) || [])[1] || from },
    to: [{ email: to }],
    subject,
    htmlContent: html
  };

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`Brevo send failed: ${resp.status} ${text}`);
    err.status = resp.status;
    throw err;
  }
  return await resp.json();
}

async function _sendWithSMTP({ from, to, subject, html }) {
  if (!process.env.EMAIL_USER) throw new Error('SMTP not configured');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  return await transporter.sendMail({ from, to, subject, html });
}

async function sendBookingConfirmation({ toEmail, toName, serviceName, date, timeSlot, amount, loyaltyPoints, source }) {
        const from = process.env.EMAIL_FROM || 'Lakmé Salon <no-reply@lakme.example.com>';
        const subject = '✅ Booking Confirmed — Lakmé Salon';
        // sanitize source: only allow known sources to avoid incorrect badges
        const allowedSources = {
          'Voice Assistant': 'Voice Assistant',
          'Chat Assistant': 'Chat Assistant',
          'Website': 'Website',
          'Admin': 'Admin'
        };
        const displaySource = allowedSources[source] || null;
        const badge = `<div style="margin-top:6px;display:inline-block;background:linear-gradient(90deg,#f8f2e6,#fff7ec);color:#7a5a2a;padding:6px 10px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.3px">Booking Confirmed</div>`;
        const html = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width:680px; margin:auto; padding:28px; background: #ffffff; border:1px solid #f1e9de; border-radius:12px;">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
              <div style="width:56px;height:56px;border-radius:8px;background:linear-gradient(135deg,#f6e7c9,#f0d9b0);display:flex;align-items:center;justify-content:center;font-weight:700;color:#7a5a2a">LK</div>
              <div>
                <h1 style="margin:0;font-size:20px;color:#2b2b2b;letter-spacing:0.2px">Booking Confirmed</h1>
                <p style="margin:2px 0 0;color:#8a8a8a;font-size:13px">Thank you, ${toName} — we look forward to pampering you.</p>
                ${badge}
              </div>
            </div>
            <div style="border-radius:10px;padding:18px;border:1px solid #fbf1e6;background:#fffdfa">
              <p style="margin:0 0 8px;color:#8a7a5f;font-size:13px">${serviceName}</p>
              <p style="margin:0;color:#2b2b2b;font-weight:600;font-size:16px">${date} · ${timeSlot}</p>
              <p style="margin:12px 0 0;color:#c79f49;font-weight:700;font-size:16px">₹${amount}</p>
            </div>
            <div style="margin-top:18px;display:flex;gap:12px;align-items:center">
              <a href="#" style="background:#c9a84c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Manage Booking</a>
              <span style="color:#9b9b9b;font-size:13px">Reference: <strong style="color:#2b2b2b">#${Math.floor(Math.random()*900000+100000)}</strong></span>
            </div>
            <p style="margin-top:18px;color:#9b9b9b;font-size:12px">Need to reschedule or cancel? Reply to this email or call +91 98765 43210</p>
            <hr style="border:none;border-top:1px solid #f3ebe0;margin:18px 0">
            <p style="color:#9b9b9b;font-size:12px;margin:0">Lakmé Salon — Luxury hair & beauty services</p>
          </div>
        `;
  

  try {
    console.log('sendBookingConfirmation called:', { to: toEmail, name: toName, serviceName, date, timeSlot, amount, source: source || null });
    
    let sent = false;
    let errors = [];

    // 1. Try Brevo
    if (hasBrevo) {
      try {
        await _sendWithBrevo({ from, to: toEmail, subject, html });
        console.log('EMAIL SENT (Brevo) TO:', toEmail);
        sent = true;
      } catch (brevoErr) {
        console.error('Brevo send failed, trying fallbacks...', brevoErr.message);
        errors.push(`Brevo: ${brevoErr.message}`);
      }
    }

    // 2. Try Resend
    if (!sent && hasResend && resend) {
      try {
        await _sendWithResend({ from, to: toEmail, subject, html });
        console.log('EMAIL SENT (Resend) TO:', toEmail);
        sent = true;
      } catch (resendErr) {
        console.error('Resend send failed, trying fallbacks...', resendErr.message);
        errors.push(`Resend: ${resendErr.message}`);
      }
    }

    // 3. Try SMTP
    if (!sent && process.env.EMAIL_USER) {
      try {
        await _sendWithSMTP({ from, to: toEmail, subject, html });
        console.log('EMAIL SENT (SMTP) TO:', toEmail);
        sent = true;
      } catch (smtpErr) {
        console.error('SMTP send failed:', smtpErr.message);
        errors.push(`SMTP: ${smtpErr.message}`);
      }
    }

    if (!sent) {
      if (errors.length > 0) {
        const errMsg = `No email provider succeeded. Attempted providers: ${errors.join(', ')}`;
        console.warn(errMsg);
        await logger.warn('email', errMsg, { toEmail, serviceName });
      } else {
        const noProviderMsg = 'No email provider configured (BREVO_API_KEY, RESEND_API_KEY or EMAIL_USER)';
        console.warn(noProviderMsg);
        await logger.warn('email', noProviderMsg, { toEmail, serviceName });
      }
      return false;
    }

    console.log('✅ Booking email sent to:', toEmail);
    await logger.info('email', `Booking confirmation sent to ${toEmail}`, { toEmail, toName, serviceName, date, timeSlot, amount, source: source || null });
    return true;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error('❌ Booking email failed:', msg);
    await logger.error('email', `Booking email failed: ${msg}`, { toEmail, serviceName });
    return false;
  }
}

async function sendReminderEmail({ toEmail, toName, serviceName, timeSlot }) {
  const from = process.env.EMAIL_FROM || 'Lakmé Salon <no-reply@lakme.example.com>';
  const subject = '⏰ Reminder: Your Lakmé Appointment in 25 Minutes!';
  const html = `
    <div style="font-family:'Helvetica Neue', Arial, sans-serif; max-width:680px;margin:auto;padding:20px;background:#fff;border:1px solid #f7efe3;border-radius:10px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,#f6e7c9,#f0d9b0);display:flex;align-items:center;justify-content:center;font-weight:700;color:#7a5a2a">LK</div>
        <div>
          <h2 style="margin:0;font-size:16px;color:#2b2b2b">⏰ Reminder — ${toName}</h2>
          <p style="margin:2px 0 0;color:#8a8a8a;font-size:13px">Your ${serviceName} is coming up soon.</p>
        </div>
      </div>
      <div style="margin-top:12px;padding:12px;border-radius:8px;background:#fffdfa;border:1px solid #fbf1e6">
        <p style="margin:0;font-weight:600;color:#2b2b2b">${serviceName}</p>
        <p style="margin:6px 0 0;color:#7a7a7a">Today · <strong style="color:#2b2b2b">${timeSlot}</strong></p>
      </div>
      <p style="margin-top:12px;color:#9b9b9b;font-size:12px">If you need to modify your booking, reply or call +91 98765 43210.</p>
    </div>
  `;

  try {
    if (hasBrevo) {
      await _sendWithBrevo({ from, to: toEmail, subject, html });
    } else if (hasResend && resend) {
      await _sendWithResend({ from, to: toEmail, subject, html });
    } else if (process.env.EMAIL_USER) {
      await _sendWithSMTP({ from, to: toEmail, subject, html });
    } else {
      const noProviderMsg = 'No email provider configured (BREVO_API_KEY, RESEND_API_KEY or EMAIL_USER)';
      console.warn(noProviderMsg);
      await logger.warn('email', noProviderMsg, { toEmail, type: 'reminder' });
      return false;
    }
    console.log('✅ Reminder email sent to:', toEmail);
    await logger.info('email', `Reminder email sent to ${toEmail}`, { toEmail, toName, serviceName, timeSlot });
    return true;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error('❌ Reminder email failed:', msg);
    await logger.error('email', `Reminder email failed: ${msg}`, { toEmail });
    return false;
  }
}

async function sendDailySummaryEmail({ toEmail, toName, newBookingsCount, totalRevenue, newBookingsList }) {
  const from = process.env.EMAIL_FROM || 'Lakmé Salon <no-reply@lakmesalon.com>';
  const subject = '📊 Daily Summary - Lakmé Salon Admin';

  const body = `
    <p>Hello ${toName.split(' ')[0]},</p>
    <p>Here's your daily summary for new confirmed bookings and revenue from yesterday:</p>
    ${createDataGrid([
      { label: "New Bookings", value: newBookingsCount },
      { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}` }
    ])}
    ${newBookingsList.length > 0 ? `
      <p><strong>New Bookings Details:</strong></p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f8f8f8;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Service</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Amount</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${newBookingsList.map(booking => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${booking.service}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">₹${booking.amount.toLocaleString()}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${booking.time}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p>No new confirmed bookings yesterday.</p>'}
    <p style="margin-top: 20px;">Have a productive day!</p>
  `;

  try {
    let sent = false;
    let errors = [];

    if (hasBrevo) {
      try { await _sendWithBrevo({ from, to: toEmail, subject, html: createEmailTemplate({ title: "Daily Admin Summary", body }) }); sent = true; }
      catch (brevoErr) { errors.push(`Brevo: ${brevoErr.message}`); }
    }
    if (!sent && hasResend && resend) {
      try { await _sendWithResend({ from, to: toEmail, subject, html: createEmailTemplate({ title: "Daily Admin Summary", body }) }); sent = true; }
      catch (resendErr) { errors.push(`Resend: ${resendErr.message}`); }
    }
    if (!sent && process.env.EMAIL_USER) {
      try { await _sendWithSMTP({ from, to: toEmail, subject, html: createEmailTemplate({ title: "Daily Admin Summary", body }) }); sent = true; }
      catch (smtpErr) { errors.push(`SMTP: ${smtpErr.message}`); }
    }

    if (!sent) {
      logger.warn('email', `Daily summary email failed for ${toEmail}: ${errors.join(', ')}`);
      return false;
    }
    logger.info('email', `Daily summary email sent to ${toEmail}`);
    return true;
  } catch (err) {
    logger.error('email', `Error sending daily summary email to ${toEmail}: ${err.message}`, { error: err.message });
    return false;
  }
}

module.exports = { sendBookingConfirmation, sendReminderEmail, sendDailySummaryEmail };