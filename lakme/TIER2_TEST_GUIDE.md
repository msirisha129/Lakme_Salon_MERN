# TIER 2 Smart Interactions - Test Guide

## Quick Start
1. Ensure backend running: `npm start` (from `backend/`)
2. Start frontend: `npm start` (from `frontend/`)
3. Navigate to http://localhost:3000
4. Scroll to AI Assistant section or click "Speak to Us" card

---

## Test Scenarios

### 1. Intent Detection - Cancellation
**What to Test:** User can cancel booking and save draft
```
Step 1: Click "Speak to Us" button
Step 2: Say "I'd like to book a haircut"
Step 3: Provide name: "John Doe"
Step 4: Provide phone: "9876543210"
Step 5: Say "Cancel" or "Never mind"
Expected: Assistant says "Your booking has been saved as a draft"
Result: ✅ Booking saved to localStorage:lakme_booking_draft
```

### 2. Intent Detection - Repeat/Clarification
**What to Test:** User can ask for recap of booking details
```
Step 1: Click "Speak to Us"
Step 2: Say "Book a facial"
Step 3: Provide name: "Jane Smith"
Step 4: Provide phone: "9123456789"
Step 5: Say "Repeat" or "Say again"
Expected: Assistant recaps all details so far
Result: ✅ Shows name, phone, service entered
```

### 3. Price Inquiry - Before Booking
**What to Test:** Real prices displayed from database
```
Step 1: Click "Speak to Us"
Step 2: Say "How much does a hair spa cost?"
Expected: Assistant says "The Hair Spa costs ₹[price], takes [duration] minutes"
Result: ✅ Actual price from Service model shown
```

### 4. Price Inquiry - During Booking
**What to Test:** Price lookup mid-booking
```
Step 1: Click "Speak to Us"
Step 2: Say "Book a bridal makeup"
Step 3: Provide name and phone
Step 4: Say "What's the price?" or "How much is it?"
Expected: Assistant shows Bridal Makeup price before proceeding
Result: ✅ Price retrieved and displayed inline
```

### 5. Location Inquiry
**What to Test:** Location information provided on demand
```
Step 1: Click "Speak to Us"
Step 2: Say "Where is your salon?"
Expected: Assistant provides address: "Lakme Studio, Fashion Street, Mumbai"
Result: ✅ Location shown with hours (10 AM - 8 PM)
```

### 6. Service Fuzzy Matching
**What to Test:** Variations of service names are recognized
```
Test Cases:
- Say "hair cut" (should match "Hair Cut")
- Say "facial treatment" (should suggest "Facial" or similar)
- Say "manicure" (should match exactly)
- Say "bridal look" (should suggest "Bridal Makeup")
Expected: Assistant confirms service or suggests closest matches
Result: ✅ Fuzzy matching working, user can select suggested service
```

### 7. Acknowledgments in Conversation
**What to Test:** Natural acknowledgments appear throughout booking
```
Step 1: Click "Speak to Us"
Expected: Hear one of: "Got it!", "Perfect!", "Noted!", "Understood!", "Great!", "Thanks for that!", "Excellent!"
Step 2: Provide name
Expected: Response starts with acknowledgment like "[Ack], John. Now, what is your 10-digit phone number?"
Step 3: Provide phone
Expected: "[Ack]. Your phone number is [phone]. Now, which service..."
Step 4: Provide service
Expected: "[Ack]. You want a [service]. When would you like..."
Result: ✅ Each step acknowledges user input with natural language
```

### 8. Voice Quality - Rate and Pitch
**What to Test:** Speech sounds more natural with rate/pitch adjustments
```
Step 1: Listen to responses
Expected: Short prompts sound slightly slower (clearer)
Expected: Long explanations sound slightly faster (engaging)
Expected: Pitch slightly higher (warmer, less robotic)
Step 2: Compare to TIER 1 responses
Expected: TIER 2 sounds warmer and more personalized
Result: ✅ Voice quality improved
```

### 9. Hesitation Detection
**What to Test:** Assistant prompts user if they go silent
```
Step 1: Click "Speak to Us" button and don't say anything
Expected: After ~3 seconds of silence, assistant says gentle prompt
Expected: Prompt matches current step context
Step 2: If in "askName" step and silent
Expected: Hears "Take your time. What's your full name?"
Step 3: If in "askService" step and silent
Expected: Hears "Which service are you interested in?"
Result: ✅ Hesitation detected and gentle prompt provided
```

### 10. Complete Booking with TIER 2 Features
**What to Test:** Full booking flow with all TIER 2 features working
```
Step 1: Click "Speak to Us"
Step 2: Say "Book Hair Spa for tomorrow at 2 PM"
Expected: 
- Assistant asks for name (with ack)
- You say "Sarah Johnson" (gets ack)
- Assistant asks for phone (with ack)
- You say "9876543210" (gets ack)
- Assistant asks for service (with ack)
- You say "Hair Spa" (fuzzy matched, shows price)
- Assistant asks for date (with ack)
- You say "tomorrow" (parsed correctly)
- Assistant asks for time (with ack)
- You say "2 PM" (normalized to time slot)
- Assistant asks for email (if guest)
- You provide email
- Assistant shows full confirmation
- You say "Yes" to confirm
- Booking created in database

Result: ✅ Full TIER 2 feature suite working seamlessly
```

---

## Browser Console Logging

Watch for these [TIER2] logs to verify feature execution:
```javascript
[TIER2] Detected intent: [intent_type]  // Intent detection
[TIER2] Service lookup error...         // Fuzzy matching
[TIER2] Price inquiry...                // Price fetch
[TIER2] Hesitation detected in step...  // Hesitation detection
```

---

## Troubleshooting

### Issue: Prices not showing
**Check:**
1. Backend `/api/services` endpoint returns service objects with `price` field
2. MongoDB Service model has `price` field populated
3. Network tab shows successful GET /api/services call
4. Open browser DevTools → Console for errors

### Issue: Acknowledgments not appearing
**Check:**
1. Verify `getAcknowledgment()` is defined
2. Check that booking steps call this function
3. Listen carefully - they're varied, so might sound different each time
4. Check console logs for [TIER2] messages

### Issue: Voice quality not improved
**Check:**
1. Browser supports Web Speech Synthesis
2. Female English voice available on system
3. Verify `enhancedSpeak()` is being called
4. Check if browser supports pitch/rate adjustment

### Issue: Hesitation prompts not triggering
**Check:**
1. Go silent for 3+ seconds during booking step
2. Verify `bookingStepRef.current` has a value
3. Check console for "[TIER2] Hesitation detected" message
4. Try different booking steps (name, phone, service)

---

## Feature Checklist

Track which features are working:
- [ ] Intent detection (all 6 intent types)
- [ ] Service fuzzy matching
- [ ] Price lookup from backend
- [ ] Acknowledgments in every step
- [ ] Hesitation detection & prompts
- [ ] Voice quality improvements
- [ ] Complete booking with all features

---

## Performance Notes

- Intent detection: <1ms (regex-based)
- Fuzzy matching: <100ms (API call to services)
- Price lookup: <100ms (API call to services)
- Acknowledgment selection: <1ms (random from array)
- Voice synthesis: depends on browser/OS

**Expected latency:** No noticeable delay in responses
