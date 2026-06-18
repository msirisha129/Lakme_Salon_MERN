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
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#EFE7D4;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFE7D4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(26,23,20,0.12);">
          <tr>
            <td style="background:#1A1714;padding:36px 32px 28px 32px;text-align:center;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:6px;color:#F4EBD9;font-weight:400;">LAKM&Eacute;</p>
              <p style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:4px;color:#C9A227;font-weight:700;">SALON</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px auto 0 auto;">
                <tr><td style="width:48px;height:2px;background:linear-gradient(90deg,#C9A227,#E8C766);font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#C9A227,#E8C766);padding:22px 32px;text-align:center;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:3px;color:#1A1714;font-weight:700;">&#10003; BOOKING CONFIRMED</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px 32px;">
              <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8A7A5F;letter-spacing:0.5px;">Thank you, ${toName}</p>
              <h1 style="margin:0 0 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1A1714;font-weight:400;">We look forward to pampering you.</h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EE;border:1px solid #E8DCC0;border-radius:10px;">
                <tr>
                  <td style="padding:24px 24px 18px 24px;border-bottom:1px solid #E8DCC0;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;color:#C9A227;font-weight:700;text-transform:uppercase;">${serviceName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:14px;">
                          <p style="margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A7A5F;letter-spacing:0.5px;">DATE &amp; TIME</p>
                          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#1A1714;font-weight:600;">${date} &middot; ${timeSlot}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:14px;">
                          <p style="margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A7A5F;letter-spacing:0.5px;">AMOUNT</p>
                          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#7A1F3D;font-weight:600;">&#8377;${amount}</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A7A5F;letter-spacing:0.5px;">REFERENCE</p>
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1714;font-weight:600;">#${(typeof bookingId !== 'undefined' && bookingId) ? bookingId : Date.now().toString().slice(-6)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || '#'}/dashboard" style="display:inline-block;background:linear-gradient(90deg,#C9A227,#E8C766);color:#1A1714;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-decoration:none;padding:14px 36px;border-radius:6px;">MANAGE BOOKING</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8A7A5F;line-height:1.6;text-align:center;">Please arrive 10 minutes early. Need to reschedule? Reply to this email or call us.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #EFE7D4;font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1714;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#C9A227;letter-spacing:1px;">+91 98765 43210 &nbsp;&bull;&nbsp; Multiple Locations &nbsp;&bull;&nbsp; 9 AM &ndash; 8 PM Daily</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A7A5F;">&copy; Lakm&eacute; Salon. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Appointment Reminder</title>
</head>
<body style="margin:0;padding:0;background:#EFE7D4;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFE7D4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(26,23,20,0.12);">
          <tr>
            <td style="background:#1A1714;padding:36px 32px 28px 32px;text-align:center;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:6px;color:#F4EBD9;font-weight:400;">LAKM&Eacute;</p>
              <p style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:4px;color:#C9A227;font-weight:700;">SALON</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px auto 0 auto;">
                <tr><td style="width:48px;height:2px;background:linear-gradient(90deg,#C9A227,#E8C766);font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#7A1F3D;padding:22px 32px;text-align:center;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:3px;color:#F4EBD9;font-weight:700;">&#9201; APPOINTMENT IN 25 MINUTES</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px 32px;">
              <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8A7A5F;letter-spacing:0.5px;">Hi ${toName}</p>
              <h1 style="margin:0 0 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1A1714;font-weight:400;">Your appointment is almost here.</h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EE;border:1px solid #E8DCC0;border-radius:10px;">
                <tr>
                  <td style="padding:24px 24px 18px 24px;border-bottom:1px solid #E8DCC0;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;color:#C9A227;font-weight:700;text-transform:uppercase;">${serviceName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 24px;">
                    <p style="margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A7A5F;letter-spacing:0.5px;">TODAY AT</p>
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1A1714;font-weight:600;">${timeSlot}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || '#'}/dashboard" style="display:inline-block;background:linear-gradient(90deg,#C9A227,#E8C766);color:#1A1714;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-decoration:none;padding:14px 36px;border-radius:6px;">VIEW BOOKING</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8A7A5F;line-height:1.6;text-align:center;">Running late or need to reschedule? Call us at +91 98765 43210.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #EFE7D4;font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1714;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#C9A227;letter-spacing:1px;">+91 98765 43210 &nbsp;&bull;&nbsp; Multiple Locations &nbsp;&bull;&nbsp; 9 AM &ndash; 8 PM Daily</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A7A5F;">&copy; Lakm&eacute; Salon. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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