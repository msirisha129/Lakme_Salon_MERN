const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  service: { type: String },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  text: { type: String, required: true },
  imageUrl: { type: String },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Testimonial', testimonialSchema);
