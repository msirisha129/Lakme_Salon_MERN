const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  category: { type: String, required: true, enum: ['booking', 'email', 'voice', 'user', 'error', 'app', 'security'] },
  level: { type: String, required: true, enum: ['info', 'warn', 'error'], default: 'info' },
  message: { type: String, required: true },
  details: { type: String, default: '' }
});

module.exports = mongoose.model('Log', logSchema);
