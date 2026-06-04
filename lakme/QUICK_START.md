# 🚀 QUICK START — Env Variables Checklist

## Summary
**7 variables → Full working app with voice booking + chat**
**+14 optional → Add AI, SMS, rate limiting, etc.**

---

## Step 1: Copy-Paste (5 minutes)

### Backend: Create `lakme/backend/.env`
Copy this exactly:
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

### Frontend: Create `lakme/frontend/.env`
Copy this exactly:
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Step 2: Fill in Your Values (1 minute per field)

| Variable | What To Put | How To Get |
|----------|------------|-----------|
| `MONGO_URI` | Your MongoDB connection string | MongoDB Atlas or localhost |
| `JWT_SECRET` | Any random string | Just make one up |
| `EMAIL_USER` | Your Gmail address | your-email@gmail.com |
| `EMAIL_PASS` | Gmail App Password (NOT regular password) | Google Account → Security → App passwords |
| `EMAIL_FROM` | Display name | e.g., "Lakme Salon <your-email@gmail.com>" |

### Getting Gmail App Password (most common):
1. Go to https://myaccount.google.com
2. Left sidebar → Security
3. 2-Step Verification (enable if not already)
4. Scroll down → App passwords
5. Select "Mail" and "Windows Computer"
6. Google gives you a 16-char password → copy it to `EMAIL_PASS`

---

## Step 3: Start Both Servers (2 minutes)

```bash
# Terminal 1: Backend
cd lakme/backend
npm install
npm start
# Should see: "Server running on port 5000"

# Terminal 2: Frontend (new terminal)
cd lakme/frontend
npm install
npm start
# Should open http://localhost:3000 in your browser
```

---

## Step 4: Test the App (3 minutes)

✅ **Voice Assistant:**
- Click mic button in app
- Say "I want to book a service"
- It will ask for name, service, date, time
- Confirm and booking saves

✅ **Chat:**
- Type or upload image
- Ask "what services do you have"
- Get AI responses

✅ **Email:**
- Complete a booking
- Check your email for confirmation
- If no email: check backend logs for errors

---

## What You Get With 7 Variables:
✅ User login/register
✅ Voice booking (mic input + voice output)
✅ Chat booking
✅ Email confirmations
✅ Database storage
✅ Rate limiting (in-memory)
✅ All core features

---

## Optional Add-ons (if you want these features):

### Add AI Responses
```
GROQ_API_KEY=gsk_xxxxx
```
- Get from: https://console.groq.com
- Enables better hairstyle advice, recommendations

### Add SMS/WhatsApp Notifications
```
TWILIO_ACCOUNT_SID=AC_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE=+1234567890
TWILIO_WHATSAPP=whatsapp:+1234567890
```
- Get from: https://www.twilio.com

### Add Spam Protection
```
RECAPTCHA_SECRET=xxxxx
```
- Get from: https://www.google.com/recaptcha/admin

### Add Multi-Server Rate Limiting
```
REDIS_URL=redis://localhost:6379
```
- Install Redis locally or use Redis Cloud

---

## Troubleshooting

**Email not sending?**
- Check backend `.env` has EMAIL_USER/PASS correct
- Watch backend terminal logs: `npm start`
- Use Gmail App Password, not regular password

**Database connection error?**
- Make sure MongoDB is running (or use MongoDB Atlas cloud)
- Check MONGO_URI is correct in `.env`

**Frontend can't reach backend?**
- Check REACT_APP_API_URL = http://localhost:5000/api
- Verify backend is running on port 5000

**Voice not working?**
- Check browser allows microphone permission
- Open DevTools Console → watch for errors
- Try using Chrome/Chromium browser

---

## Files You Just Filled In
```
lakme/
├── backend/
│   └── .env           ← Your file (created with 7-9 vars)
├── frontend/
│   └── .env           ← Your file (created with 1 var)
├── ENV_SETUP.md       ← Reference (created)
└── README.md          ← (existing, check for more info)
```

---

## Next Steps
1. Fill `.env` files with values from Step 2
2. Run `npm start` in both backend and frontend
3. Open http://localhost:3000
4. Test voice → chat → booking
5. Check email for confirmation

**Any errors? Look at backend terminal logs first — they usually explain the issue!**
