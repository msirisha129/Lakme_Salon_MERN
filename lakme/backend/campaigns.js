const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const emailService = require('../middleware/emailService');
const { createEmailTemplate } = require('../utils/templateService');

router.post('/send', protect, adminOnly, async (req, res) => {
  const { title, subject, bannerUrl, description, ctaText, ctaUrl, segment } = req.body;

  try {
    // 1. Target Audience
    let query = { 'emailNotifications.newsletter': true };
    if (segment === 'gold') query.loyaltyPoints = { $gte: 5000 };
    if (segment === 'admin') query.role = 'admin';
    
    const users = await User.find(query).select('email name');
    
    // 2. Build Template
    const body = `
      ${bannerUrl ? `<img src="${bannerUrl}" style="width: 100%; border-radius: 8px; margin-bottom: 25px;">` : ''}
      <p>${description}</p>
    `;
    
    const html = createEmailTemplate({
      title,
      body,
      buttonText: ctaText,
      buttonUrl: ctaUrl
    });

    // 3. Batch Sending (Safety first)
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(batch.map(u => 
        emailService.sendEmail({
          to: u.email,
          subject,
          html: html.replace('{{name}}', u.name)
        })
      ));
      // Small delay to prevent rate limit hits
      await new Promise(r => setTimeout(r, 1000));
    }

    res.json({ success: true, message: `Campaign sent to ${users.length} recipients.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;