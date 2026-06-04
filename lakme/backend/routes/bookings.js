const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { consumeUserLimit } = require('../middleware/bookingRateLimiter');

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

    // rate-limit per-user bookings (per day)
    try {
      const rl = await consumeUserLimit(req.user._id.toString());
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Booking limit reached for today. Please contact support or try tomorrow.' });
    } catch (e) {
      console.warn('User booking limiter error', e && e.message);
    }

    // validate date
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: 'Invalid date provided' });
    parsed.setHours(12,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const checkDay = new Date(parsed); checkDay.setHours(0,0,0,0);
    if (checkDay < today) return res.status(400).json({ success: false, message: 'Cannot book a past date' });

    // prevent double booking
    const existing = await Booking.findOne({ date: parsed, timeSlot, status: { $ne: 'cancelled' } });
    if (existing) return res.status(400).json({ success: false, message: `Sorry, ${timeSlot} is already booked on that date. Please choose another slot.` });

    const booking = await Booking.create({
      user: req.user._id, service: serviceId, date: parsed, timeSlot,
      stylist: stylist || 'Any Available', notes,
      totalAmount: service.price, status: 'confirmed'
    });

    // Add loyalty points (1 point per ₹10)
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { loyaltyPoints: Math.floor(service.price / 10) },
      $push: { bookingHistory: booking._id }
    });

   // Send booking confirmation email
const { sendBookingConfirmation } = require('../middleware/emailService');
const userDoc = await User.findById(req.user._id);
// log if email failed
try {
  const sent = await sendBookingConfirmation({
    toEmail: userDoc.email,
    toName: userDoc.name,
    serviceName: service.name,
    date: new Date(date).toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long'}),
    timeSlot,
    amount: service.price.toLocaleString(),
    loyaltyPoints: Math.floor(service.price / 10)
  });
  if (!sent) console.warn('Booking confirmation email not sent (bookings.create) for user', req.user ? req.user._id : null);
} catch (e) { console.error('Booking email error:', e.message); }
   
   
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
