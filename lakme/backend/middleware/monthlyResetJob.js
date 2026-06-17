const cron = require('node-cron');
const Subscription = require('../models/Subscription');

async function resetVoiceCallsMonthly() {
  try {
    // Assuming there's only one Subscription document for the entire business
    const subscription = await Subscription.findOne();

    if (subscription) {
      subscription.voiceCallsUsed = 0;
      await subscription.save();
      console.log('✅ Monthly voice call usage reset successfully.');
    } else {
      console.warn('⚠️ No Subscription document found to reset voice call usage.');
    }
  } catch (err) {
    console.error('❌ Error resetting monthly voice call usage:', err.message);
  }
}

function startMonthlyResetJob() {
  // Schedule to run on the 1st day of every month at 00:00 (midnight)
  cron.schedule('0 0 1 * *', resetVoiceCallsMonthly, { timezone: "Asia/Kolkata" }); // Assuming IST timezone for Lakme Salon
  console.log('⏰ Monthly voice call reset job scheduled.');
}

module.exports = startMonthlyResetJob;