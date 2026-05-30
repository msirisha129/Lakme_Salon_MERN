// AIAssistantSection.js — Lakmé Salon AI Assistant Section
import React from 'react';
// Uses Groq API (FREE — no credit card) + browser Web Speech API (free)
// Get your free key at https://console.groq.com → set window.GROQ_KEY = "gsk_..."
// Usage: React.createElement(AIAssistantSection, { onOpenChat: openHairAIChat })

// ─── Voice Assistant Modal ────────────────────────────────────────────────────
function VoiceAssistantModal({ onClose }) {
  const [phase, setPhase] = React.useState('idle'); // idle | speaking | listening | thinking
  const [transcript, setTranscript] = React.useState('');
  const [messages, setMessages] = React.useState([]);
  const [statusText, setStatusText] = React.useState('Click the mic to start');
  const synthRef = React.useRef(window.speechSynthesis);
  const recognitionRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);
  var _rs = React.useState(null);
  var registrationStep = _rs[0], setRegistrationStep = _rs[1];
  var registrationStepRef = React.useRef(null);
  var _rd = React.useState({});
  var registrationData = _rd[0], setRegistrationData = _rd[1];
  const SALON_SYSTEM = `You are Lakmé Salon's warm, elegant voice assistant. Keep replies to 2-3 sentences since they are read aloud.

You help with:
- Services: Hair Cut & Styling, Colour, Highlights/Balayage, Hair Spa, Bridal Makeup, Party Makeup, Facial, Manicure, Pedicure, Waxing, Threading
- Booking appointments
- Pricing enquiries  
- General salon info
- Registering new customers

IMPORTANT RULES:
- NEVER say you cannot help or cut off the conversation
- If asked something outside salon topics, gently redirect: "That's a bit outside my expertise, but I'd love to help you with your beauty needs!"
- Always stay warm, engaged and helpful
- If user seems confused, ask a clarifying question
- Never end conversation abruptly
- If booking details are given, confirm them back warmly
- Always sound premium and professional
- If user is already logged in and gives booking details, confirm the booking directly

If someone wants to register, collect name and phone then redirect to registration page.
If someone gives booking details (name + service + date + time), confirm it warmly and say confirmation email will be sent.`;
 React.useEffect(() => {
  var timer = setTimeout(() => greetUser(), 600);
  return () => clearTimeout(timer);
  return () => {
    synthRef.current && synthRef.current.cancel();
    recognitionRef.current && recognitionRef.current.abort();
  };
}, []);
React.useEffect(function() {
  registrationStepRef.current = registrationStep;
}, [registrationStep]);

  React.useEffect(() => {
    messagesEndRef.current && messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

 function greetUser() {
  var greeting = "Hello! Welcome to Lakmé Salon. I'm your personal beauty assistant. You can ask about services, book appointments, or say I want to register to create an account!";
  addMessage('assistant', greeting);
  // Wait for voices to load before speaking
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = function() {
      speak(greeting);
    };
  } else {
    speak(greeting);
  }
}

  function addMessage(role, text) {
    setMessages(function(prev) {
      return prev.concat([{ role: role, text: text, id: Date.now() + Math.random() }]);
    });
  }

  function speak(text) {
    synthRef.current && synthRef.current.cancel();
    setPhase('speaking');
    setStatusText('Speaking…');
    var clean = text.replace(/[^\x00-\x7F]/g, '');
    var utt = new SpeechSynthesisUtterance(clean);
    utt.rate = 0.92;
    utt.pitch = 1.08;
    var voices = (synthRef.current && synthRef.current.getVoices()) || [];
    var v = voices.find(function(v) { return v.lang.startsWith('en') && /female|samantha|zira|google uk/i.test(v.name); })
          || voices.find(function(v) { return v.lang.startsWith('en'); })
          || null;
    if (v) utt.voice = v;
 utt.onend = function() {
  setPhase('idle');
  setStatusText('Listening again…');
  // Wait until speech fully finishes, then auto-listen
  setTimeout(function() {
    // Don't auto-listen during registration flow
    if (registrationStep !== null) {
      setStatusText('Tap mic to speak');
      return;
    }
    try {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        startListening();
      } else {
        setStatusText('Tap mic to speak');
      }
    } catch(e) {
      setStatusText('Tap mic to speak');
    }
  }, 1500); // 1.5 second gap after speaking ends
};
utt.onerror = function() {
  setPhase('idle');
  setStatusText('Tap mic to speak');
};
synthRef.current && synthRef.current.speak(utt);
  }

 async function askGroq(userText) {
  // ── REGISTRATION FLOW ──
if (registrationStep === 'askName') {
  setRegistrationData(function(prev) { return Object.assign({}, prev, { name: userText }); });
  setRegistrationStep('askPhone');
  var q = "Thank you! What's your phone number?";
  addMessage('assistant', q);
  speak(q);
  return;
}
if (registrationStep === 'askPhone') {
  var phone = userText.replace(/\D/g, '').slice(-10);
  setRegistrationData(function(prev) { return Object.assign({}, prev, { phone: phone }); });
  setRegistrationStep(null);
  var name = registrationData.name;
  var msg = "Perfect! I have your name as " + name + " and phone as " + phone + ". Taking you to registration now — just add your email and password to complete!";
  addMessage('assistant', msg);
  speak(msg);
  setTimeout(function() {
    window.location.href = '/register?name=' + encodeURIComponent(name) + '&phone=' + encodeURIComponent(phone);
  }, 3000);
  return;
}
// Already registered — wants to book
if (/already.*(register|account|member)|have.*(account|registered)/i.test(userText)) {
  var alreadyMsg = "Welcome back! Let me help you book an appointment. Which service would you like to book?";
  setBookingStep('askService'); // if you have booking flow
  addMessage('assistant', alreadyMsg);
  speak(alreadyMsg);
  return;
}

// New registration
if (/register|sign up|signup|create account|new account/i.test(userText)) {
  setRegistrationStep('askName');
  var r = "I'd love to help you register! First, what's your full name?";
  addMessage('assistant', r);
  speak(r);
  return;
}

// Irrelevant questions
if (/weather|cricket|movie|news|stock|politics|sports|recipe|cook|travel|hotel|flight/i.test(userText)) {
  var sorry = "I'm sorry, I can only assist with Lakmé Salon services, bookings, and appointments. How can I help you with your beauty needs today?";
  addMessage('assistant', sorry);
  speak(sorry);
  return;
}
  setPhase('thinking');
  setStatusText('Thinking…');

 // ── CHECK CONVERSATION FOR COMPLETE BOOKING DETAILS ──
var fullConvo = messages.slice(-6).map(function(m) { return m.text; }).join(' ') + ' ' + userText;

var serviceMatch = fullConvo.match(/haircut|hair cut|manicure|pedicure|facial|colour|color|highlights|balayage|spa|makeup|waxing|threading|bridal/i);
var timeMatch = fullConvo.match(/\d{1,2}[:.]\d{2}\s*(am|pm)|\d{1,2}\s*(am|pm)/i);
var dateMatch = fullConvo.match(/today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(st|nd|rd|th)?/i);

if (serviceMatch && timeMatch && dateMatch) {
  var token = localStorage.getItem('lakme_token');
  if (!token) {
    var loginMsg = "To complete your booking, please log in first. Shall I take you to the login page?";
    addMessage('assistant', loginMsg);
    speak(loginMsg);
    return;
  }
  try {
    setStatusText('Booking your appointment…');
    var bookRes = await fetch('/api/ai/voice-book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        serviceName: serviceMatch[0],
        dateText: dateMatch[0],
        timeSlot: timeMatch[0]
      })
    });
    var bookData = await bookRes.json();
    if (bookData.success) {
      var confirmMsg = "Perfect! " + bookData.message + ". A confirmation email has been sent to you. We look forward to seeing you!";
      addMessage('assistant', confirmMsg);
      speak(confirmMsg);
      setPhase('idle');
      return;
    }
  } catch(bookErr) {
    console.log('Voice booking error:', bookErr);
  }
}

  // Normal AI chat
  try {
    var res = await fetch('/api/ai/voice-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SALON_SYSTEM },
          ...messages.slice(-8).map(function(m) { return { role: m.role, content: m.text }; }),
          { role: 'user', content: userText }
        ]
      })
    });
    var data = await res.json();
    var reply = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
      || "I'm sorry, I couldn't understand that. Please try again!";
    addMessage('assistant', reply);
    speak(reply);
  } catch(e) {
    var fallback = "I'm having a little trouble connecting. Please call us or use our chat!";
    addMessage('assistant', fallback);
    speak(fallback);
  }
}

  function startListening() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { setStatusText('Voice not supported – please use Message AI instead'); return; }
  synthRef.current && synthRef.current.cancel();

  // Abort any existing recognition cleanly
  if (recognitionRef.current) {
    try { recognitionRef.current.abort(); } catch(e) {}
  }

  var r = new SR();
  r.lang = 'en-IN';
  r.continuous = true;          // ← FIX 1: don't stop on first pause
  r.interimResults = true;
  r.maxAlternatives = 1;

  var silenceTimer = null;       // ← FIX 2: manual silence detection

  r.onstart = function() {
    setPhase('listening');
    setStatusText('Listening… speak now');
  };

  r.onresult = function(e) {
    // Clear silence timer on every new word
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }

    var t = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      t += e.results[i][0].transcript;
    }
    setTranscript(t);

    if (e.results[e.results.length - 1].isFinal) {
      // Got a final result — short pause then process
      silenceTimer = setTimeout(function() {
        r.stop();
        setTranscript('');
        addMessage('user', t);
        askGroq(t);
      }, 600);                   // ← FIX 3: 600ms grace period after final
    } else {
      // Interim — show live transcript, reset silence window
      silenceTimer = setTimeout(function() {
        // User stopped mid-sentence — treat as final
        if (t.trim().length > 2) {
          r.stop();
          setTranscript('');
          addMessage('user', t);
          askGroq(t);
        }
      }, 2500);                  // ← FIX 4: 2.5s silence = done speaking
    }
  };

  r.onerror = function(e) {
    if (e.error === 'no-speech') {
      // Don't show error for no-speech, just restart quietly
      setStatusText('Listening… speak now');
      return;
    }
    setPhase('idle');
    setStatusText('Could not hear you – tap mic to try again');
  };

  r.onend = function() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    setPhase(function(p) { return p === 'listening' ? 'idle' : p; });
  };

  recognitionRef.current = r;
  r.start();
}

  function stopListening() {
    recognitionRef.current && recognitionRef.current.stop();
    setPhase('idle');
    setStatusText('Click the mic to speak');
  }

  function micClick() {
    if (phase === 'listening') stopListening();
    else if (phase === 'idle') startListening();
  }

  var disabled = phase === 'speaking' || phase === 'thinking';

  return React.createElement(
    'div',
    { style: styles.modalBackdrop, onClick: function(e) { if (e.target === e.currentTarget) onClose(); } },
    React.createElement(
      'div',
      { style: styles.voiceModal },
      // Header
      React.createElement(
        'div',
        { style: styles.vmHeader },
        React.createElement('div', { style: styles.vmLogo }, React.createElement('span', { style: { fontSize: 20 } }, '🎙')),
        React.createElement(
          'div',
          null,
          React.createElement('div', { style: styles.vmTitle }, 'Voice Assistant'),
          React.createElement('div', { style: styles.vmSub }, 'Lakmé Salon · AI Powered')
        ),
        React.createElement('button', { onClick: onClose, style: styles.vmClose }, '✕')
      ),
      // Messages
      React.createElement(
        'div',
        { style: styles.vmMessages },
        messages.map(function(m) {
          return React.createElement(
            'div',
            {
              key: m.id,
              style: Object.assign({}, styles.vmBubble, m.role === 'user' ? styles.vmBubbleUser : styles.vmBubbleBot)
            },
            m.text
          );
        }),
        transcript
          ? React.createElement('div', { style: Object.assign({}, styles.vmBubble, styles.vmBubbleUser, { opacity: 0.6 }) }, transcript + '…')
          : null,
        React.createElement('div', { ref: messagesEndRef })
      ),
      // Mic Area
      React.createElement(
        'div',
        { style: styles.vmMicArea },
        React.createElement('div', { style: styles.vmStatusText }, statusText),
        React.createElement(
          'div',
          { style: styles.vmRingWrap },
          (phase === 'listening' || phase === 'speaking')
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement('div', { style: Object.assign({}, styles.vmRing, { animationDuration: '1.2s' }) }),
                React.createElement('div', { style: Object.assign({}, styles.vmRing, { animationDuration: '1.6s', animationDelay: '0.3s' }) })
              )
            : null,
          React.createElement(
            'button',
            {
              onClick: micClick,
              disabled: disabled,
              style: Object.assign({}, styles.vmMicBtn, {
                background: phase === 'listening' ? '#c9a84c' : 'linear-gradient(135deg, #c9a84c, #a07830)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.7 : 1,
              }),
              'aria-label': phase === 'listening' ? 'Stop listening' : 'Start speaking'
            },
            phase === 'thinking'
              ? React.createElement('span', { style: { fontSize: 24 } }, '⋯')
              : phase === 'listening'
              ? React.createElement(
                  'svg',
                  { width: 28, height: 28, fill: 'white', viewBox: '0 0 24 24' },
                  React.createElement('rect', { x: 6, y: 4, width: 4, height: 16, rx: 2 }),
                  React.createElement('rect', { x: 14, y: 4, width: 4, height: 16, rx: 2 })
                )
              : React.createElement(
                  'svg',
                  { width: 28, height: 28, fill: 'white', viewBox: '0 0 24 24' },
                  React.createElement('path', { d: 'M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z' })
                )
          )
        ),
        React.createElement(
          'div',
          { style: styles.vmHint },
          phase === 'speaking' ? '🔊 Speaking…'
            : phase === 'thinking' ? '✨ Thinking…'
            : phase === 'listening' ? '🎙 Listening…'
            : 'Tap mic and ask anything'
        )
      )
    ),
    React.createElement('style', null, `
      @keyframes lva-ring-pulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    `)
  );
}

