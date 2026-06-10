const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const sendOtpEmail = async ({ toEmail, toName, otp }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `Your Lakmé Salon OTP: ${otp}`,
      html: `<div style="font-family:Arial;max-width:500px;margin:auto">
               <h2 style="color:#C9A84C">Hello ${toName},</h2>
               <p>Your One-Time Password (OTP) for Lakmé Salon is: <strong>${otp}</strong></p>
               <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
               <p>If you did not request this, please ignore this email.</p>
               <hr/>
               <p style="color:#999">Lakmé Salon | hello@lakmesalon.com</p>
             </div>`
    });
    logger.info('email', `OTP email sent to ${toEmail}`, { toEmail, otp: '******' });
    return true;
  } catch (error) {
    logger.error('email', `Failed to send OTP email to ${toEmail}: ${error.message}`, { toEmail, error: error.message });
    return false;
  }
};

module.exports = { sendOtpEmail };