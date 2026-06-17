const User = require('../models/User');
const emailService = require('../middleware/emailService');
const { createEmailTemplate, createOTPBox, createDataGrid } = require('../utils/templateService');
const logger = require('../utils/logger');

/**
 * High-level orchestration for all customer notifications.
 */
const notificationService = {
  
  // 1. Transactional: OTP (Preference ignored)
  sendOTP: async (user, otp) => {
    const body = `
      <p>Hello ${user.name.split(' ')[0]},</p>
      <p>Use the code below to verify your login attempt. If you did not request this, please ignore this email and contact support immediately.</p>
      ${createOTPBox(otp)}
      <p style="font-size: 12px; color: #cc0000; border-left: 3px solid #cc0000; padding-left: 15px;">
        <strong>Security Warning:</strong> Never share your OTP with anyone, including Lakmé Salon staff.
      </p>
    `;
    return await emailService.sendEmail({
      to: user.email,
      subject: "Verify Your Login - Lakmé Salon",
      html: createEmailTemplate({ title: "Secure Verification", body })
    });
  },

  // 2. Transactional: Welcome (Sent once on register)
  sendWelcome: async (user) => {
    const body = `
      <p>Welcome to our premium beauty family, ${user.name.split(' ')[0]}!</p>
      <p>As a member of Lakmé Salon, you now have access to a world of luxury and exclusive benefits:</p>
      <ul style="padding-left: 20px;">
        <li><strong>AI Hairstyle Advisor:</strong> Discover your perfect look using our advanced AI.</li>
        <li><strong>Loyalty Points:</strong> Earn 1 point for every ₹10 spent on services.</li>
        <li><strong>Premium Services:</strong> From Balayage to Hydrafacials.</li>
        <li><strong>Priority Booking:</strong> Book your favorite stylists 24/7.</li>
      </ul>
    `;
    return await emailService.sendEmail({
      to: user.email,
      subject: "Welcome to Lakmé Salon",
      html: createEmailTemplate({ 
        title: "The Art of Beauty Awaits", 
        body,
        buttonText: "Explore Services",
        buttonUrl: `${process.env.FRONTEND_URL}/services`
      })
    });
  },

  // 3. Booking Confirmation (Transactional)
  sendBookingConfirmation: async (user, booking, service) => {
    const data = createDataGrid([
      { label: "Service", value: service.name },
      { label: "Date", value: new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) },
      { label: "Time", value: booking.timeSlot },
      { label: "Booking ID", value: booking._id.toString().toUpperCase().slice(-8) },
      { label: "Amount", value: `₹${booking.totalAmount.toLocaleString()}` }
    ]);

    const body = `
      <p>Your appointment has been confirmed. We have reserved a specialized beauty suite just for you.</p>
      ${data}
      <p>Please arrive at the salon 10 minutes prior to your appointment time.</p>
    `;

    return await emailService.sendEmail({
      to: user.email || booking.guestEmail,
      subject: `Confirmed: ${service.name} at Lakmé Salon`,
      html: createEmailTemplate({ 
        title: "Booking Confirmed", 
        body,
        buttonText: "View Booking",
        buttonUrl: `${process.env.FRONTEND_URL}/dashboard`
      })
    });
  },

  // 4. Loyalty Reward (Preference checked)
  sendLoyaltyUpdate: async (userId, pointsEarned, currentBalance) => {
    const user = await User.findById(userId);
    if (!user || !user.emailNotifications?.loyalty) return;

    const body = `
      <div style="text-align: center; margin: 20px 0;">
        <div style="display: inline-block; background-color: #0F0F0F; color: #C8A34D; border: 2px solid #C8A34D; border-radius: 50%; width: 100px; height: 100px; line-height: 100px; font-size: 24px; font-weight: bold;">
          +${pointsEarned}
        </div>
      </div>
      <p>Congratulations! You just earned <strong>${pointsEarned} points</strong> on your last visit.</p>
      <p>Your current membership balance is now <strong>${currentBalance} points</strong>.</p>
      <p>Redeem these points for exclusive luxury treatments or products on your next visit.</p>
    `;

    return await emailService.sendEmail({
      to: user.email,
      subject: "You've Earned Loyalty Points - Lakmé Salon",
      html: createEmailTemplate({ 
        title: "Member Rewards", 
        body,
        buttonText: "View My Rewards",
        buttonUrl: `${process.env.FRONTEND_URL}/dashboard`
      })
    });
  }

  // Note: Implementation for Birthday, Cancellation, etc. follows same pattern...
};

module.exports = notificationService;