const { HfInference } = require('@huggingface/inference');
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const express = require('express');
const router = express.Router();
const multer = require('multer');

const Groq = require('groq-sdk');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// Initialize APIs
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are Lakmé Beauty Assistant, an expert AI chatbot for Lakmé Salon in India.

**Your Capabilities:**
1. Help customers book appointments
2. Provide information about services and pricing
3. Give hairstyle recommendations based on face shape, hair type, and lifestyle
4. Offer hair care advice (hair fall, dandruff, styling tips)
5. Suggest suitable hairstyles based on trends and personal features
6. Provide contact information and salon timings

**Personality:**
- Warm, professional, and enthusiastic about beauty
- Use emojis occasionally (💄✨💇‍♀️) to be friendly
- Keep responses concise but informative
- Always be helpful and empathetic

**Important Rules:**
- If user wants to book, ask for: service type, preferred date, and time
- When suggesting hairstyles, consider: face shape, hair texture, lifestyle, maintenance level
- For hair care advice, be specific and practical
- Always format responses with proper line breaks for readability
- Use ** for bold text when emphasizing key points

**Response Format:**
- Use bullet points for lists
- Keep paragraphs short (2-3 sentences max)
- Add relevant emojis
- Be conversational but professional

**Sample Services (reference only, get real data from database):**
- Hair Cut & Styling (₹500-2000)
- Hair Color (₹2000-5000)
- Hair Spa & Treatment (₹1500-3000)
- Facial Services (₹800-2500)
- Bridal Makeup (₹5000-15000)
- Nail Art (₹500-1500)

When user asks about booking, guide them step by step. When they ask about hairstyles or hair care, provide detailed, personalized advice.`;

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message is required' 
      });
    }

    // Get services for context
    const services = await Service.find().select('name category price duration description');
    const servicesContext = services.map(s => 
      `${s.name} (${s.category}) - ₹${s.price} - ${s.duration} mins`
    ).join('\n');

    // Build conversation with context
    const messages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n**Available Services:**\n${servicesContext}\n\n**Salon Hours:** 9 AM - 8 PM Daily\n**Contact:** +91 98765 43210\n**Location:** Multiple locations across India`
      },
      ...conversationHistory.map(msg => ({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile', // Fast and good for conversations
      temperature: 0.7,
      max_tokens: 800,
      top_p: 1,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm here to help! Could you tell me more?";

    // Detect intent and actions
    let action = null;
    let target = null;

    const lowerMsg = message.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();

    // Detect booking intent
  if (
  lowerMsg.includes('book') ||
  lowerMsg.includes('appointment')
) {
  action = 'navigate';
  target = '/booking';
}

else if (
  lowerMsg.includes('service') ||
  lowerMsg.includes('price') ||
  lowerMsg.includes('cost')
) {
  action = 'navigate';
  target = '/services';
}

else if (
  lowerMsg.includes('hairstyle') ||
  lowerMsg.includes('hair style')
) {
  action = 'navigate';
  target = '/hairstyle';
}

else if (
  lowerMsg.includes('contact') ||
  lowerMsg.includes('phone') ||
  lowerMsg.includes('location') ||
  lowerMsg.includes('address')
) {
  action = 'navigate';
  target = '/contact';
}

    res.json({
      success: true,
      data: {
        message: aiResponse,
        action,
        target
      }
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sorry, I encountered an error. Please try again! 💄',
      error: error.message 
    });
  }
});

// Image analysis endpoint for hairstyle suggestions
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload an image' 
      });
    }

    

    const { preferences = '', concerns = '' } = req.body;

const imageDescription = `
The uploaded image contains a salon client seeking hairstyle recommendations.

Carefully analyze only visibly inferable features:
- estimate possible face shape if visible
- identify visible hair length
- identify visible hair texture
- identify visible hair color
- avoid making unrealistic assumptions

Provide realistic hairstyle, haircut, styling, and hair color recommendations based on visible appearance.
`;

const completion = await groq.chat.completions.create({
  messages: [
   {
  role: 'user',
  content: `
Analyze this uploaded salon client photo carefully.

Image context:
${imageDescription}

Only mention features that are reasonably inferable.
If unclear, use phrases like:
- "appears to"
- "may suit"
- "likely"

Focus on:
- hairstyle recommendations
- haircut suitability
- hair coloring ideas
- styling tips
- salon suggestions

Preferences: ${preferences}

Suggest:
- suitable hairstyles
- face shape estimate
- hair texture
- hair color suggestions
- maintenance tips
- salon recommendations

Make response beautiful and professional.
`
}
  ],
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  max_tokens: 700
});

