let redisClient = null;
let RateLimiterRedis = null;
try {
  const Redis = require('ioredis');
  redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
  RateLimiterRedis = require('rate-limiter-flexible').RateLimiterRedis;
} catch (e) {
  // If packages not present or env not set, we'll fallback to in-memory
  redisClient = null;
  RateLimiterRedis = null;
}

// In-memory fallbacks
const userMap = new Map();
const emailMap = new Map();

function _now() { return Date.now(); }

async function consumeUserLimit(userId) {
  const max = Number(process.env.USER_BOOKINGS_PER_DAY || 3);
  const duration = Number(process.env.USER_BOOKINGS_WINDOW_SEC || 24 * 3600);
  const key = `user_booking_${userId}`;
  if (redisClient && RateLimiterRedis) {
    const rl = new RateLimiterRedis({ storeClient: redisClient, keyPrefix: 'user_booking_rl', points: max, duration });
    try { await rl.consume(userId); return { ok: true }; } catch (rej) { return { ok: false, retryAfter: rej.msBeforeNext }; }
  }

  // fallback in-memory: sliding window
  const now = _now();
  const windowMs = duration * 1000;
  const arr = userMap.get(key) || [];
  const recent = arr.filter(ts => now - ts < windowMs);
  if (recent.length >= max) return { ok: false };
  recent.push(now);
  userMap.set(key, recent);
  return { ok: true };
}

async function consumeEmailLimit(email) {
  const max = Number(process.env.GUEST_EMAIL_BOOKINGS_PER_DAY || 2);
  const duration = Number(process.env.GUEST_EMAIL_BOOKINGS_WINDOW_SEC || 24 * 3600);
  const key = `email_booking_${email}`;
  if (redisClient && RateLimiterRedis) {
    const rl = new RateLimiterRedis({ storeClient: redisClient, keyPrefix: 'email_booking_rl', points: max, duration });
    try { await rl.consume(email); return { ok: true }; } catch (rej) { return { ok: false, retryAfter: rej.msBeforeNext }; }
  }

  const now = _now();
  const windowMs = duration * 1000;
  const arr = emailMap.get(key) || [];
  const recent = arr.filter(ts => now - ts < windowMs);
  if (recent.length >= max) return { ok: false };
  recent.push(now);
  emailMap.set(key, recent);
  return { ok: true };
}

module.exports = { consumeUserLimit, consumeEmailLimit };
