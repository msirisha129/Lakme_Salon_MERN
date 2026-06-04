const bannedWords = [
  'fuck','fucking','shit','bitch','bastard','asshole','cunt','motherfucker','dick','pussy','slut','whore'
];

function containsProfanity(text) {
  if (!text) return false;
  const lowered = text.toLowerCase();
  for (const w of bannedWords) {
    const re = new RegExp("\\b" + w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + "\\b", 'i');
    if (re.test(lowered)) return true;
  }
  return false;
}

// Basic relevance check: very short or gibberish-like messages are flagged as irrelevant
function isIrrelevant(text) {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  // if too many non-letter characters, likely gibberish
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const ratio = letters / Math.max(1, trimmed.length);
  if (ratio < 0.4) return true;
  return false;
}

function moderateText(text) {
  if (!text || typeof text !== 'string') return { ok: false, reason: 'missing' };
  if (containsProfanity(text)) return { ok: false, reason: 'profanity' };
  if (isIrrelevant(text)) return { ok: false, reason: 'irrelevant' };
  // Ensure text is on-topic (salon-related) for general assistant queries
  const salonKeywords = ['salon','lakm','lakme','hair','hairstyle','booking','appointment','service','spa','facial','manicure','pedicure','stylist','makeup','wax','threading','color','keratin','treatment','style'];
  const lowered = text.toLowerCase();
  const hasSalonKeyword = salonKeywords.some(k => lowered.includes(k));
  if (!hasSalonKeyword) return { ok: false, reason: 'off-topic' };
  return { ok: true };
}

// Express middleware to moderate content from req.body fields
function moderatePrompt(req, res, next) {
  // Try common fields where user text may appear
  const candidates = [];
  if (req.body) {
    // If messages array present (chat/voice endpoints), prefer last user message
    if (Array.isArray(req.body.messages) && req.body.messages.length) {
      const lastUser = [...req.body.messages].reverse().find(m => m.role === 'user' || m.role === 'User' || m.from === 'user');
      if (lastUser && lastUser.content) candidates.push(String(lastUser.content));
    }
    const keys = ['message','prompt','transcript','text','question','preferences','concerns','description','note','comment','serviceName','dateText','timeSlot','toName','toEmail'];
    for (const k of keys) if (req.body[k]) candidates.push(String(req.body[k]));
    // Also capture concatenated values from form-like payloads
    if (req.body.answers && typeof req.body.answers === 'object') {
      candidates.push(Object.values(req.body.answers).join(' '));
    }
  }

  const text = candidates.find(Boolean) || '';
  const result = moderateText(text);
  if (!result.ok) {
    // For booking-related requests, be more lenient - skip moderation
    const bookingRelated = ['serviceName','dateText','timeSlot','toName','toEmail'];
    const hasBookingFields = bookingRelated.some(k => req.body && req.body[k]);
    if (hasBookingFields && result.reason === 'missing') {
      // Skip moderation for booking requests with empty text but valid booking fields
      return next();
    }
    // Allow booking-related requests even if flagged as off-topic/irrelevant when explicit booking fields present
    if (hasBookingFields && (result.reason === 'off-topic' || result.reason === 'irrelevant')) {
      return next();
    }
    return res.status(400).json({ success: false, message: 'Your message was rejected: ' + result.reason });
  }
  return next();
}

module.exports = { moderatePrompt, moderateText, containsProfanity, isIrrelevant };
