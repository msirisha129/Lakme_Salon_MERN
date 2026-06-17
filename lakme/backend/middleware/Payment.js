const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['success', 'pending', 'failed'], 
    default: 'success' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);