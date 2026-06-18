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

module.exports = { sendOtpEmail };