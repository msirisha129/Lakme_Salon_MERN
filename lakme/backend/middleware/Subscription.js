const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    plan: {
      type: String,
      enum: ['Free', 'Starter', 'Growth', 'Premium'],
      default: 'Free',
    },

    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },

    renewalDate: {
      type: Date,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
    },

    voiceCallsUsed: {
      type: Number,
      default: 0,
    },

    voiceCallsLimit: {
      type: Number,
      default: 2, // Free plan limit
    },

    paymentId: {
      type: String,
      default: '',
    },

    amountPaid: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);