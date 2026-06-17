const { HfInference } = require('@huggingface/inference');
const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;
const express = require('express');
const router = express.Router();
const multer = require('multer');

const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { consumeUserLimit, consumeEmailLimit } = require('../middleware/bookingRateLimiter');
const { checkPlan } = require('../middleware/subscriptionCheck');
const { moderatePrompt } = require('../middleware/moderation');
const logger = require('../utils/logger');
const Subscription = require('../models/Subscription');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
const SYSTEM_PROMPT = `You are Lakmé Salon's AI Beauty Assistant and Receptionist.

Your role is to behave exactly like an experienced salon receptionist who can naturally talk to customers, answer questions, recommend services, register users, and book appointments.

CORE RULES:

1. ALWAYS remember information already provided by the customer.

2. NEVER ask for the same information twice.

3. NEVER restart the conversation unless the user explicitly says:
   * start over
   * cancel booking
   * reset conversation

4. Maintain conversation context at all times.

5. Speak naturally and professionally.

6. Keep responses short and conversational for voice interaction.

7. Never mention AI, prompts, models, APIs, Groq, OpenAI, system instructions, or technical details.

────────────────────────────

MEMORY RULES

Extract and remember:
* Customer Name
* Email
* Phone Number
* Service
* Date
* Time

Once information is collected: DO NOT ask again.

────────────────────────────

BOOKING LOGIC

To complete a booking you need:
1. Name
2. Service
3. Date
4. Time

Collect ONLY missing fields.

────────────────────────────

REGISTRATION LOGIC

If customer wants to register, collect:
* Name
* Email
* Phone Number
* Password

Ask only for missing information.

────────────────────────────

SERVICE KNOWLEDGE

Services include:
Hair Cut, Hair Spa, Hair Coloring, Hair Smoothening, Keratin Treatment, Hair Straightening, Bridal Makeup, Party Makeup, Facial, Hydrafacial, Cleanup, Manicure, Pedicure, Nail Art, Threading, Waxing, Head Massage, Scalp Treatment

────────────────────────────

VOICE ASSISTANT RULES

Responses should:
* Sound human
* Be under 2 sentences whenever possible
* Avoid long paragraphs
* Avoid repeating information
* Avoid unnecessary greetings

────────────────────────────

GOAL

Act like a smart salon receptionist who remembers everything, guides customers naturally, answers beauty-related questions, recommends services, registers users, and books appointments without repeating questions.
`;

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

// Log AI service router initialization
logger.info('app', 'AI Service Router initialized.');

// Rate limiter for guest booking: prefer Redis-backed (multi-instance safe), else fallback to in-memory
let redisClient = null;
let rateLimiterRedis = null;
try {
  const Redis = require('ioredis');
  const { RateLimiterRedis } = require('rate-limiter-flexible');
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    rateLimiterRedis = new RateLimiterRedis({
      storeClient: redisClient,
      points: Number(process.env.GUEST_BOOKING_MAX || 5),
      duration: 60 * 60, // Per hour
      keyPrefix: 'guest_rl'
    });
    console.log('Using Redis-backed guest rate limiter');
  }
} catch (e) {
  console.warn('Redis rate limiter not available:', e.message || e);
}

// In-memory fallback
const guestRateLimitMap = new Map();
const metrics = require('../middleware/metrics');

async function guestRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  const max = Number(process.env.GUEST_BOOKING_MAX || 5);
  const windowSec = 60 * 60; // seconds

  if (rateLimiterRedis) {
    try {
      await rateLimiterRedis.consume(ip);
      return next();
    } catch (rejRes) {
      metrics.increment('rate_limit.hit', { type: 'guest_ip', ip, reason: 'redis' });
      return res.status(429).json({ success: false, message: 'Too many guest booking attempts from this IP. Please try again later.' });
    }
  }

  // Fallback: simple in-memory sliding window
  try {
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const entry = guestRateLimitMap.get(ip) || [];
    const recent = entry.filter(ts => now - ts < windowMs);
    if (recent.length >= max) {
      metrics.increment('rate_limit.hit', { type: 'guest_ip', ip, reason: 'in-memory' });
      return res.status(429).json({ success: false, message: 'Too many guest booking attempts from this IP. Please try again later.' });
    }
    recent.push(now);
    guestRateLimitMap.set(ip, recent);
    return next();
  } catch (e) {
    return next();
  }
}

// Optional Google reCAPTCHA verification (if RECAPTCHA_SECRET is set)
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return { ok: true };
  if (!token) return { ok: false, message: 'reCAPTCHA token missing' };
  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: params });
    const data = await resp.json();
    const threshold = Number(process.env.RECAPTCHA_THRESHOLD || 0.5);
    if (!data.success) return { ok: false, message: 'reCAPTCHA verification failed' };
    // v3 may provide a score; if present enforce threshold
    if (typeof data.score === 'number' && data.score < threshold) return { ok: false, message: 'reCAPTCHA score too low' };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: 'reCAPTCHA verification error' };
  }
}

