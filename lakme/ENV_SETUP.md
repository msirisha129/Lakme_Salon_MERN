# Environment Variables Setup Guide

## Quick Summary
- **Backend (.env):** 7 REQUIRED + 12 OPTIONAL = 19 total
- **Frontend (.env):** 1 REQUIRED + 1 OPTIONAL = 2 total

---

## BACKEND (`lakme/backend/.env`) — 7 REQUIRED + 12 OPTIONAL

### ✅ REQUIRED (7 vars — copy-paste this to get started)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/lakme_salon
JWT_SECRET=lakme_dev_secret_12345
JWT_EXPIRE=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Lakme Salon <your-email@gmail.com>
```

**What each does:**
- `PORT` — server runs on this port
- `MONGO_URI` — where your database is (local or cloud)
- `JWT_SECRET` — signing key for login tokens
- `JWT_EXPIRE` — how long tokens last
- `EMAIL_*` — sends booking confirmations and contact emails

**Where to get values:**
- `MONGO_URI` — set up MongoDB locally or use MongoDB Atlas cloud (get connection string)
- `EMAIL_USER` / `EMAIL_PASS` — your Gmail account
  - For Gmail: use "App Password" (Google Account → Security → App passwords) not your regular password
  - Or use any SMTP provider (Ethereal, SendGrid, AWS SES, etc.)

---

### 🔵 OPTIONAL (12 vars — add only if you want these features)

**Rate Limiting & Abuse Prevention:**
```
REDIS_URL=redis://localhost:6379
USER_BOOKINGS_PER_DAY=3
USER_BOOKINGS_WINDOW_SEC=86400
GUEST_EMAIL_BOOKINGS_PER_DAY=2
GUEST_EMAIL_BOOKINGS_WINDOW_SEC=86400
GUEST_BOOKING_MAX=5
RECAPTCHA_SECRET=your_recaptcha_secret
RECAPTCHA_THRESHOLD=0.5
```
- `REDIS_URL` — for multi-server rate limiting (skip if single-server dev)
- `USER_BOOKINGS_PER_DAY` — max bookings per user per day (default 3)
- Others — tune booking limits, guest limits, reCAPTCHA

**AI & Hairstyle Features:**
```
GROQ_API_KEY=gsk_xxxxx
HUGGINGFACE_API_KEY=hf_xxxxx
DEEPGRAM_API_KEY=xxxxx
```
- `GROQ_API_KEY` — for AI chat responses (get from groq.com console)
- `HUGGINGFACE_API_KEY` — for hairstyle image analysis (optional)
- `DEEPGRAM_API_KEY` — for voice transcription (optional)

**SMS & WhatsApp (Twilio):**
```
TWILIO_ACCOUNT_SID=AC_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE=+1234567890
TWILIO_WHATSAPP=whatsapp:+1234567890
```
- Only needed if you want to send SMS/WhatsApp messages via contact form

**Alternative Email (Resend instead of SMTP):**
```
RESEND_API_KEY=re_xxxxx
```
- Use Resend.com for email sending (alternative to SMTP)

**Other:**
```
TEST_EMAIL=test@example.com
NODE_ENV=development
```

---

## FRONTEND (`lakme/frontend/.env`) — 1 REQUIRED + 1 OPTIONAL

### ✅ REQUIRED (1 var)
```
REACT_APP_API_URL=http://localhost:5000/api
```
- **What it does:** tells the React app where the backend API is

---

### 🔵 OPTIONAL (1 var)
```
REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```
- Only if you enable Google reCAPTCHA v3 for the frontend

---

## Minimal Setup (just copy-paste these to get started)

### Step 1: Create `lakme/backend/.env`
```bash
# Copy-paste this into backend/.env
PORT=5000
MONGO_URI=mongodb://localhost:27017/lakme_salon
JWT_SECRET=lakme_dev_secret_12345
JWT_EXPIRE=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Lakme Salon <your-email@gmail.com>
```

### Step 2: Create `lakme/frontend/.env`
```bash
# Copy-paste this into frontend/.env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 3: Replace placeholders
- `your-email@gmail.com` → your actual Gmail
- `your-app-password` → Gmail app password (NOT regular password)
- `mongodb://localhost:27017/lakme_salon` → your MongoDB URI

### Step 4: Start both servers
```bash
# Terminal 1: Backend
cd lakme/backend
npm install
npm start

# Terminal 2: Frontend
cd lakme/frontend
npm install
npm start
```

---

## What Functionality You Get With Each Tier

### With 7 REQUIRED vars only:
✅ User registration & login
✅ Voice booking (mic input → voice output)
✅ Chat booking
✅ Booking confirmations via email
✅ All core features

### Adding OPTIONAL vars:
+ Groq API → Better AI responses (hairstyle advice, recommendations)
+ Redis → Multi-server rate limiting
+ Twilio → SMS/WhatsApp notifications
+ reCAPTCHA → Anti-spam protection
+ Resend API → Alternative email sending

---

## Quick Reference: Where Each Variable Is Used

| Variable | Used In | Purpose |
|----------|---------|---------|
| `PORT` | `backend/server.js` | Server port |
| `MONGO_URI` | `backend/server.js` | Database connection |
| `JWT_SECRET` | `backend/middleware/auth.js` | Sign JWT tokens |
| `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_HOST`, `EMAIL_PORT` | `backend/middleware/emailService.js` | Send booking emails |
| `GROQ_API_KEY` | `backend/routes/ai.js` | AI chat responses |
| `RECAPTCHA_SECRET` | `backend/routes/ai.js` | Spam check |
| `REDIS_URL` | `backend/middleware/bookingRateLimiter.js` | Rate limiting |
| `TWILIO_*` | `backend/routes/contact.js` | SMS/WhatsApp sending |
| `REACT_APP_API_URL` | `frontend/src/utils/api.js` | API base URL |
| `REACT_APP_RECAPTCHA_SITE_KEY` | `frontend/src/components/AIAssistantSection.js` | reCAPTCHA on frontend |

---

## Total Count
- **Backend required:** 7 variables
- **Backend optional:** 12 variables
- **Frontend required:** 1 variable
- **Frontend optional:** 1 variable

**TOTAL: 21 environment variables available**

For a quick start: **use 8 variables** (7 backend required + 1 frontend required) and you'll have full booking + chat + voice functionality.