const analysis = completion.choices[0]?.message?.content;

    // Also get a Groq summary for consistency
    const groqSummary = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a beauty consultant summarizing hairstyle recommendations. Keep it concise and encouraging.'
        },
        {
          role: 'user',
          content: `Summarize these hairstyle recommendations in 2-3 sentences with a warm, encouraging tone:\n\n${analysis}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 200
    });

    const summary = groqSummary.choices[0]?.message?.content || '';

    res.json({
      success: true,
      data: {
        analysis,
        summary,
        imageProcessed: true
      }
    });

  } catch (error) {
    console.error('Image Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error analyzing image. Please try again!',
      error: error.message 
    });
  }
});

// Hairstyle recommendations without image
router.post('/hairstyle-recommend', async (req, res) => {
  try {
    const { faceShape, hairType, lifestyle, concerns, preferences, length, occasion } = req.body;

    if (!faceShape && !hairType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide at least face shape or hair type' 
      });
    }

   const prompt = `
You are a luxury Lakme salon AI stylist.

Customer Details:
- Face Shape: ${faceShape}
- Hair Type: ${hairType}
- Preferred Length: ${length}
- Occasion: ${occasion}

Return ONLY valid JSON.

Format:
{
  "intro": "short luxury intro",
  "styles": [
    {
      "name": "",
      "description": ""
    }
  ],
  "services": [
    ""
  ]
}

Rules:
- Give ONLY 3 hairstyles
- Keep descriptions short
- Suggest matching Lakme salon services
- Elegant luxury tone
- No markdown
- No long paragraphs
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert hairstylist providing personalized recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 1000
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';

const recommendations = JSON.parse(rawResponse); 

    res.json({
      success: true,
      data: {
        recommendations,
        canBookConsultation: true
      }
    });

  } catch (error) {
    console.error('Hairstyle Recommendation Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating recommendations. Please try again!',
      error: error.message 
    });
  }
});

// Hair care advice endpoint
router.post('/hair-advice', async (req, res) => {
  try {
    const { concern, hairType, currentRoutine } = req.body;

    if (!concern) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please describe your hair concern' 
      });
    }

    const prompt = `As a hair care expert, provide detailed advice for this concern:

**Concern:** ${concern}
**Hair Type:** ${hairType || 'Not specified'}
**Current Routine:** ${currentRoutine || 'None mentioned'}

**Provide:**
1. Root cause analysis of the concern
2. Recommended hair care routine (step-by-step)
3. Product types to use (be specific)
4. Lifestyle changes if applicable
5. Professional treatments at Lakmé Salon that could help
6. Expected timeline for results
7. Prevention tips

**Be comprehensive but easy to follow. Use sections and bullet points. Be encouraging!**`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a hair care specialist providing expert advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000
    });

    const advice = completion.choices[0]?.message?.content || "Let me help you with that concern!";

    // Get relevant salon services
    const relevantServices = await Service.find({
      $or: [
        { category: 'Hair Treatment' },
        { category: 'Hair Spa' },
        { name: { $regex: concern, $options: 'i' } }
      ]
    }).limit(3).select('name price duration description');

    res.json({
      success: true,
      data: {
        advice,
        relevantServices: relevantServices.map(s => ({
          name: s.name,
          price: s.price,
          duration: s.duration,
          description: s.description
        }))
      }
    });

  } catch (error) {
    console.error('Hair Advice Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error providing advice. Please try again!',
      error: error.message 
    });
  }
});

// Quick booking via AI
router.post('/quick-book', protect, async (req, res) => {
  try {
    const { serviceName, date, timeSlot } = req.body;

    // Find service by name (fuzzy match)
    const service = await Service.findOne({
      name: { $regex: serviceName, $options: 'i' }
    });

    if (!service) {
      return res.status(404).json({ 
        success: false, 
        message: `Service "${serviceName}" not found. Please check available services.` 
      });
    }

    // Check if slot is available
    const existingBooking = await Booking.findOne({
      date: new Date(date),
      timeSlot,
      status: { $ne: 'cancelled' }
    });

    if (existingBooking) {
      return res.status(400).json({ 
        success: false, 
        message: `Sorry, ${timeSlot} is already booked. Please choose another time.` 
      });
    }

    // Create booking
    const booking = await Booking.create({
      user: req.user._id,
      service: service._id,
      date: new Date(date),
      timeSlot,
      totalAmount: service.price,
      status: 'confirmed'
    });

    res.json({
      success: true,
      data: booking,
      message: `✅ Booking confirmed! ${service.name} on ${new Date(date).toLocaleDateString()} at ${timeSlot}`
    });

  } catch (error) {
    console.error('Quick Book Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating booking. Please try again!',
      error: error.message 
    });
  }
});

