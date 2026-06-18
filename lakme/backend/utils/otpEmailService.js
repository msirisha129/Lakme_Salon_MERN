const logger = require('./logger');

const sendOtpEmail = async ({ toEmail, toName, otp }) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'Lakmé Salon', email: process.env.EMAIL_FROM },
        to: [{ email: toEmail, name: toName }],
        subject: `Your Lakmé Salon OTP: ${otp}`,
        htmlContent: `<div style="font-family:Arial;max-width:500px;margin:auto">
               <h2 style="color:#C9A84C">Hello ${toName},</h2>
               <p>Your One-Time Password (OTP) for Lakmé Salon is: <strong>${otp}</strong></p>
               <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
               <p>If you did not request this, please ignore this email.</p>
               <hr/>
               <p style="color:#999">Lakmé Salon | hello@lakmesalon.com</p>
             </div>`
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(JSON.stringify(err));
    }

    logger.info('email', `OTP email sent to ${toEmail}`, { toEmail, otp: '******' });
    return true;
  } catch (error) {
    logger.error('email', `Failed to send OTP email to ${toEmail}: ${error.message}`, { toEmail, error: error.message });
    return false;
  }
};

const sendBookingStatusEmail = async ({ toEmail, toName, status, serviceName, bookingDate, bookingTime, amount, bookingId }) => {
  const statusConfig = {
    confirmed: {
      bannerBg: '#C9A84C',
      bannerText: '#1a1612',
      bannerLabel: '✓ BOOKING CONFIRMED',
      heading: 'We look forward to pampering you.',
      note: 'Please arrive 10 minutes early. Need to reschedule? Reply to this email or call us.',
      buttonLabel: 'MANAGE BOOKING'
    },
    pending: {
      bannerBg: '#E0B84C',
      bannerText: '#1a1612',
      bannerLabel: '⏳ BOOKING PENDING',
      heading: "We're confirming your appointment shortly.",
      note: "We'll notify you as soon as your slot is confirmed. Questions? Reply to this email or call us.",
      buttonLabel: 'VIEW BOOKING'
    },
    completed: {
      bannerBg: '#3B7A57',
      bannerText: '#ffffff',
      bannerLabel: '✓ APPOINTMENT COMPLETED',
      heading: 'We hope you loved your visit!',
      note: "We'd love your feedback. Book your next appointment anytime.",
      buttonLabel: 'BOOK AGAIN'
    },
    cancelled: {
      bannerBg: '#B23A48',
      bannerText: '#ffffff',
      bannerLabel: '✕ BOOKING CANCELLED',
      heading: "We're sorry to see you cancel.",
      note: "Changed your mind? You can rebook anytime. Questions? Reply to this email or call us.",
      buttonLabel: 'BOOK AGAIN'
    }
  };

  const cfg = statusConfig[status] || statusConfig.pending;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: 'Lakmé Salon', email: process.env.EMAIL_FROM },
        to: [{ email: toEmail, name: toName }],
        subject: `${cfg.bannerLabel} - Lakmé Salon`,
        htmlContent: `
        <div style="background:#f4eee0;padding:24px 0;font-family:Georgia,'Times New Roman',serif;">
          <table align="center" width="500" cellpadding="0" cellspacing="0" style="max-width:500px;margin:0 auto;background:#f4eee0;border-collapse:collapse;">
            <tr>
              <td style="background:#1a1612;padding:28px 0;text-align:center;">
                <div style="color:#e8d9a8;font-size:26px;letter-spacing:4px;font-weight:bold;">LAKMÉ</div>
                <div style="color:#c9a84c;font-size:11px;letter-spacing:3px;margin-top:4px;">SALON</div>
                <div style="width:40px;height:2px;background:#c9a84c;margin:10px auto 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="background:${cfg.bannerBg};color:${cfg.bannerText};text-align:center;padding:14px 0;font-size:13px;letter-spacing:1px;font-weight:bold;">
                ${cfg.bannerLabel}
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:30px 36px 10px;">
                <div style="color:#8a8a8a;font-size:13px;">Thank you, ${toName}</div>
                <div style="color:#1a1612;font-size:20px;margin-top:4px;">${cfg.heading}</div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:0 36px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1e3;border:1px solid #e8dfc8;border-radius:4px;">
                  <tr>
                    <td style="padding:16px 20px 4px;color:#b8902f;font-size:12px;letter-spacing:1px;font-weight:bold;">
                      ${(serviceName || '').toUpperCase()}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 20px 0;color:#8a8a8a;font-size:11px;letter-spacing:1px;">DATE &amp; TIME</td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 14px;color:#1a1612;font-size:15px;font-weight:bold;">
                      ${bookingDate}${bookingTime ? ' · ' + bookingTime : ''}
                    </td>
                  </tr>
                  ${amount ? `
                  <tr><td style="padding:0 20px 0;color:#8a8a8a;font-size:11px;letter-spacing:1px;">AMOUNT</td></tr>
                  <tr><td style="padding:0 20px 14px;color:#7a2e3b;font-size:15px;font-weight:bold;">₹${amount}</td></tr>` : ''}
                  ${bookingId ? `
                  <tr><td style="padding:0 20px 0;color:#8a8a8a;font-size:11px;letter-spacing:1px;">REFERENCE</td></tr>
                  <tr><td style="padding:0 20px 16px;color:#1a1612;font-size:14px;">#${bookingId}</td></tr>` : ''}
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:0 36px 28px;text-align:center;">
                <a href="#" style="display:inline-block;background:#c9a84c;color:#1a1612;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:1px;padding:14px 32px;border-radius:3px;">
                  ${cfg.buttonLabel}
                </a>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:0 36px 28px;text-align:center;color:#8a8a8a;font-size:12px;">
                ${cfg.note}
              </td>
            </tr>
            <tr>
              <td style="background:#1a1612;padding:18px 20px;text-align:center;color:#c9a84c;font-size:12px;">
                +91 98765 43210 &nbsp;•&nbsp; Multiple Locations &nbsp;•&nbsp; 9 AM – 8 PM Daily
                <div style="color:#7a715f;font-size:10px;margin-top:6px;">© Lakmé Salon. All rights reserved.</div>
              </td>
            </tr>
          </table>
        </div>`
      })
    });
    if (!response.ok) throw new Error(JSON.stringify(await response.json()));
    return true;
  } catch (error) {
    logger.error('email', `Failed to send status email: ${error.message}`);
    return false;
  }
};

module.exports = { sendOtpEmail, sendBookingStatusEmail };