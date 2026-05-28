const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const TIME_SLOTS = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','01:00 PM','02:00 PM','02:30 PM','03:00 PM',
  '03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM'];

// Get available slots for a date
router.get('/slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date required' });
    const booked = await Booking.find({
      date: { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) },
      status: { $ne: 'cancelled' }
    }).select('timeSlot');
    const bookedSlots = booked.map(b => b.timeSlot);
    const available = TIME_SLOTS.filter(s => !bookedSlots.includes(s));
    res.json({ success: true, data: available });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create booking
router.post('/', protect, async (req, res) => {
  try {
    const { serviceId, date, timeSlot, stylist, notes } = req.body;
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const booking = await Booking.create({
      user: req.user._id, service: serviceId, date, timeSlot,
      stylist: stylist || 'Any Available', notes,
      totalAmount: service.price, status: 'confirmed'
    });

    // Add loyalty points (1 point per ₹10)
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { loyaltyPoints: Math.floor(service.price / 10) },
      $push: { bookingHistory: booking._id }
    });

   // Send booking confirmation email
if (process.env.EMAIL_USER) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, port: process.env.EMAIL_PORT,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  const userDoc = await User.findById(req.user._id);
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: userDoc.email,
    subject: '✅ Booking Confirmed — Lakmé Salon',
    html: `<div style="font-family:Arial;max-width:500px;margin:auto;padding:20px">
      <h2 style="color:#C9A84C">Booking Confirmed! 🎉</h2>
      <p>Hi ${userDoc.name}, your appointment is booked!</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px;color:#999">Service</td><td style="padding:8px;font-weight:bold">${service.name}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#999">Date</td><td style="padding:8px">${new Date(date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</td></tr>
        <tr><td style="padding:8px;color:#999">Time</td><td style="padding:8px">${timeSlot}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#999">Amount</td><td style="padding:8px;color:#C9A84C;font-weight:bold">₹${service.price.toLocaleString()}</td></tr>
      </table>
      <p style="background:#FDF8F0;padding:12px;border-radius:8px;text-align:center">🌟 You earned ${Math.floor(service.price/10)} loyalty points!</p>
      <p style="color:#999;font-size:12px;margin-top:20px">Lakmé Salon | +91 98765 43210</p>
    </div>`
  }).catch(e => console.log('Email error:', e.message));
}
   
   
   
    const populated = await Booking.findById(booking._id).populate('service', 'name price duration category');
    res.status(201).json({ success: true, data: populated, message: 'Booking confirmed! You earned loyalty points.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get user's bookings
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('service', 'name price duration category image')
      .sort({ date: -1 });
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancel booking
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    booking.status = 'cancelled';
    await booking.save();
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit feedback
router.put('/:id/feedback', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { feedback: { rating, comment, submittedAt: new Date() } },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking, message: 'Thank you for your feedback!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Get all bookings
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .populate('service', 'name price category')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Update booking status
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id, { status: req.body.status }, { new: true }
    ).populate('user service');
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
