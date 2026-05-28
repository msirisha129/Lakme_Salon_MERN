const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

router.post('/', async (req, res) => {
  const { name, email, phone, message, method } = req.body;
  try {
    if (method === 'email' || method === 'whatsapp' || method === 'call' || method === 'sms') {
      // Always send email notification to salon
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_USER,
        subject: `New Contact from ${name} via ${method}`,
        html: `<h2>New Contact Request</h2>
               <p><b>Name:</b> ${name}</p>
               <p><b>Email:</b> ${email}</p>
               <p><b>Phone:</b> ${phone}</p>
               <p><b>Method:</b> ${method}</p>
               <p><b>Message:</b> ${message}</p>`
      });

      // Send confirmation to customer
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `We received your message — Lakmé Salon`,
        html: `<div style="font-family:Arial;max-width:500px;margin:auto">
          <h2 style="color:#C9A84C">Thank you, ${name}! 💄</h2>
          <p>We received your message and will contact you via <b>${method}</b> shortly.</p>
          <p><i>"${message}"</i></p>
          <hr/>
          <p style="color:#999">Lakmé Salon | hello@lakmesalon.com</p>
        </div>`
      });
    }

    // Twilio for WhatsApp/SMS/Call
    if ((method === 'whatsapp' || method === 'sms' || method === 'call') && process.env.TWILIO_ACCOUNT_SID) {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      if (method === 'whatsapp') {
        await twilio.messages.create({
          from: process.env.TWILIO_WHATSAPP,
          to: `whatsapp:+91${phone.replace(/\D/g,'')}`,
          body: `Hi ${name}! 💄 Lakmé Salon received your message. We'll reach out to you shortly!\n\nYour message: "${message}"`
        });
      } else if (method === 'sms') {
        await twilio.messages.create({
          from: process.env.TWILIO_PHONE,
          to: `+91${phone.replace(/\D/g,'')}`,
          body: `Hi ${name}! Lakmé Salon received your message. We'll call you back shortly!`
        });
      } else if (method === 'call') {
        await twilio.calls.create({
          from: process.env.TWILIO_PHONE,
          to: `+91${phone.replace(/\D/g,'')}`,
          twiml: `<Response><Say>Hello ${name}, thank you for contacting Lakmé Salon. We received your message and will get back to you soon. Thank you!</Say></Response>`
        });
      }
    }

    res.json({ success: true, message: `Message sent! We'll contact you via ${method} shortly.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send. Please try again.' });
  }
});

module.exports = router;