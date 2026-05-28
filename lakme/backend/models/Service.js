const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  category:    { type: String, enum: ['Hair','Skin','Nails','Bridal','Makeup','Spa'], required: true },
  description: { type: String, required: true },
  price:       { type: Number, required: true },
  duration:    { type: Number, required: true },
  image:       { type: String, default: '' },   // just a URL string, no import
  popular:     { type: Boolean, default: false },
  available:   { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);