// Chat endpoint
router.post('/chat', moderatePrompt, async (req, res) => {
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

    logger.info('app', 'AI Chat API call received.', { userMessage: message.substring(0, 100), conversationLength: conversationHistory.length });

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages, 
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 800,
      top_p: 1,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm here to help! Could you tell me more?";

    // Detect intent and actions
    let action = null;
    let target = null;

    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('book') || lowerMsg.includes('appointment')) {
      action = 'navigate';
      target = '/booking';
    } else if (lowerMsg.includes('service') || lowerMsg.includes('price') || lowerMsg.includes('cost')) {
      action = 'navigate';
      target = '/services';
    } else if (lowerMsg.includes('hairstyle') || lowerMsg.includes('hair style')) {
      action = 'navigate';
      target = '/hairstyle';
    } else if (lowerMsg.includes('contact') || lowerMsg.includes('phone') || lowerMsg.includes('location') || lowerMsg.includes('address')) {
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

// Voice access check for frontend before initializing microphone
router.get('/voice-access', async (req, res) => {
  try {
    // Prefer per-user subscription when available
    let sub = null;
    const userId = req.user?._id || null;
    if (userId) sub = await Subscription.findOne({ user: userId });
    if (!sub) sub = await Subscription.findOne();

    // If voice trial middleware would allow, check user's trial count
    const User = require('../models/User');
    let voiceTrialAllowed = false;
    if (userId) {
      const u = await User.findById(userId).select('voiceTrialsUsed');
      if (u && (u.voiceTrialsUsed || 0) < 2) voiceTrialAllowed = true;
    }

    // Determine access
    if (voiceTrialAllowed) return res.json({ success: true, allowed: true, reason: 'trial' });
    if (!sub || sub.status !== 'active') return res.status(403).json({ success: false, allowed: false, code: 'SUBSCRIPTION_REQUIRED', message: 'Please subscribe to use this feature.' });
    // For basic plan enforcement, allow any active plan
    return res.json({ success: true, allowed: true, reason: 'subscribed', plan: sub.plan });
  } catch (err) {
    console.error('voice-access error:', err && err.message);
    res.status(500).json({ success: false, allowed: false, message: 'Error checking voice access' });
  }
});

// Image analysis endpoint for hairstyle suggestions
router.post('/analyze-image', checkPlan('Growth'), upload.single('image'), async (req, res) => {
  logger.info('app', 'Image Analysis API call received.', { preferences: req.body.preferences, concerns: req.body.concerns });

  try {
    console.log("=== IMAGE DEBUG ===");
    console.log("FILE:", req.file);
    console.log("BODY:", req.body);
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload an image' 
      });
    }

    const { preferences = '', concerns = '' } = req.body;

    let imageAnalysis = '';

    // Try Google Generative AI first (best for vision)
    if (process.env.GOOGLE_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';
        
        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: `Analyze this person's appearance for hairstyle recommendations. Identify:
- Face shape (if visible)
- Current hair length and texture
- Hair color
- Current condition

Be specific and helpful. Keep it under 150 words.`
          }
        ]);
        
        imageAnalysis = result.response.text();
      } catch (googleErr) {
        console.warn('Google Generative AI failed:', googleErr.message);
        imageAnalysis = null;
      }
    }

    // Fallback: Use generic analysis
    if (!imageAnalysis) {
      imageAnalysis = `A person's photo has been uploaded for hairstyle analysis. 
Based on best practices, we recommend considering:
- Current face shape and proportions
- Hair length and texture visible in the photo
- Hair health and condition
- Personal style preferences`;
    }

    // Now use Groq to generate detailed recommendations based on the analysis
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `You are a professional Lakmé salon hairstylist.

Image Analysis Results:
${imageAnalysis}

User Preferences: ${preferences || 'No specific preference mentioned'}
Hair Concerns: ${concerns || 'None mentioned'}

Based on this analysis, provide:
1. **Top 3 Hairstyle Recommendations** - specific styles with brief descriptions
2. **Why They'll Work** - explain how each suits their features
3. **Maintenance Tips** - how to keep the style looking great
4. **Salon Services** - which Lakmé services would help achieve this look
5. **Styling Products** - recommended products for maintenance

Keep the tone professional, encouraging, and specific. Make recommendations actionable.`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 800
    });

    const analysis = completion.choices[0]?.message?.content;

    // Get a concise summary
    const groqSummary = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a beauty consultant. Summarize recommendations briefly and warmly.'
        },
        {
          role: 'user',
          content: `Summarize this in 2-3 sentences:\n\n${analysis}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 150
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
router.post('/hairstyle-recommend', moderatePrompt, async (req, res) => {
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
router.post('/hair-advice', moderatePrompt, async (req, res) => {
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
router.post('/quick-book', protect, checkPlan('Premium'), moderatePrompt, async (req, res) => {
  try {
    const { serviceName, date, timeSlot } = req.body;

    console.log('Transcript (quick-book):', serviceName);
    const services = await Service.find().select('name description price duration popular');
    const { service: matchedService, debug } = await matchServiceFromTranscript(serviceName, services);
    console.log('Detected Intent: quick-book');
    console.log('Extracted Service:', debug.extractedService);
    console.log('Available Services:', debug.availableServices);
    console.log('Matched Service:', debug.matchedService, 'Reason:', debug.reason);

    const service = matchedService;
    if (!service) {
      return res.status(404).json({ success: false, message: `Service "${serviceName}" not found.`, debug });
    }

    // validate date
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: 'Invalid date provided' });
    parsed.setHours(12,0,0,0);
    if (isPastDate(parsed)) return res.status(400).json({ success: false, message: 'Cannot book a past date' });

    const existingBooking = await Booking.findOne({
      date: parsed,
      timeSlot,
      status: { $ne: 'cancelled' }
    });

    if (existingBooking) return res.status(400).json({ success: false, message: `Sorry, ${timeSlot} is already booked. Please choose another time.` });

    // apply per-user booking limit
    try {
      const rl = await consumeUserLimit(req.user._id.toString());
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Booking limit reached for today. Please contact support or try tomorrow.' });
    } catch (e) { console.warn('User booking limiter error', e && e.message); }

    const isoDate = parsed.toISOString().slice(0,10);
    console.log('Creating booking with ISO date:', isoDate);
    const booking = await Booking.create({
      user: req.user._id,
      service: service._id,
      date: new Date(isoDate),
      timeSlot,
      totalAmount: service.price,
      status: 'confirmed'
    });

    // Send booking confirmation email to the user
    try {
      const { sendBookingConfirmation } = require('../middleware/emailService');
      const userDoc = await User.findById(req.user._id);
      const source = 'Website';
      console.log("BOOKING EMAIL DEBUG", {
        bookingId: booking?._id,
        email: booking?.email,
        name: booking?.name,
        source,
        requestBody: req.body
      });
      const sent = await sendBookingConfirmation({
        toEmail: userDoc.email,
        toName: userDoc.name,
        serviceName: service.name,
        date: new Date(date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'}),
        timeSlot,
        amount: service.price.toLocaleString(),
        loyaltyPoints: Math.floor(service.price / 10),
        source
      });
      if (!sent) {
        console.warn('Quick-book confirmation email not sent for user', req.user._id);
        await logger.warn('email', `Quick-book email failed for user ${req.user._id}`, { bookingId: booking._id });
      } else {
        await logger.info('email', `Quick-book email sent to ${userDoc.email}`, { bookingId: booking._id, service: service.name, source });
      }
    } catch (e) {
      console.error('Quick-book email error:', e.message);
      await logger.error('email', `Quick-book email error: ${e.message}`, { bookingId: booking?._id });
    }

    await logger.info('booking', `Quick booking: ${service.name} by ${req.user.email || req.user._id}`, {
      bookingId: booking._id,
      userId: req.user._id,
      service: service.name,
      timeSlot,
      amount: service.price,
      source: 'Website'
    });

    res.json({
      success: true,
      data: booking,
      message: `✅ Booking confirmed! ${service.name} on ${new Date(date).toLocaleDateString()} at ${timeSlot}`
    });

  } catch (error) {
    console.error('Quick Book Error:', error);
    await logger.error('booking', `Quick booking failed: ${error.message}`, { userId: req.user?._id });
    res.status(500).json({ 
      success: false, 
      message: 'Error creating booking. Please try again!',
      error: error.message 
    });
  }
});

// Voice limit checker middleware
async function checkVoiceLimit(req, res, next) {
  try {
    const sub = await Subscription.findOne();
    if (!sub || sub.plan === 'Free') {
      if ((sub?.voiceCallsUsed || 0) >= 2) {
        return res.status(403).json({ success: false, message: "Voice agent call limit reached. Please upgrade to the Starter plan to remove this limit. 💄" });
      }
      if (sub) {
        sub.voiceCallsUsed += 1;
        await sub.save();
      }
    }
    next();
  } catch (err) { next(); }
}

// Voice chat endpoint
const checkVoiceTrial = require('../middleware/checkVoiceTrial');
const VoiceCallLog = require('../models/VoiceCallLog');

router.post('/voice-chat', protect, checkVoiceTrial, checkPlan('Growth'), checkVoiceLimit, moderatePrompt, async (req, res) => {
  console.log("DEBUG: /voice-chat req.body received:", req.body);
  const start = new Date();
  let logEntry = null;
  try {
    // Validation check: ensure history array is provided
    if (!req.body.messages || !Array.isArray(req.body.messages)) {
      return res.status(400).json({
        success: false,
        message: "Messages array is required"
      });
    }

    const completion = await groq.chat.completions.create({
      messages: req.body.messages,
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      temperature: 0.7,
    });

    res.json(completion);
    // Log success
    try {
      const end = new Date();
      const durationSec = Math.round((end - start) / 1000);
      const durationMin = +(durationSec / 60).toFixed(2);
      const userId = req.user?._id || null;
      const email = req.user?.email || '';
      const plan = (await (require('../models/Subscription').findOne({ user: userId })) )?.plan || '';
      logEntry = await VoiceCallLog.create({
        user: userId,
        email,
        plan,
        callType: 'voice-chat',
        startTime: start,
        endTime: end,
        durationSeconds: durationSec,
        durationMinutes: durationMin,
        bookingCreated: false,
        serviceName: '',
        status: 'success'
      });
    } catch (e) { console.warn('Voice log creation failed:', e && e.message); }

  } catch (err) {
    console.error('Voice chat error:', err);
    res.status(500).json({
      error: err.message
    });
    // Log failure
    try {
      const end = new Date();
      const durationSec = Math.round((end - start) / 1000);
      const durationMin = +(durationSec / 60).toFixed(2);
      const userId = req.user?._id || null;
      const email = req.user?.email || '';
      const plan = (await (require('../models/Subscription').findOne({ user: userId })) )?.plan || '';
      await VoiceCallLog.create({
        user: userId,
        email,
        plan,
        callType: 'voice-chat',
        startTime: start,
        endTime: end,
        durationSeconds: durationSec,
        durationMinutes: durationMin,
        bookingCreated: false,
        serviceName: '',
        status: 'failed'
      });
    } catch (e) { console.warn('Voice log creation failed:', e && e.message); }
  }
});

// Voice booking endpoint
router.post('/voice-book', protect, checkVoiceTrial, checkPlan('Growth'), moderatePrompt, async (req, res) => {
  const start = new Date();
  let logId = null;
  try {
    const { serviceName, dateText, timeSlot } = req.body;
    console.log('Transcript:', serviceName);
    // load all services for matching
    const services = await Service.find().select('name description price duration popular');
    const { service: matchedService, debug } = await matchServiceFromTranscript(serviceName, services);
    console.log('Detected Intent: voice-book');
    console.log('Extracted Service:', debug.extractedService);
    console.log('Available Services:', debug.availableServices);
    console.log('Matched Service:', debug.matchedService, 'Reason:', debug.reason);

    let service = matchedService;
    if (!service) {
      // fallback: try regex on first token
      const token = (debug.extractedService || serviceName || '').split(' ')[0] || serviceName;
      const suggestions = await Service.find({
        $or: [
          { name: { $regex: token, $options: 'i' } },
          { description: { $regex: token, $options: 'i' } }
        ]
      }).limit(5).select('name');

      if (suggestions && suggestions.length > 0) {
        const names = suggestions.map(s => s.name).join(', ');
        console.log('Service lookup failed; suggestions:', names);
        return res.json({ success: false, message: `Sorry, I couldn't find "${serviceName}". Did you mean: ${names}? Please try one of these or visit the booking page.`, suggestions: suggestions.map(s=>s.name), debug });
      }

      const popular = await Service.find({ popular: true }).limit(5).select('name');
      const popularNames = popular.map(p => p.name).join(', ');
      console.log('Service lookup failed; no suggestions; returning popular list');
      return res.json({ success: false, message: `Sorry, I couldn't find "${serviceName}". Popular services include: ${popularNames}. Please try the booking page.`, suggestions: popular.map(p=>p.name), debug });
    }

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

    const TIME_SLOTS = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
      '12:00 PM','12:30 PM','01:00 PM','02:00 PM','02:30 PM','03:00 PM',
      '03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM'];
    
    // Validate not in past
    if (isPastDate(bookingDate)) return res.status(400).json({ success: false, message: 'Cannot book a past date. Please choose a future date.' });

    // Strict matching for timeSlot
    const matchedSlot = TIME_SLOTS.find(s => 
      s.toLowerCase().replace(/\s/g,'') === (timeSlot || '').toLowerCase().replace(/\s/g,'')
    );

    if (!matchedSlot) {
      // If no exact match, try fuzzy matching to suggest alternatives
      const fuzzyMatched = TIME_SLOTS.filter(s =>
        s.toLowerCase().replace(/\s/g,'').includes((timeSlot || '').toLowerCase().replace(/\s/g,'').substring(0,4)) ||
        (timeSlot || '').toLowerCase().replace(/\s/g,'').includes(s.toLowerCase().replace(/\s/g,'').substring(0,4))
      )
      const suggestions = fuzzyMatched.length > 0 ? fuzzyMatched.slice(0, 3) : TIME_SLOTS.slice(0, 3); // Fallback to popular slots if no fuzzy match
      return res.status(400).json({ success: false, message: `Sorry, "${timeSlot}" is not a valid time slot. Please choose from available slots like: ${suggestions.join(', ')}.`, alternatives: suggestions });
    }

    // Prevent double bookings for same date+slot (Moved after matchedSlot definition)
    const existing = await Booking.findOne({ date: bookingDate, timeSlot: matchedSlot, status: { $ne: 'cancelled' } });
    if (existing) return res.status(400).json({ success: false, message: `Sorry, ${matchedSlot} is already booked on that date. Please choose another slot.` });

    // per-user booking limit
    try {
      const rl = await consumeUserLimit(req.user._id.toString());
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Booking limit reached for today. Please contact support or try tomorrow.' });
    } catch (e) { console.warn('User booking limiter error', e && e.message); }

    let booking;
    try {
      const isoDate = bookingDate.toISOString().slice(0,10);
      console.log('Creating booking with ISO date:', isoDate);
      booking = await Booking.create({
        user: req.user._id,
        service: service._id,
        date: new Date(isoDate),
        timeSlot: matchedSlot,
        stylist: 'Any Available',
        totalAmount: service.price,
        status: 'confirmed'
      });
      // create success log
      try {
        const end = new Date();
        const durationSec = Math.round((end - start) / 1000);
        const durationMin = +(durationSec / 60).toFixed(2);
        const plan = (await (require('../models/Subscription').findOne({ user: req.user._id })) )?.plan || '';
        const log = await VoiceCallLog.create({
          user: req.user._id,
          email: req.user.email || '',
          plan,
          callType: 'voice-book',
          startTime: start,
          endTime: end,
          durationSeconds: durationSec,
          durationMinutes: durationMin,
          bookingCreated: true,
          serviceName: service.name,
          status: 'success'
        });
        logId = log._id;
      } catch (e) { console.warn('Voice log creation failed:', e && e.message); }
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ success: false, message: `Sorry, ${matchedSlot} was just booked. Please choose another slot.` });
      }
      throw err;
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { loyaltyPoints: Math.floor(service.price / 10) },
      $push: { bookingHistory: booking._id }
    });

    const { sendBookingConfirmation } = require('../middleware/emailService');
    const userDoc = await User.findById(req.user._id);
    const source = 'Voice Assistant';
    console.log("BOOKING EMAIL DEBUG", {
      bookingId: booking?._id,
      email: booking?.email,
      name: booking?.name,
      source,
      requestBody: req.body
    });

    const emailSent = await sendBookingConfirmation({
      toEmail: userDoc.email,
      toName: userDoc.name,
      serviceName: service.name,
      date: bookingDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }),
      timeSlot: matchedSlot,
      amount: service.price.toLocaleString(),
      loyaltyPoints: Math.floor(service.price / 10),
      source
    });
    if (!emailSent) {
      console.warn('Booking confirmation email was not sent (voice-book) for user', req.user ? req.user._id : null);
      await logger.warn('email', `Voice booking email failed for user ${req.user._id}`, { bookingId: booking._id, service: service.name });
    } else {
      await logger.info('email', `Voice booking email sent to ${userDoc.email}`, { bookingId: booking._id, service: service.name, source });
    }

    // Log voice booking
    await logger.info('voice', `Voice booking: ${service.name} by ${req.user.email || req.user._id}`, {
      bookingId: booking._id,
      userId: req.user._id,
      service: service.name,
      date: bookingDate,
      timeSlot: matchedSlot,
      amount: service.price,
      source: 'Voice Assistant'
    });

    res.json({
      success: true,
      message: `${service.name} booked for ${bookingDate.toLocaleDateString('en-IN',{day:'numeric',month:'long'})} at ${matchedSlot} — ₹${service.price.toLocaleString()}`
    });

  } catch (err) {
    console.error('Voice book error:', {
      message: err.message,
      stack: err.stack,
      body: req.body,
      user: req.user ? req.user._id : null
    });
    await logger.error('voice', `Voice booking failed: ${err.message}`, { userId: req.user?._id, body: req.body });
    // Attempt to log failure
    try {
      const end = new Date();
      const durationSec = Math.round((end - start) / 1000);
      const durationMin = +(durationSec / 60).toFixed(2);
      const plan = (await (require('../models/Subscription').findOne({ user: req.user?._id })) )?.plan || '';
      await VoiceCallLog.create({
        user: req.user?._id || null,
        email: req.user?.email || '',
        plan,
        callType: 'voice-book',
        startTime: start,
        endTime: end,
        durationSeconds: durationSec,
        durationMinutes: durationMin,
        bookingCreated: false,
        serviceName: serviceName || '',
        status: 'failed'
      });
    } catch (e) { console.warn('Voice log creation failed:', e && e.message); }
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// Debug: list bookings for a date (ISO or natural). NOT for production long-term.
router.get('/debug/bookings', async (req, res) => {
  try {
    const { date } = req.query;
    const d = parseBookingDate(date) || null;
    if (!d) return res.status(400).json({ success: false, message: 'Provide a valid date query param (e.g. ?date=tomorrow or ?date=2026-06-05)' });
    const bookings = await Booking.find({ date: d }).select('service timeSlot guestEmail guestName user status createdAt');
    res.json({ success: true, date: d.toISOString(), count: bookings.length, bookings });
  } catch (e) {
    console.error('Debug bookings error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Dev-only: create a booking and send confirmation without auth (disabled in production)
router.post('/voice-book/dev', moderatePrompt, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ success: false, message: 'Not allowed in production' });
    const { toEmail, toName, serviceName, dateText, timeSlot } = req.body;
    if (!toEmail || !serviceName) return res.status(400).json({ success: false, message: 'toEmail and serviceName required' });

    console.log('Transcript (dev voice-book):', serviceName);
    const services = await Service.find().select('name description price duration popular');
    const { service: matchedService, debug } = await matchServiceFromTranscript(serviceName, services);
    console.log('Detected Intent: dev-voice-book');
    console.log('Extracted Service:', debug.extractedService);
    console.log('Available Services:', debug.availableServices);
    console.log('Matched Service:', debug.matchedService, 'Reason:', debug.reason);

    const service = matchedService;
    if (!service) {
      return res.status(404).json({ success: false, message: `Service "${serviceName}" not found`, debug });
    }

    // parse date using shared parser
    const bookingDate = parseBookingDate(dateText) || (function(){ const d=new Date(); d.setDate(d.getDate()+1); d.setHours(12,0,0,0); return d; })();

    if (isPastDate(bookingDate)) return res.status(400).json({ success: false, message: 'Cannot create a dev booking for a past date' });

    // Attach to existing user by email or create a temporary guest user
    let userDoc = await User.findOne({ email: toEmail });
    if (!userDoc) {
      userDoc = await User.create({ name: toName || 'Guest User', email: toEmail, password: 'dev-temp-pass' });
    }

    const isoDateDev = bookingDate.toISOString().slice(0,10);
    console.log('Creating dev booking with ISO date:', isoDateDev);
    const booking = await Booking.create({
      user: userDoc._id,
      service: service._id,
      date: new Date(isoDateDev),
      timeSlot: timeSlot || '12:00 PM',
      stylist: 'Any Available',
      totalAmount: service.price,
      status: 'confirmed'
    });

    const { sendBookingConfirmation } = require('../middleware/emailService');
    const source = 'Voice Assistant';
    console.log("BOOKING EMAIL DEBUG", {
      bookingId: booking?._id,
      email: booking?.email,
      name: booking?.name,
      source,
      requestBody: req.body
    });
    const emailSent = await sendBookingConfirmation({
      toEmail,
      toName: toName || 'Valued Customer',
      serviceName: service.name,
      date: bookingDate.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'}),
      timeSlot: booking.timeSlot,
      amount: service.price.toLocaleString(),
      loyaltyPoints: Math.floor(service.price/10),
      source
    });

    if (!emailSent) console.warn('Dev booking confirmation email not sent to', toEmail);

    res.json({ success: true, message: `Dev booking created and email ${emailSent ? 'sent' : 'failed'}` });
  } catch (err) {
    console.error('Dev voice book error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public guest booking for voice assistant (production-ready)
router.post('/voice-book/guest', guestRateLimiter, moderatePrompt, async (req, res) => {
  try {
    const { toEmail, toName, serviceName, dateText, timeSlot, recaptchaToken } = req.body;
    if (!toEmail || !serviceName) return res.status(400).json({ success: false, message: 'toEmail and serviceName required' });

    // If reCAPTCHA is enabled, verify token
    if (process.env.RECAPTCHA_SECRET) {
      const vr = await verifyRecaptcha(recaptchaToken);
      if (!vr.ok) return res.status(403).json({ success: false, message: vr.message || 'reCAPTCHA failed' });
    }

    // Attempt robust service matching from transcript
    console.log('Transcript:', serviceName);
    const services = await Service.find().select('name description price duration popular');
    const { service: matchedService, debug } = await matchServiceFromTranscript(serviceName, services);
    console.log('Detected Intent: guest-voice-book');
    console.log('Extracted Service:', debug.extractedService);
    console.log('Available Services:', debug.availableServices);
    console.log('Matched Service:', debug.matchedService, 'Reason:', debug.reason);

    let service = matchedService;
    if (!service) {
      return res.status(404).json({ success: false, message: `Service "${serviceName}" not found`, debug });
    }

    const bookingDate = parseBookingDate(dateText) || (function(){ const d=new Date(); d.setDate(d.getDate()+1); d.setHours(12,0,0,0); return d; })();

    if (isPastDate(bookingDate)) return res.status(400).json({ success: false, message: 'Cannot book a past date' });
    
    // rate-limit by guest email (prevent abuse)
    try {
      const erl = await consumeEmailLimit(toEmail.toLowerCase());
      if (!erl.ok) return res.status(429).json({ success: false, message: 'Too many booking attempts for this email. Please try later.' });
    } catch (e) { console.warn('Email booking limiter error', e && e.message); }

    // Match time slot to valid slots (consistent with /voice-book endpoint)
    const TIME_SLOTS = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
      '12:00 PM','12:30 PM','01:00 PM','02:00 PM','02:30 PM','03:00 PM',
      '03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM'];
    
    const matchedSlot = TIME_SLOTS.find(s =>
      s.toLowerCase().replace(/\s/g,'').includes(
        (timeSlot || '').toLowerCase().replace(/\s/g,'').substring(0,4)
      )
    ) || timeSlot || '12:00 PM';

    // Prevent double bookings for same date+slot
    const existingGuest = await Booking.findOne({ date: bookingDate, timeSlot: matchedSlot, status: { $ne: 'cancelled' } });
    if (existingGuest) {
      // suggest alternative slots
      const booked = await Booking.find({ date: bookingDate, status: { $ne: 'cancelled' } }).select('timeSlot');
      const bookedSlots = booked.map(b => b.timeSlot);
      const alternatives = [];
      for (const s of TIME_SLOTS) {
        if (s === matchedSlot) continue;
        if (!bookedSlots.includes(s)) alternatives.push(s);
        if (alternatives.length >= 3) break;
      }
      metrics.increment('booking.conflict', { date: bookingDate.toISOString(), requested: matchedSlot, alternativesCount: alternatives.length });
      return res.status(400).json({ success: false, message: `Sorry, ${matchedSlot} is already booked on that date.`, alternatives });
    }

    let booking;
    try {
      const isoDateGuest = bookingDate.toISOString().slice(0,10);
      console.log('Creating guest booking with ISO date:', isoDateGuest);
      booking = await Booking.create({
        user: null,
        guestEmail: toEmail,
        guestName: toName || 'Guest',
        service: service._id,
        date: new Date(isoDateGuest),
        timeSlot: matchedSlot,
        stylist: 'Any Available',
        totalAmount: service.price,
        status: 'confirmed'
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ success: false, message: `Sorry, ${matchedSlot} was just booked. Please choose another slot.` });
      }
      throw err;
    }

    const { sendBookingConfirmation } = require('../middleware/emailService');
    const source = 'Voice Assistant';
    console.log("BOOKING EMAIL DEBUG", {
      bookingId: booking?._id,
      email: booking?.email,
      name: booking?.name,
      source,
      requestBody: req.body
    });
    const emailSent = await sendBookingConfirmation({
      toEmail,
      toName: toName || 'Valued Customer',
      serviceName: service.name,
      date: bookingDate.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'}),
      timeSlot: matchedSlot,
      amount: service.price.toLocaleString(),
      loyaltyPoints: 0,
      source
    });

    if (!emailSent) console.warn('Guest booking confirmation email not sent to', toEmail);

    res.json({ success: true, message: `Booking confirmed and email ${emailSent ? 'sent' : 'failed'}` });
  } catch (err) {
    console.error('Guest voice book error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Chat booking endpoint
router.post('/chat-book', protect, checkVoiceTrial, checkPlan('Growth'), moderatePrompt, async (req, res) => {
  try {
    const { serviceName, dateText, timeSlot } = req.body;

    console.log('Transcript (chat-book):', serviceName);
    const services = await Service.find().select('name description price duration popular');
    const { service: matchedService, debug } = await matchServiceFromTranscript(serviceName, services);
    console.log('Detected Intent: chat-book');
    console.log('Extracted Service:', debug.extractedService);
    console.log('Available Services:', debug.availableServices);
    console.log('Matched Service:', debug.matchedService, 'Reason:', debug.reason);

    const service = matchedService;
    if (!service) {
      // Try old fallback suggestions
      const suggestions = await Service.find({
        $or: [
          { name: { $regex: (debug.extractedService || serviceName).split(' ')[0] || serviceName, $options: 'i' } },
          { description: { $regex: (debug.extractedService || serviceName).split(' ')[0] || serviceName, $options: 'i' } }
        ]
      }).limit(5).select('name');

      if (suggestions && suggestions.length > 0) {
        const names = suggestions.map(s => s.name).join(', ');
        return res.json({ success: false, message: `Sorry, I couldn't find "${serviceName}". Did you mean: ${names}? Please try one of these or visit the booking page.`, suggestions: suggestions.map(s=>s.name), debug });
      }

      const popular = await Service.find({ popular: true }).limit(5).select('name');
      const popularNames = popular.map(p => p.name).join(', ');
      return res.json({ success: false, message: `Sorry, I couldn't find "${serviceName}". Popular services include: ${popularNames}. Please try the booking page.`, suggestions: popular.map(p=>p.name), debug });
    }

    const bookingDate = parseBookingDate(dateText);
    if (!bookingDate) return res.status(400).json({ success: false, message: `Could not understand the requested date. Received: "${dateText}". Please provide a valid date.` });
    if (isPastDate(bookingDate)) return res.status(400).json({ success: false, message: 'Cannot book a past date. Please choose a future date.' });

    const TIME_SLOTS = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
      '12:00 PM','12:30 PM','01:00 PM','02:00 PM','02:30 PM','03:00 PM',
      '03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM'];
    
    const matchedSlot = TIME_SLOTS.find(s =>
      s.toLowerCase().replace(/\s/g,'').includes(
        (timeSlot || '').toLowerCase().replace(/\s/g,'').substring(0,4)
      )
    ) || timeSlot;

    // Prevent double bookings for same date+slot
    const existingChat = await Booking.findOne({ date: bookingDate, timeSlot: matchedSlot, status: { $ne: 'cancelled' } });
    if (existingChat) return res.status(400).json({ success: false, message: `Sorry, ${matchedSlot} is already booked on that date. Please choose another slot.` });
    // per-user booking limit
    try {
      const rl = await consumeUserLimit(req.user._id.toString());
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Booking limit reached for today. Please contact support or try tomorrow.' });
    } catch (e) { console.warn('User booking limiter error', e && e.message); }

    let booking;
    try {
      const isoDate = bookingDate.toISOString().slice(0,10);
      console.log('Creating chat booking with ISO date:', isoDate);
      booking = await Booking.create({
        user: req.user._id,
        service: service._id,
        date: new Date(isoDate),
        timeSlot: matchedSlot,
        stylist: 'Any Available',
        totalAmount: service.price,
        status: 'confirmed'
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ success: false, message: `Sorry, ${matchedSlot} was just booked. Please choose another slot.` });
      }
      throw err;
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { loyaltyPoints: Math.floor(service.price / 10) },
      $push: { bookingHistory: booking._id }
    });

    const { sendBookingConfirmation } = require('../middleware/emailService');
    const userDoc = await User.findById(req.user._id);
    const source = 'Chat Assistant';
    console.log("BOOKING EMAIL DEBUG", {
      bookingId: booking?._id,
      email: booking?.email,
      name: booking?.name,
      source,
      requestBody: req.body
    });
    
    const emailSent = await sendBookingConfirmation({
      toEmail: userDoc.email,
      toName: userDoc.name,
      serviceName: service.name,
      date: bookingDate.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'}),
      timeSlot: matchedSlot,
      amount: service.price.toLocaleString(),
      loyaltyPoints: Math.floor(service.price / 10),
      source
    });
    if (!emailSent) {
      console.warn('Booking confirmation email was not sent (chat-book) for user', req.user ? req.user._id : null);
      await logger.warn('email', `Chat booking email failed for user ${req.user._id}`, { bookingId: booking._id, service: service.name });
    } else {
      await logger.info('email', `Chat booking email sent to ${userDoc.email}`, { bookingId: booking._id, service: service.name, source });
    }

    await logger.info('voice', `Chat booking: ${service.name} by ${req.user.email || req.user._id}`, {
      bookingId: booking._id,
      userId: req.user._id,
      service: service.name,
      date: bookingDate,
      timeSlot: matchedSlot,
      amount: service.price,
      source: 'Chat Assistant'
    });

    res.json({
      success: true,
      message: `${service.name} booked for ${bookingDate.toLocaleDateString('en-IN',{day:'numeric',month:'long'})} at ${matchedSlot} — ₹${service.price.toLocaleString()}`
    });

  } catch (err) {
    console.error('Chat book error:', err.message);
    await logger.error('voice', `Chat booking failed: ${err.message}`, { userId: req.user?._id });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// TTS ENDPOINT (Deprecated - browser will handle TTS)
// ═══════════════════════════════════════════════════════════

router.post('/tts', async (req, res) => {
  // TTS is now handled by browser's Web Speech API
  // This endpoint returns success but does nothing
  res.json({ success: true, message: 'Use browser speechSynthesis API instead' });
});

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function getNextDay(dayIndex) {
  const today = new Date();
  const diff = (dayIndex - today.getDay() + 7) % 7 || 7;
  today.setDate(today.getDate() + diff);
  return today;
}

// Parse natural-ish date text into a normalized Date (midday) or return null
function parseBookingDate(dateText) {
  const lower = (dateText || '').toLowerCase().trim();
  console.log('parseBookingDate - Received date:', dateText);
  if (!lower || lower.length === 0) return null;

  // handle natural language
  if (lower.includes('today')) {
    const d = new Date(); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d;
  }
  if (lower.includes('tomorrow')) {
    const d = new Date(); d.setDate(d.getDate()+1); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d;
  }

  // next <weekday> handling
  if (lower.includes('next')) {
    const wk = lower.replace('next','').trim();
    if (wk.includes('monday')) { const d = getNextDay(1); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
    if (wk.includes('tuesday')) { const d = getNextDay(2); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
    if (wk.includes('wednesday')) { const d = getNextDay(3); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
    if (wk.includes('thursday')) { const d = getNextDay(4); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
    if (wk.includes('friday')) { const d = getNextDay(5); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
    if (wk.includes('saturday')) { const d = getNextDay(6); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
    if (wk.includes('sunday')) { const d = getNextDay(0); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
  }

  // weekday names without 'next'
  if (lower.includes('monday')) { const d = getNextDay(1); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
  if (lower.includes('tuesday')) { const d = getNextDay(2); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
  if (lower.includes('wednesday')) { const d = getNextDay(3); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
  if (lower.includes('thursday')) { const d = getNextDay(4); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
  if (lower.includes('friday')) { const d = getNextDay(5); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
  if (lower.includes('saturday')) { const d = getNextDay(6); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
  if (lower.includes('sunday')) { const d = getNextDay(0); d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }

  // Try explicit numeric formats: D/M/YYYY or D-M-YYYY or DD/MM/YYYY
  const numMatch = lower.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (numMatch) {
    let day = parseInt(numMatch[1],10);
    let month = parseInt(numMatch[2],10) - 1;
    let year = parseInt(numMatch[3],10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) { d.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', d); return d; }
  }

  // Try month name formats like '18 June 2026' or 'June 18 2026' or without year
  const cleaned = (dateText || '').replace(/(st|nd|rd|th)/gi, '').trim();
  const withYear = new Date(cleaned);
  if (!isNaN(withYear.getTime())) { withYear.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', withYear); return withYear; }

  // Try appending current year if missing
  const appended = new Date(cleaned + ' ' + new Date().getFullYear());
  if (!isNaN(appended.getTime())) { appended.setHours(12,0,0,0); console.log('parseBookingDate - Parsed date:', appended); return appended; }

  // Give up
  console.log('parseBookingDate - Could not parse date:', dateText);
  return null;
}

// Normalize text: lowercase, remove punctuation, collapse spaces
function normalizeText(t) {
  if (!t) return '';
  return t.toLowerCase().replace(/[\p{P}$+<=>^`|~]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  if (!a || !b) return Math.max(a?.length||0, b?.length||0);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m+1 }, () => new Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0]=i;
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++){
    for (let j=1;j<=n;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

// Extract probable service phrase from a conversational transcript
function extractServicePhrase(transcript) {
  if (!transcript) return '';
  const filler = ['i', 'would', 'like', 'to', 'book', 'a', 'an', 'please', 'can', 'could', 'want', 'need', 'for', 'today', 'tomorrow', 'on', 'at', 'need', 'bookings', 'booking', 'appointment', 'appointments', 'my', 'help'];
  let norm = normalizeText(transcript);
  // remove filler words
  const tokens = norm.split(' ').filter(t => t && !filler.includes(t));
  // try to return contiguous n-grams from end to beginning (longer first)
  for (let len = Math.min(4, tokens.length); len >= 1; len--) {
    for (let start = 0; start + len <= tokens.length; start++) {
      const phrase = tokens.slice(start, start+len).join(' ');
      if (phrase.length > 1) return phrase;
    }
  }
  return tokens.join(' ');
}

// Given a transcript and list of Service docs, return best match and debug info
async function matchServiceFromTranscript(transcript, services) {
  const debug = {};
  debug.transcript = transcript;
  const extracted = extractServicePhrase(transcript);
  debug.extractedService = extracted;
  debug.availableServices = services.map(s => s.name);

  const normExtract = normalizeText(extracted);
  // 1) exact includes (best)
  for (const s of services) {
    const n = normalizeText(s.name);
    if (n === normExtract || n.includes(normExtract) || normExtract.includes(n)) {
      debug.matchedService = s.name;
      debug.reason = 'exact_include';
      return { service: s, debug };
    }
  }

  // 2) token overlap: count shared tokens
  const exTokens = new Set(normExtract.split(' ').filter(Boolean));
  let best = null; let bestScore = 0;
  for (const s of services) {
    const stoks = normalizeText(s.name).split(' ').filter(Boolean);
    let score = 0;
    for (const t of stoks) if (exTokens.has(t)) score++;
    if (score > bestScore) { bestScore = score; best = s; }
  }
  if (best && bestScore > 0) {
    debug.matchedService = best.name;
    debug.reason = 'token_overlap';
    debug.score = bestScore;
    return { service: best, debug };
  }

  // 3) fuzzy Levenshtein distance normalized by length
  let bestLev = null; let bestLevScore = Infinity;
  for (const s of services) {
    const n = normalizeText(s.name);
    const lev = levenshtein(n, normExtract);
    const norm = lev / Math.max(n.length, normExtract.length, 1);
    if (norm < bestLevScore) { bestLevScore = norm; bestLev = s; }
  }
  if (bestLev && bestLevScore <= 0.45) {
    debug.matchedService = bestLev.name;
    debug.reason = 'levenshtein';
    debug.levenshteinNorm = bestLevScore;
    return { service: bestLev, debug };
  }

  debug.matchedService = null;
  debug.reason = 'no_match';
  return { service: null, debug };
}

// Check whether a booking date (Date object) is in the past (relative to local date)
function isPastDate(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return true;
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date(dateObj);
  d.setHours(0,0,0,0);
  return d < today;
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = router;