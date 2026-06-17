const mongoose = require('mongoose');

const voiceCallLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email: { type: String, default: '' },
  plan: { type: String, default: '' },
  callType: { type: String, enum: ['voice-book', 'voice-chat'], required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  durationMinutes: { type: Number, default: 0 },
  bookingCreated: { type: Boolean, default: false },
  serviceName: { type: String, default: '' },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VoiceCallLog', voiceCallLogSchema);
