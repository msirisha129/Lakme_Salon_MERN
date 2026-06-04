const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // If booking made by a registered user, `user` is set.
  // For guest bookings (voice assistant without login), `user` may be null and `guestEmail`/`guestName` used.
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestEmail: { type: String },
  guestName: { type: String },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  stylist: { type: String, default: 'Any Available' },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: { type: String, default: '' },
  totalAmount: { type: Number },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    submittedAt: { type: Date }
  },
  notifications: {
    priorSent: { type: Boolean, default: false },
    postSent: { type: Boolean, default: false }
  },
  reminderSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Prevent accidental duplicate bookings for the same date + timeslot
bookingSchema.index({ date: 1, timeSlot: 1 }, { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } });

module.exports = mongoose.model('Booking', bookingSchema);