router.post('/voice-chat', async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
      messages: req.body.messages,
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      temperature: 0.7,
    });
    res.json(completion);
  } catch (err) {
    console.error('Voice chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
router.post('/voice-book', protect, async (req, res) => {
  try {
    const { serviceName, dateText, timeSlot } = req.body;

    const service = await Service.findOne({
      name: { $regex: serviceName, $options: 'i' }
    });
    if (!service) {
      return res.json({ success: false, message: `Sorry, I couldn't find "${serviceName}". Available services include Hair Cut, Facial, Bridal Makeup, and more.` });
    }

    // Parse date properly
    let bookingDate = new Date();
    const lower = (dateText || '').toLowerCase().trim();
    if (lower.includes('tomorrow')) {
      bookingDate.setDate(bookingDate.getDate() + 1);
    } else if (lower.includes('today')) {
      bookingDate = new Date();
    } else if (lower.includes('monday'))    { bookingDate = getNextDay(1); }
    else if (lower.includes('tuesday'))     { bookingDate = getNextDay(2); }
    else if (lower.includes('wednesday'))   { bookingDate = getNextDay(3); }
    else if (lower.includes('thursday'))    { bookingDate = getNextDay(4); }
    else if (lower.includes('friday'))      { bookingDate = getNextDay(5); }
    else if (lower.includes('saturday'))    { bookingDate = getNextDay(6); }
    else if (lower.includes('sunday'))      { bookingDate = getNextDay(0); }
    else {
      const cleaned = (dateText || '').replace(/(st|nd|rd|th)/gi, '').trim();
      const parsed = new Date(cleaned + ' 2026');
      if (!isNaN(parsed.getTime())) bookingDate = parsed;
      else { bookingDate.setDate(bookingDate.getDate() + 1); }
    }
    bookingDate.setHours(12, 0, 0, 0);

    // Normalize time slot
    const TIME_SLOTS = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
      '12:00 PM','12:30 PM','01:00 PM','02:00 PM','02:30 PM','03:00 PM',
      '03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM'];
    const matchedSlot = TIME_SLOTS.find(s =>
      s.toLowerCase().replace(/\s/g,'').includes(
        (timeSlot || '').toLowerCase().replace(/\s/g,'').substring(0,4)
      )
    ) || timeSlot;

    // Create booking
    const booking = await Booking.create({
      user: req.user._id,
      service: service._id,
      date: bookingDate,
      timeSlot: matchedSlot,
      stylist: 'Any Available',
      totalAmount: service.price,
      status: 'confirmed'
    });

    // Loyalty points
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { loyaltyPoints: Math.floor(service.price / 10) },
      $push: { bookingHistory: booking._id }
    });

    // Send confirmation email
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      const userDoc = await User.findById(req.user._id);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: userDoc.email,
        subject: '✅ Voice Booking Confirmed — Lakmé Salon',
        html: `<div style="font-family:Arial;max-width:500px;margin:auto;padding:20px">
          <h2 style="color:#C9A84C">Booking Confirmed! 🎉</h2>
          <p>Hi ${userDoc.name}, your voice booking is confirmed!</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;color:#999">Service</td><td style="padding:8px;font-weight:bold">${service.name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#999">Date</td><td style="padding:8px">${bookingDate.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</td></tr>
            <tr><td style="padding:8px;color:#999">Time</td><td style="padding:8px">${matchedSlot}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#999">Amount</td><td style="padding:8px;color:#C9A84C;font-weight:bold">₹${service.price.toLocaleString()}</td></tr>
          </table>
          <p style="background:#FDF8F0;padding:12px;border-radius:8px;text-align:center">🌟 You earned ${Math.floor(service.price/10)} loyalty points!</p>
          <p style="color:#999;font-size:12px">Lakmé Salon | +91 98765 43210</p>
        </div>`
      });
      console.log('✅ Voice booking email sent to:', userDoc.email);
    } catch(emailErr) {
      console.error('❌ Email failed:', emailErr.message);
    }

    res.json({
      success: true,
      message: `${service.name} booked for ${bookingDate.toLocaleDateString('en-IN',{day:'numeric',month:'long'})} at ${matchedSlot} — ₹${service.price.toLocaleString()}`
    });

  } catch (err) {
    console.error('Voice book error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post('/chat-book', protect, async (req, res) => {
  try {
    const { serviceName, dateText, timeSlot } = req.body;

    const service = await Service.findOne({
      name: { $regex: serviceName.split(' ')[0], $options: 'i' }
    });
    if (!service) {
      return res.json({ success: false, message: `Service "${serviceName}" not found.` });
    }

    let bookingDate = new Date();
    const lower = (dateText || '').toLowerCase().trim();
    if (lower.includes('tomorrow')) { bookingDate.setDate(bookingDate.getDate() + 1); }
    else if (lower.includes('today')) { bookingDate = new Date(); }
    else if (lower.includes('monday'))    { bookingDate = getNextDay(1); }
    else if (lower.includes('tuesday'))   { bookingDate = getNextDay(2); }
    else if (lower.includes('wednesday')) { bookingDate = getNextDay(3); }
    else if (lower.includes('thursday'))  { bookingDate = getNextDay(4); }
    else if (lower.includes('friday'))    { bookingDate = getNextDay(5); }
    else if (lower.includes('saturday'))  { bookingDate = getNextDay(6); }
    else if (lower.includes('sunday'))    { bookingDate = getNextDay(0); }
    else {
      const cleaned = (dateText || '').replace(/(st|nd|rd|th)/gi, '').trim();
      const parsed = new Date(cleaned + ' 2026');
      if (!isNaN(parsed.getTime())) bookingDate = parsed;
      else bookingDate.setDate(bookingDate.getDate() + 1);
    }
    bookingDate.setHours(12, 0, 0, 0);

    const TIME_SLOTS = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
      '12:00 PM','12:30 PM','01:00 PM','02:00 PM','02:30 PM','03:00 PM',
      '03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM'];
    const matchedSlot = TIME_SLOTS.find(s =>
      s.toLowerCase().replace(/\s/g,'').includes(
        (timeSlot || '').toLowerCase().replace(/\s/g,'').substring(0,4)
      )
    ) || timeSlot;

    const booking = await Booking.create({
      user: req.user._id,
      service: service._id,
      date: bookingDate,
      timeSlot: matchedSlot,
      stylist: 'Any Available',
      totalAmount: service.price,
      status: 'confirmed'
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { loyaltyPoints: Math.floor(service.price / 10) },
      $push: { bookingHistory: booking._id }
    });

    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      const userDoc = await User.findById(req.user._id);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: userDoc.email,
        subject: '✅ Booking Confirmed — Lakmé Salon',
        html: `<div style="font-family:Arial;max-width:500px;margin:auto;padding:20px">
          <h2 style="color:#C9A84C">Booking Confirmed! 🎉</h2>
          <p>Hi ${userDoc.name}, your booking is confirmed!</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;color:#999">Service</td><td style="padding:8px;font-weight:bold">${service.name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#999">Date</td><td style="padding:8px">${bookingDate.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</td></tr>
            <tr><td style="padding:8px;color:#999">Time</td><td style="padding:8px">${matchedSlot}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#999">Amount</td><td style="padding:8px;color:#C9A84C;font-weight:bold">₹${service.price.toLocaleString()}</td></tr>
          </table>
          <p style="background:#FDF8F0;padding:12px;border-radius:8px;text-align:center">🌟 You earned ${Math.floor(service.price/10)} loyalty points!</p>
          <p style="color:#999;font-size:12px">Lakmé Salon | +91 98765 43210</p>
        </div>`
      });
      console.log('✅ Chat booking email sent to:', userDoc.email);
    } catch(emailErr) {
      console.error('❌ Email failed:', emailErr.message);
    }

    res.json({
      success: true,
      message: `${service.name} booked for ${bookingDate.toLocaleDateString('en-IN',{day:'numeric',month:'long'})} at ${matchedSlot} — ₹${service.price.toLocaleString()}`
    });

  } catch (err) {
    console.error('Chat book error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});
function getNextDay(dayIndex) {
  const today = new Date();
  const diff = (dayIndex - today.getDay() + 7) % 7 || 7;
  today.setDate(today.getDate() + diff);
  return today;
}
module.exports = router;