// ─── Main Section Component ───────────────────────────────────────────────────
function AIAssistantSection({ onOpenChat }) {
  var _voice = React.useState(false);
  var voiceOpen = _voice[0], setVoiceOpen = _voice[1];
  var _hv = React.useState(false);
  var hoverVoice = _hv[0], setHoverVoice = _hv[1];
  var _hm = React.useState(false);
  var hoverMsg = _hm[0], setHoverMsg = _hm[1];
  

  return React.createElement(
    'section',
    { style: styles.section },
    // Background decorative layer
    React.createElement(
      'div',
      { style: styles.bgDecor, 'aria-hidden': 'true' },
      React.createElement('div', { style: styles.bgLine1 }),
      React.createElement('div', { style: styles.bgLine2 }),
      React.createElement('div', { style: styles.bgGlow })
    ),
    React.createElement(
      'div',
      { style: styles.container },
      // Badge
      React.createElement(
        'div',
        { style: styles.badge },
        React.createElement('span', { style: styles.badgeDot }),
        'AI-POWERED ASSISTANTS'
      ),
      // Heading
      React.createElement(
        'h2',
        { style: styles.heading },
        'Your Personal',
        React.createElement('br'),
        React.createElement('span', { style: styles.headingGold }, 'Beauty Concierge')
      ),
      React.createElement(
        'p',
        { style: styles.sub },
        'Talk to our AI or chat instantly — get answers about services,',
        React.createElement('br'),
        'book appointments, and get beauty advice. Available 24/7.'
      ),
      // Cards row
      React.createElement(
        'div',
        { style: styles.cardsRow },
        // Voice Card
        React.createElement(
          'div',
          {
            style: Object.assign({}, styles.card, hoverVoice ? styles.cardHover : {}),
            onMouseEnter: function() { setHoverVoice(true); },
            onMouseLeave: function() { setHoverVoice(false); }
          },
          React.createElement(
            'div',
            { style: styles.cardIconWrap },
            React.createElement('div', { style: Object.assign({}, styles.cardIconRing, hoverVoice ? styles.cardIconRingActive : {}) }),
            React.createElement(
              'div',
              { style: styles.cardIcon },
              React.createElement(
                'svg',
                { width: 30, height: 30, fill: '#c9a84c', viewBox: '0 0 24 24' },
                React.createElement('path', { d: 'M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z' })
              )
            )
          ),
          React.createElement('div', { style: styles.cardLabel }, 'VOICE ASSISTANT'),
          React.createElement('div', { style: styles.cardTitle }, 'Speak to Us'),
          React.createElement('div', { style: styles.cardDesc }, 'Hands-free help. Ask questions, explore services, and get recommendations — all by voice.'),
          React.createElement(
            'div',
            { style: styles.cardFeatures },
            React.createElement('span', { style: styles.cardFeature }, '🎙 Voice activated'),
            React.createElement('span', { style: styles.cardFeature }, '🔊 Speaks back to you'),
            React.createElement('span', { style: styles.cardFeature }, '✨ AI powered')
          ),
          React.createElement('button', { onClick: function() { setVoiceOpen(true); }, style: styles.btnGold }, 'Start Voice Assistant →')
        ),
        // Or Divider
        React.createElement(
          'div',
          { style: styles.orDivider },
          React.createElement('div', { style: styles.orLine }),
          React.createElement('span', { style: styles.orText }, 'or'),
          React.createElement('div', { style: styles.orLine })
        ),
        // Message Card
        React.createElement(
          'div',
          {
            style: Object.assign({}, styles.card, hoverMsg ? styles.cardHover : {}),
            onMouseEnter: function() { setHoverMsg(true); },
            onMouseLeave: function() { setHoverMsg(false); }
          },
          React.createElement(
            'div',
            { style: styles.cardIconWrap },
            React.createElement('div', { style: Object.assign({}, styles.cardIconRing, hoverMsg ? styles.cardIconRingActive : {}) }),
            React.createElement(
              'div',
              { style: styles.cardIcon },
              React.createElement(
                'svg',
                { width: 30, height: 30, fill: '#c9a84c', viewBox: '0 0 24 24' },
                React.createElement('path', { d: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z' })
              )
            )
          ),
          React.createElement('div', { style: styles.cardLabel }, 'HAIR AI · MESSAGE'),
          React.createElement('div', { style: styles.cardTitle }, 'Chat with AI'),
          React.createElement('div', { style: styles.cardDesc }, 'Upload a photo, ask about hairstyles, get styling tips, or book — our Hair AI is ready.'),
          React.createElement(
            'div',
            { style: styles.cardFeatures },
            React.createElement('span', { style: styles.cardFeature }, '📸 Photo upload'),
            React.createElement('span', { style: styles.cardFeature }, '💬 Live chat'),
            React.createElement('span', { style: styles.cardFeature }, '💇 Style advice')
          ),
          React.createElement(
            'button',
            { onClick: function() { onOpenChat && onOpenChat(); }, style: styles.btnOutline },
            'Open Hair AI Chat →'
          )
        )
      ),
      // Bottom note
      React.createElement('p', { style: styles.bottomNote }, '✦ Both assistants are free to use · No login required · Instant responses')
    ),
    // Voice Modal
    voiceOpen ? React.createElement(VoiceAssistantModal, { onClose: function() { setVoiceOpen(false); } }) : null
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
var styles = {
  section: {
    position: 'relative',
    background: '#0a0a0a',
    padding: '100px 24px',
    overflow: 'hidden',
    fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  },
  bgDecor: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  bgLine1: {
    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: 1, height: '100%', background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.15), transparent)',
  },
  bgLine2: {
    position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
    height: 1, width: '100%', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.08), transparent)',
  },
  bgGlow: {
    position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 600, height: 400, borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)',
  },
  container: {
    maxWidth: 960,
    margin: '0 auto',
    position: 'relative',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontSize: 11, letterSpacing: '0.2em', color: '#c9a84c',
    fontFamily: "'Montserrat', 'Arial Narrow', sans-serif",
    fontWeight: 600, marginBottom: 24,
  },
  badgeDot: {
    width: 6, height: 6, borderRadius: '50%', background: '#c9a84c',
    boxShadow: '0 0 8px rgba(201,168,76,0.8)',
    display: 'inline-block',
    animation: 'pulse 2s infinite',
  },
  heading: {
    fontSize: 'clamp(36px, 5vw, 58px)',
    fontWeight: 400,
    color: '#f5f0e8',
    margin: '0 0 16px',
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
  },
  headingGold: {
    color: '#c9a84c',
    fontStyle: 'italic',
  },
  sub: {
    fontSize: 16,
    color: '#888',
    lineHeight: 1.7,
    marginBottom: 64,
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 300,
  },
  cardsRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  card: {
    flex: '1 1 320px',
    maxWidth: 380,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: 2,
    padding: '48px 36px',
    textAlign: 'left',
    transition: 'background 0.3s, border-color 0.3s, transform 0.3s',
    cursor: 'default',
  },
  cardHover: {
    background: 'rgba(201,168,76,0.06)',
    borderColor: 'rgba(201,168,76,0.5)',
    transform: 'translateY(-4px)',
  },
  cardIconWrap: {
    position: 'relative',
    width: 64, height: 64,
    marginBottom: 28,
  },
  cardIconRing: {
    position: 'absolute', inset: -8,
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '50%',
    transition: 'border-color 0.3s',
  },
  cardIconRingActive: {
    borderColor: 'rgba(201,168,76,0.6)',
  },
  cardIcon: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'rgba(201,168,76,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 10, letterSpacing: '0.25em', color: '#c9a84c',
    fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 26, fontWeight: 500, color: '#f5f0e8',
    marginBottom: 14, letterSpacing: '-0.01em',
  },
  cardDesc: {
    fontSize: 14, color: '#777', lineHeight: 1.7,
    fontFamily: "'Montserrat', sans-serif", fontWeight: 300,
    marginBottom: 24,
  },
  cardFeatures: {
    display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32,
  },
  cardFeature: {
    fontSize: 12, color: '#999',
    fontFamily: "'Montserrat', sans-serif",
  },
  btnGold: {
    width: '100%', padding: '14px 24px',
    background: 'linear-gradient(135deg, #c9a84c, #a07830)',
    border: 'none', borderRadius: 1,
    color: '#0a0a0a', fontSize: 12,
    fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
    letterSpacing: '0.1em', cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.2s',
  },
  btnOutline: {
    width: '100%', padding: '14px 24px',
    background: 'transparent',
    border: '1px solid rgba(201,168,76,0.5)',
    borderRadius: 1,
    color: '#c9a84c', fontSize: 12,
    fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
    letterSpacing: '0.1em', cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
  },
  orDivider: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '0 20px', gap: 12, minWidth: 40,
  },
  orLine: {
    width: 1, flex: 1, minHeight: 40,
    background: 'rgba(201,168,76,0.2)',
  },
  orText: {
    fontSize: 11, color: '#555', letterSpacing: '0.1em',
    fontFamily: "'Montserrat', sans-serif",
  },
  bottomNote: {
    marginTop: 56,
    fontSize: 12, color: '#555',
    fontFamily: "'Montserrat', sans-serif",
    letterSpacing: '0.05em',
  },

  // ── Voice Modal ──
  modalBackdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99999,
    padding: 16,
  },
  voiceModal: {
    background: '#111',
    border: '1px solid rgba(201,168,76,0.3)',
    borderRadius: 4,
    width: '100%', maxWidth: 440,
    display: 'flex', flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1)',
  },
  vmHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(201,168,76,0.15)',
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(201,168,76,0.05)',
  },
  vmLogo: {
    width: 44, height: 44, borderRadius: '50%',
    background: 'rgba(201,168,76,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(201,168,76,0.3)',
  },
  vmTitle: {
    fontSize: 16, fontWeight: 500,
    color: '#f5f0e8',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    letterSpacing: '0.02em',
  },
  vmSub: {
    fontSize: 11, color: '#c9a84c',
    fontFamily: "'Montserrat', sans-serif",
    letterSpacing: '0.1em',
  },
  vmClose: {
    marginLeft: 'auto', background: 'none', border: 'none',
    color: '#666', cursor: 'pointer', fontSize: 18, padding: 4,
    transition: 'color 0.2s',
  },
  vmMessages: {
    flex: 1, overflowY: 'auto',
    padding: 20, display: 'flex', flexDirection: 'column',
    gap: 10, minHeight: 160,
  },
  vmBubble: {
    maxWidth: '85%', padding: '10px 16px',
    borderRadius: 2, fontSize: 14, lineHeight: 1.6,
    fontFamily: "'Montserrat', sans-serif",
  },
  vmBubbleBot: {
    background: 'rgba(201,168,76,0.1)',
    border: '1px solid rgba(201,168,76,0.2)',
    color: '#e8e0d0',
    alignSelf: 'flex-start',
  },
  vmBubbleUser: {
    background: 'rgba(255,255,255,0.06)',
    color: '#aaa',
    alignSelf: 'flex-end',
  },
  vmMicArea: {
    padding: '24px 20px 32px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 16,
    background: 'rgba(0,0,0,0.3)',
  },
  vmStatusText: {
    fontSize: 12, color: '#666',
    fontFamily: "'Montserrat', sans-serif",
    letterSpacing: '0.05em',
  },
  vmRingWrap: {
    position: 'relative',
    width: 80, height: 80,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  vmRing: {
    position: 'absolute',
    width: 80, height: 80,
    borderRadius: '50%',
    border: '2px solid rgba(201,168,76,0.5)',
    animation: 'lva-ring-pulse 1.4s ease-out infinite',
  },
  vmMicBtn: {
    position: 'relative', zIndex: 2,
    width: 72, height: 72, borderRadius: '50%',
    border: '2px solid rgba(201,168,76,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.15s, opacity 0.2s',
    boxShadow: '0 8px 24px rgba(201,168,76,0.3)',
  },
  vmHint: {
    fontSize: 12, color: '#c9a84c',
    fontFamily: "'Montserrat', sans-serif",
    letterSpacing: '0.05em',
  },
};
export default AIAssistantSection;