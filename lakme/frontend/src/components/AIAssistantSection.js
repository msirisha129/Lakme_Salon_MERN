// AIAssistantSection.js — IMPROVED VERSION
// Smart booking flow with confirmation, slow Q&A, and validation
import React from 'react';
import API from '../utils/api';

function VoiceAssistantModal({ onClose }) {
  // ── Original State (moved TIER 1 state to outer component) ──
  const [phase, setPhase] = React.useState('idle');
  const [messages, setMessages] = React.useState([]);
  const [statusText, setStatusText] = React.useState('Click the mic to start');
  const [volume, setVolume] = React.useState(0);
  const [callDuration, setCallDuration] = React.useState(0);
  const [showManualSend, setShowManualSend] = React.useState(false);
  const [manualTextInput, setManualTextInput] = React.useState('');
  const [connStats, setConnStats] = React.useState({ quality: 'Good', latency: 0, isOnline: true });
  
  const [bookingData, setBookingData] = React.useState({
    name: null,
    phone: null,
    service: null,
    date: null,
    time: null
  });
  const [bookingStep, setBookingStep] = React.useState(null);
  const [alternativeSlots, setAlternativeSlots] = React.useState([]);

  const phaseRef = React.useRef('idle');
  const srRef = React.useRef(null);
  const voicesRef = React.useRef([]);
  const uttRef = React.useRef(null);
  const currentTranscriptRef = React.useRef({ finalText: '', interimText: '' });
  const hasLoudSpeechRef = React.useRef(false);
  const selectedVoiceRef = React.useRef(null);
  const [micPermission, setMicPermission] = React.useState('unknown');
  const audioCtxRef = React.useRef(null);
  const silenceTimerRef = React.useRef(null);
  const listeningTimeoutRef = React.useRef(null);
  const callTimerRef = React.useRef(null);
  const messagesRef = React.useRef([]);
  const bookingDataRef = React.useRef(bookingData);
  const bookingStepRef = React.useRef(bookingStep);
  const lastProcessedTextRef = React.useRef('');
  const lastProcessedAtRef = React.useRef(0);

  function updateBookingData(patch) {
    setBookingData(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem('lakme_booking_draft', JSON.stringify(next)); } catch (e) { /* ignore */ }
      bookingDataRef.current = next;
      return next;
    });
  }
  const listenRestartCountRef = React.useRef(0);

  React.useEffect(() => { phaseRef.current = phase; }, [phase]);
  React.useEffect(() => { messagesRef.current = messages; }, [messages]);
  React.useEffect(() => { bookingDataRef.current = bookingData; }, [bookingData]);
  React.useEffect(() => { bookingStepRef.current = bookingStep; }, [bookingStep]);

  React.useEffect(() => {
    // populate voices and speak greeting once voices are ready
    function initVoices() {
      const synth = window.speechSynthesis;
      if (!synth) return;
      console.log('Initializing voices...');
      const v = synth.getVoices() || [];
      voicesRef.current = v;
      // pick a preferred female-ish English voice if available
      const cachedName = localStorage.getItem('lakme_selected_tts_voice');
      let chosen = null;
      if (cachedName) chosen = v.find(voice => voice.name === cachedName);
      if (!chosen) chosen = v.find(voice => voice.lang && voice.lang.startsWith('en') && /female|samantha|zira|victoria|moira/i.test(voice.name));
      chosen = chosen || (v.length > 0 ? v[0] : null);
      selectedVoiceRef.current = chosen;
      if (chosen) localStorage.setItem('lakme_selected_tts_voice', chosen.name);
    }

    initVoices();
    console.log('Voice initialization triggered.');
    if (window.speechSynthesis && typeof window.speechSynthesis.onvoiceschanged === 'function') {
      window.speechSynthesis.onvoiceschanged = () => initVoices();
    }

    var t = setTimeout(() => {
      var g = "Hello! Welcome to Lakmé Salon. How can I help you today?";
      addMessage('assistant', g);
      console.log('Initial greeting generated.');
      speakGroq(g);
    }, 400);

    // Monitor connection quality
    const updateConnectionStats = () => {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        let quality = 'Good';
        if (conn.effectiveType === '2g' || conn.rtt > 800) quality = 'Poor';
        else if (conn.effectiveType === '3g' || conn.rtt > 400) quality = 'Fair';
        setConnStats(prev => ({ ...prev, quality }));
      }
    };
    updateConnectionStats();
    if (navigator.connection) navigator.connection.addEventListener('change', updateConnectionStats);

    return () => { 
      console.log('AIAssistantSection unmounting. Cleaning up...');
      clearTimeout(t); 
      if(srRef.current) { try{srRef.current.abort();}catch(e){} } 
      if(window.speechSynthesis) window.speechSynthesis.cancel();
      if(callTimerRef.current) clearInterval(callTimerRef.current);
      // Only close AudioContext if it exists and is not already closed
      if(audioCtxRef.current && audioCtxRef.current.state !== 'closed') { 
        try { audioCtxRef.current.close(); } catch(e) { console.error('Error closing AudioContext:', e); }
      }
      if(listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
      if (navigator.connection) navigator.connection.removeEventListener('change', updateConnectionStats);
    };
  }, []);

  // Backoff tracker for restarting STT on recoverable errors
  const restartBackoffRef = React.useRef({ attempts: 0, nextDelay: 300 });

  // Start call timer when session begins
  React.useEffect(() => {
    if (phase !== 'idle' && !callTimerRef.current) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
  }, [phase, callTimerRef]); // Only re-run if phase changes or timer ref changes

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════
  // TIER 1: UTILITY FUNCTIONS (localStorage only, no state setters)
  // ═══════════════════════════════════════════════════════════

  // ── TIER 1: Draft Management ──
  const saveDraft = (booking) => {
    try {
      localStorage.setItem('lakme_booking_draft', JSON.stringify(booking));
      console.log('[TIER1] Draft saved:', booking);
    } catch (e) {
      console.warn('[TIER1] Failed to save draft:', e);
    }
  };

  const loadDraft = () => {
    try {
      const draft = localStorage.getItem('lakme_booking_draft');
      return draft ? JSON.parse(draft) : null;
    } catch (e) {
      console.warn('[TIER1] Failed to load draft:', e);
      return null;
    }
  };

  // ── TIER 1: User Data Persistence ──
  const saveUserData = (userData) => {
    try {
      localStorage.setItem('lakme_user_data', JSON.stringify(userData));
      console.log('[TIER1] User data saved:', userData.name);
    } catch (e) {
      console.warn('[TIER1] Failed to save user data:', e);
    }
  };

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('lakme_user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      console.warn('[TIER1] Failed to load user data:', e);
      return null;
    }
  };

  // ── TIER 1: Request Queuing (Offline Mode) ──
  const queueRequest = (bookingRequest) => {
    try {
      const queue = JSON.parse(localStorage.getItem('lakme_request_queue') || '[]');
      queue.push({ ...bookingRequest, timestamp: Date.now() });
      localStorage.setItem('lakme_request_queue', JSON.stringify(queue));
      console.log('[TIER1] Request queued for offline:', bookingRequest);
    } catch (e) {
      console.warn('[TIER1] Failed to queue request:', e);
    }
  };

  // ── TIER 1: Booking Confirmation with Read-Back ──
  const generateConfirmationText = (booking) => {
    const parts = [];
    if (booking.name) parts.push(`for ${booking.name}`);
    if (booking.service) parts.push(booking.service);
    if (booking.date) parts.push(`on ${booking.date}`);
    if (booking.time) parts.push(`at ${booking.time}`);
    
    return `Let me confirm your booking ${parts.join(', ')}. Is that correct?`;
  };

  // ── Helper Functions ──

  // Ensure microphone permission by requesting a short getUserMedia stream
  async function ensureMicPermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicPermission('denied');
        return false;
      }
      // Try to query permissions API first for a non-intrusive check
      let status = null;
      try { status = await navigator.permissions.query({ name: 'microphone' }); } catch (e) { status = null; }
      if (status && status.state === 'granted') {
        setMicPermission('granted');
        return true;
      }

      // If state is 'denied', avoid prompting again — show instructions instead
      if (status && status.state === 'denied') {
        setMicPermission('denied');
        return false;
      }

      // Request permission explicitly with helpful constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
          } 
        });
        stream.getTracks().forEach(t => t.stop());
        setMicPermission('granted');
        return true;
      } catch (err) {
        // user denied or device unavailable
        console.warn('getUserMedia failed', err);
        setMicPermission('denied');
        return false;
      }
    } catch (e) {
      console.warn('Microphone permission denied or not available', e);
      setMicPermission('denied');
      return false;
    }
  }

  const VULGAR_WORDS = ['damn', 'hell', 'crap', 'stupid', 'idiot', 'fuck', 'shit', 'ass'];

  function addMessage(role, text) {
    var msg = { role, text, id: Date.now() + Math.random() };
    setMessages(prev => { var n = [...prev, msg]; messagesRef.current = n; return n; });
  }

  function containsVulgar(text) {
    var lower = text.toLowerCase();
    return VULGAR_WORDS.some(word => lower.includes(word));
  }

  function isValidDate(dateText) {
    var lower = (dateText || '').toLowerCase();
    if (lower.includes('today')) return new Date();
    if (lower.includes('tomorrow')) {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    }
    var dayMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
    for (var day in dayMap) {
      if (lower.includes(day)) {
        var today = new Date();
        var diff = (dayMap[day] - today.getDay() + 7) % 7 || 7;
        today.setDate(today.getDate() + diff);
        return today;
      }
    }
    return null;
  }

  function isPastDate(date) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  }

  function isValidPhone(phone) {
    var digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  }

  // Try to extract a name phrase from a longer user sentence
  function extractNameFromText(text) {
    if (!text) return '';
    const lower = text.toLowerCase();
    // common name-introducing phrases
    const patterns = [ /my name is\s+(.+)/i, /name is\s+(.+)/i, /i am\s+(.+)/i, /i'm\s+(.+)/i, /this is\s+(.+)/i ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m && m[1]) {
        // take first 2 words from the match, strip trailing filler like 'help', 'register', etc.
        let candidate = m[1].trim();
        candidate = candidate.replace(/\b(help|please|register|with register|to register|help me)\b.*/i, '').trim();
        const parts = candidate.split(/\s+/).filter(Boolean);
        if (parts.length >= 1) return parts.slice(0, 2).join(' ');
      }
    }
    // fallback: if sentence short, return it as-is (trim to two words)
    const parts = text.replace(/\b(help me|help|please|with register|register)\b/gi, '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    if (parts.length >= 2 && parts.length <= 4) return parts.slice(0, 2).join(' ');
    return '';
  }

  // ── Browser Web Speech API (TTS) ────────────────────────────────────────
  function speakGroq(text) {
    console.log('Generating speech for AI response...');
    var synth = window.speechSynthesis;
    if (!synth) { console.warn('Speech synthesis not supported'); return; }
    
    synth.cancel();
    setPhase('speaking'); phaseRef.current = 'speaking';
    console.log('Playing audio...');
    setStatusText('Speaking…');
    
    var cleanText = text.replace(/[*_#`\[\]()]/g,'').slice(0,500);
    var utt = new SpeechSynthesisUtterance(cleanText);
    utt.rate = 0.92;
    utt.pitch = 1.05;
    utt.volume = 1;
    // prefer a cached selected voice so voice stays consistent
    const cached = selectedVoiceRef.current;
    if (cached) utt.voice = cached;
    else {
      const voices = synth.getVoices() || [];
      const femaleVoice = voices.find(v => v.lang && v.lang.startsWith('en') && /female|samantha|zira|victoria|moira/i.test(v.name));
      utt.voice = femaleVoice || (voices.length > 0 ? voices[0] : null);
      selectedVoiceRef.current = utt.voice;
    }
    
    utt.onend = () => {
      console.log('Playing audio complete. Continuing conversation.');
      setPhase('idle'); phaseRef.current = 'idle';
      setStatusText('Tap mic to speak');
      setShowManualSend(false); // Hide manual send button
      setVolume(0);
      // Wait longer before auto-listening to give user time to respond
      // During booking, wait 1.5 seconds; otherwise wait 2 seconds
      const waitTime = bookingStepRef.current ? 1500 : 2000;
      setTimeout(() => startListening(), waitTime);
    };
    
    utt.onerror = (e) => {
      console.warn('Speech error:', e.error);
      console.error('Error playing audio:', e);
      setPhase('idle'); phaseRef.current = 'idle';
      setStatusText('Tap mic to speak');
      // Wait before restarting
      setTimeout(() => startListening(), 800);
    };
    
    uttRef.current = utt; // Hold reference
    synth.speak(utt);
  }

  // ═══════════════════════════════════════════════════════════
  // TIER 2: SMART INTERACTIONS
  // ═══════════════════════════════════════════════════════════

  // ── TIER 2: Intent Detection ──
  function detectIntent(userText) {
    const lower = userText.toLowerCase();
    
    // Cancellation intents
    if (/cancel|never mind|stop|forget it|undo|back|go back/i.test(lower)) {
      return 'cancel';
    }
    
    // Clarification/repeat intents
    if (/repeat|say again|what did you say|pardon|again|can you repeat/i.test(lower)) {
      return 'repeat';
    }
    
    // Price/cost inquiry
    if (/price|cost|how much|expensive|afford|rate|charges/i.test(lower)) {
      return 'price_inquiry';
    }
    
    // Location inquiry
    if (/where|location|address|branch|store|nearby/i.test(lower)) {
      return 'location_inquiry';
    }
    
    // Service change intent
    if (/change service|different service|instead|prefer|actually want/i.test(lower)) {
      return 'service_change';
    }
    
    // Time availability inquiry
    if (/available|when|free|slots|opening/i.test(lower)) {
      return 'availability_inquiry';
    }

    // Register / signup intent
    if (/register|sign up|signup|create account|sign me up|help me register|help me with register|i want to register|i want to sign up|sign me up please/i.test(lower)) {
      return 'register';
    }
    
    return 'normal';
  }

  // ── TIER 2: Service Fuzzy Matching with Suggestions ──
  async function findSimilarServices(userService) {
    try {
      const response = await API.get('/api/services');
      const services = response.data.map(s => s.name);
      
      const lower = userService.toLowerCase();
      
      // Direct match
      const directMatch = services.find(s => s.toLowerCase() === lower);
      if (directMatch) return { exact: directMatch, similar: [] };
      
      // Fuzzy match - check if input contains service keywords
      const similar = services.filter(s => {
        const sLower = s.toLowerCase();
        return lower.includes(sLower.substring(0, 4)) || sLower.includes(lower.substring(0, 4));
      });
      
      return { exact: null, similar: similar.slice(0, 3) }; // Top 3 suggestions
    } catch (e) {
      console.warn('[TIER2] Service lookup error:', e);
      return { exact: null, similar: [] };
    }
  }

  // ── TIER 2: Get Service Details (price, duration) ──
  async function getServiceDetails(serviceName) {
    try {
      const response = await API.get('/api/services');
      const service = response.data.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
      return service || null;
    } catch (e) {
      console.warn('[TIER2] Service details error:', e);
      return null;
    }
  }

  // ── TIER 2: Acknowledgments ──
  function getAcknowledgment() {
    const acks = [
      'Got it!',
      'Perfect!',
      'Noted!',
      'Understood!',
      'Great!',
      'Thanks for that!',
      'Excellent!'
    ];
    return acks[Math.floor(Math.random() * acks.length)];
  }

  // ── TIER 2: Enhanced Voice Quality ──
  function enhancedSpeak(text) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    var cleanText = text.replace(/[*_#`\[\]()]/g,'').slice(0,500);
    var utt = new SpeechSynthesisUtterance(cleanText);
    
    // ── Adjust speaking rate based on text length ──
    // Shorter text: speak slower, longer text: speak faster
    if (text.length < 50) {
      utt.rate = 0.85; // Slower for short messages
    } else if (text.length > 200) {
      utt.rate = 1.1; // Faster for long messages
    } else {
      utt.rate = 0.92; // Normal
    }
    
    utt.pitch = 1.05; // Slightly higher for warmth
    utt.volume = 1;
    
    const cached = selectedVoiceRef.current;
    if (cached) utt.voice = cached;
    else {
      const voices = synth.getVoices() || [];
      const femaleVoice = voices.find(v => v.lang && v.lang.startsWith('en') && /female|samantha|zira|victoria|moira/i.test(v.name));
      utt.voice = femaleVoice || (voices.length > 0 ? voices[0] : null);
      selectedVoiceRef.current = utt.voice;
    }
    
    utt.onend = () => {
      setPhase('idle');
      phaseRef.current = 'idle';
      setStatusText('Tap mic to speak');
      const waitTime = bookingStepRef.current ? 1500 : 2000;
      setTimeout(() => startListening(), waitTime);
    };
    
    utt.onerror = (e) => {
      console.warn('Speech error:', e.error);
      setPhase('idle');
      phaseRef.current = 'idle';
      setTimeout(() => startListening(), 800);
    };
    
    uttRef.current = utt;
    synth.speak(utt);
  }

  // ── Smart Booking Flow ────────────────────────────────────────────────────
  function startBookingFlow() {
    setBookingStep('askName');
    updateBookingData({ name: null, phone: null, service: null, date: null, time: null });
    var q = "Perfect! Let's book your appointment. First, what is your full name?";
    console.log('Starting booking flow.');
    addMessage('assistant', q);
    speakGroq(q);
  }

  async function processBookingResponse(userText) {
    var step = bookingStepRef.current;

    // ── TIER 2: Intent Detection ──
    const intent = detectIntent(userText);
    console.log('[TIER2] Detected intent:', intent);

    // If user asked to register outside booking flow, start the collectName flow
    if (intent === 'register' && !step) {
      setBookingStep('collectName');
      const prompt = 'Sure — I can help you register. What is your full name?';
      addMessage('assistant', prompt);
      speakGroq(prompt);
      // ensure mic permission then resume listening after TTS finishes
      (async () => {
        try {
          const ok = await ensureMicPermission();
          if (ok) setTimeout(() => { try { startListening(); } catch (e) {} }, 1400);
        } catch (e) { console.warn('ensureMicPermission failed', e); }
      })();
      return;
    }
    
    // Handle cancellation
    if (intent === 'cancel') {
      var cancelMsg = "No problem! Your booking has been saved as a draft. Feel free to start again anytime. Thank you!";
      addMessage('assistant', cancelMsg);
      speakGroq(cancelMsg);
      setBookingStep(null);
      return;
    }
    
    // Handle repeat/clarification
    if (intent === 'repeat') {
      var data = bookingDataRef.current;
      var repeatMsg = `Sure! Here's what I have so far:\n\nName: ${data.name || 'not provided'}\nPhone: ${data.phone || 'not provided'}\nService: ${data.service || 'not provided'}\nDate: ${data.date || 'not provided'}\nTime: ${data.time || 'not provided'}\n\nWhat would you like to change or confirm?`;
      addMessage('assistant', repeatMsg);
      speakGroq(repeatMsg);
      return;
    }
    
    // Handle price inquiry
    if (intent === 'price_inquiry') {
      // ── TIER 2: Fetch and display actual prices ──
      try {
        if (bookingDataRef.current.service) {
          const serviceDetails = await getServiceDetails(bookingDataRef.current.service);
          if (serviceDetails) {
            var priceMsg = `Great question! The ${bookingDataRef.current.service} costs ₹${serviceDetails.price}, and it takes about ${serviceDetails.duration} minutes. Would you like to proceed with booking?`;
          } else {
            var priceMsg = `I couldn't find the exact price for ${bookingDataRef.current.service}, but our salon services typically range from ₹500 to ₹5000. Would you like to continue booking?`;
          }
        } else {
          var priceMsg = `Great question! Our services range from ₹500 to ₹5000 depending on the type. Which service are you interested in? Some popular options are Hair Cut (₹500-₹1500), Facial (₹1000-₹2500), Hair Spa (₹1500-₹3000), or Bridal Makeup (₹3000-₹5000).`;
        }
        addMessage('assistant', priceMsg);
        speakGroq(priceMsg);
      } catch (e) {
        console.warn('[TIER2] Price inquiry error:', e);
        var fallbackPriceMsg = "I'm having trouble accessing our pricing right now. Our services typically range from ₹500 to ₹5000. Would you still like to book?";
        addMessage('assistant', fallbackPriceMsg);
        speakGroq(fallbackPriceMsg);
      }
      return;
    }
    
    // Handle location inquiry
    if (intent === 'location_inquiry') {
      var locationMsg = "We're located at Lakme Studio, Fashion Street, Mumbai. Open from 10 AM to 8 PM daily. Would you still like to book an appointment?";
      addMessage('assistant', locationMsg);
      speakGroq(locationMsg);
      return;
    }

    // Vulgar check
    console.log('Processing booking response for step:', step, 'User text:', userText);
    if (containsVulgar(userText)) {
      var vulgarMsg = "Please keep the conversation respectful. Let's continue. " + (
        step === 'askName' ? "What is your full name?" :
        step === 'askPhone' ? "What is your phone number?" :
        step === 'askService' ? "Which service would you like to book?" :
        step === 'askDate' ? "What date would you prefer?" :
        step === 'askTime' ? "What time suits you?" : "Please confirm your booking details."
      );
      addMessage('assistant', vulgarMsg);
      console.log('Vulgar language detected.');
      speakGroq(vulgarMsg);
      return;
    }

    if (step === 'askName') {
      var name = userText.trim();
      if (name.length < 2) {
        var retryName = "Sorry, I didn't catch that. Could you please repeat your full name?";
        console.log('Invalid name provided, retrying.');
        addMessage('assistant', retryName);
        speakGroq(retryName);
        return;
      }
      updateBookingData({ name });
      setBookingStep('askPhone');
      
      // ── TIER 2: Add acknowledgment ──
      var ack1 = getAcknowledgment();
      var confirmName = `${ack1}, ${name}. Now, what is your 10-digit phone number?`;
      console.log('Name received, asking for phone number.');
      addMessage('assistant', confirmName);
      speakGroq(confirmName);
      return;
    }

    if (step === 'askPhone') {
      var phone = userText.replace(/\D/g, '').slice(-10);
      if (!isValidPhone(userText)) {
        console.log('Invalid phone number provided, retrying.');
        var retryPhone = "I need a 10-digit phone number. Please say your number again slowly.";
        addMessage('assistant', retryPhone);
        speakGroq(retryPhone);
        return;
      }
      updateBookingData({ phone });
      setBookingStep('askService');
      
      // ── TIER 2: Add acknowledgment ──
      var ack2 = getAcknowledgment();
      var confirmPhone = `${ack2} Your phone number is ${phone}. Now, which service would you like? For example: Hair Cut, Facial, Hair Spa, Bridal Makeup, Manicure, or Pedicure?`;
      console.log('Phone number received, asking for service.');
      addMessage('assistant', confirmPhone);
      speakGroq(confirmPhone);
      return;
    }

    if (step === 'askService') {
      var service = userText.trim();
      updateBookingData({ service });
      
      // ── TIER 2: Add acknowledgment and check for fuzzy matches ──
      var ack = getAcknowledgment();
      var serviceMatch = await findSimilarServices(service);
      var serviceConfirm = service;
      
      if (serviceMatch.similar.length > 0 && !serviceMatch.exact) {
        // Suggest similar services
        var suggestions = serviceMatch.similar.slice(0, 2).join(' or ');
        var suggestMsg = `${ack} Did you mean ${suggestions}? Or shall I book you for ${service}?`;
        addMessage('assistant', suggestMsg);
        speakGroq(suggestMsg);
        // Keep service as entered for now
      } else if (serviceMatch.exact) {
        serviceConfirm = serviceMatch.exact; // Use exact match name
      }
      
      updateBookingData({ service: serviceConfirm });
      console.log('Service received:', serviceConfirm, 'asking for date.');
      setBookingStep('askDate');
      
      var confirmService = `${ack} You want a ${serviceConfirm}. When would you like to come? Say today, tomorrow or a weekday.`;
      addMessage('assistant', confirmService);
      speakGroq(confirmService);
      return;
    }

    if (step === 'askDate') {
      var dateObj = isValidDate(userText);
      if (!dateObj) {
        console.log('Invalid date provided, retrying.');
        var retryDate = "I didn't understand the date. Please say today, tomorrow, or a weekday like Monday or Friday.";
        addMessage('assistant', retryDate);
        speakGroq(retryDate);
        return;
      }
      if (isPastDate(dateObj)) {
        var pastDateMsg = "That date has already passed. Please choose today, tomorrow, or a future date.";
        console.log('Past date provided, retrying.');
        addMessage('assistant', pastDateMsg);
        speakGroq(pastDateMsg);
        return;
      }
      updateBookingData({ date: dateObj.toLocaleDateString('en-IN') });
      setBookingStep('askTime');
      var dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
      console.log('Date received, asking for time.');
      var confirmDate = `Great! ${dateStr}. Now, what time would you prefer? Please say: 10 AM, 2 PM, 4 PM, etc.`;
      addMessage('assistant', confirmDate);
      speakGroq(confirmDate);
      return;
    }

    if (step === 'askTime') {
      var time = userText.trim();
      updateBookingData({ time });
      console.log('Time received.');
      
      // ── TIER 2: Add acknowledgment ──
      var ack3 = getAcknowledgment();
      
      // If user not logged in, collect name & phone then redirect to register
      var tokenCheck = localStorage.getItem('lakme_token');
      if (!tokenCheck) {
        setBookingStep('collectName');
        console.log('User not logged in, asking for name to start registration flow.');
        var askNameMsg = `${ack3} I can help you register so we can complete the booking. What is your full name?`;
        addMessage('assistant', askNameMsg);
        speakGroq(askNameMsg);
        return;
      }
      
      setBookingStep('confirm');
      var data = bookingDataRef.current;
      console.log('Booking details collected, asking for confirmation.');
      var confirmMsg = `${ack3} Let me confirm your booking:\n\nName: ${data.name}\nPhone: ${data.phone}\nService: ${data.service}\nDate: ${data.date}\nTime: ${time}\n\nDoes this look correct? Please say yes or no.`;
      addMessage('assistant', confirmMsg);
      speakGroq(confirmMsg);
      return;
    }

    // If user is choosing an alternative slot offered by the assistant
    if (step === 'chooseAlternative') {
      if (/^\s*(yes|yeah|yep|ok|okay|confirm)\b/i.test(userText)) {
        // user accepted first alternative
        const choice = alternativeSlots && alternativeSlots.length > 0 ? alternativeSlots[0] : null;
        if (choice) {
          updateBookingData({ time: choice });
          // continue to submit booking as if user confirmed
          setBookingStep('confirm');
          // trigger confirmation flow by re-invoking processBookingResponse with 'yes'
          await processBookingResponse('yes');
          return;
        }
      }
      // If user stated a specific time, accept that if it matches an alternative
      const matched = (alternativeSlots || []).find(s => s.toLowerCase().includes((userText||'').toLowerCase().substring(0,4)));
      if (matched) {
        updateBookingData({ time: matched });
        setBookingStep('confirm');
        await processBookingResponse('yes');
        return;
      }
      // otherwise ask to clarify
      const clar = 'I did not understand that selection. Please say one of the available times.';
      addMessage('assistant', clar);
      speakGroq(clar);
      return;
    }

    if (step === 'askEmail') {
      var email = userText.trim();
      var emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailValid) {
        console.log('Invalid email provided, retrying.');
        var retryEmail = 'That does not look like a valid email. Please say your email address slowly.';
        addMessage('assistant', retryEmail);
        speakGroq(retryEmail);
        return;
      }
      updateBookingData({ email });
      setBookingStep('confirm');
      var data2 = bookingDataRef.current;
      console.log('Email received, asking for final confirmation.');
      var confirmMsg2 = `Let me confirm your booking:\n\nName: ${data2.name}\nPhone: ${data2.phone}\nService: ${data2.service}\nDate: ${data2.date}\nTime: ${data2.time}\nEmail: ${email}\n\nDoes this look correct? Please say yes or no.`;
      addMessage('assistant', confirmMsg2);
      speakGroq(confirmMsg2);
      return;
    }

    // ── Collect name/phone to prefill registration when user is not signed in ──
    if (step === 'collectName') {
      console.log('[DEBUG] in collectName, raw:', userText);
      // attempt to extract a concise name from longer utterances
      var nameText = extractNameFromText(userText) || userText.trim();
      if (!nameText || nameText.length < 2) {
        addMessage('assistant', 'Please tell me your full name so I can start registration.');
        speakGroq('Please tell me your full name so I can start registration.');
        return;
      }
      // Ask for confirmation of the recognized name to handle mis-hearings
      updateBookingData({ name: nameText });
      setBookingStep('confirmName');
      const heard = `I heard ${nameText}. Is that correct? Please say yes or no.`;
      addMessage('assistant', heard);
      speakGroq(heard);
      return;
    }

    // Confirm captured name
    if (step === 'confirmName') {
      console.log('[DEBUG] in confirmName, raw:', userText, 'recognized name:', bookingDataRef.current.name);
      if (/^\s*(yes|yeah|yep|correct|that is correct|right)\b/i.test(userText)) {
        setBookingStep('collectPhone');
        const first = (bookingDataRef.current.name || '').split(' ')[0] || '';
        addMessage('assistant', `Thanks ${first}. Now please provide your phone number.`);
        speakGroq('Thanks. Now please provide your phone number.');
        return;
      }
      if (/^\s*(no|incorrect|not|wrong|repeat)\b/i.test(userText)) {
        console.log('[DEBUG] user rejected name');
        setBookingStep('collectName');
        addMessage('assistant', 'Sorry about that. Please say your full name again, slowly.');
        speakGroq('Sorry about that. Please say your full name again, slowly.');
        return;
      }
      // If unclear, re-prompt
      addMessage('assistant', 'Please say yes if the name is correct, or no to repeat it.');
      speakGroq('Please say yes if the name is correct, or no to repeat it.');
      return;
    }

    if (step === 'collectPhone') {
      var phoneText = userText.replace(/[^0-9+]/g, '').trim();
      if (!isValidPhone(phoneText)) {
        addMessage('assistant', 'That phone number does not look right. Please say a 10-digit phone number.');
        speakGroq('That phone number does not look right. Please say a 10-digit phone number.');
        return;
      }
      updateBookingData({ phone: phoneText });
      // Persist prefill for register page and redirect user there to complete email/password
      try {
        const pre = { name: bookingDataRef.current.name || '', phone: phoneText, draft: bookingDataRef.current };
        localStorage.setItem('lakme_pre_register', JSON.stringify(pre));
      } catch (e) { console.warn('Failed to save pre-register info', e); }
      addMessage('assistant', 'Great — I have your details. I will open the registration page for you to set email and password.');
      speakGroq('Great — I have your details. I will open the registration page for you to set email and password.');
      // give TTS time to start then redirect
      setTimeout(() => { window.location.href = '/register'; }, 1200);
      setBookingStep(null);
      return;
    }

    console.log('User confirming booking...');
    if (step === 'confirm') {
      // Allow user to ask the assistant to "repeat" the booking summary
      if (/\b(repeat|say again)\b/i.test(userText)) {
        var dataR = bookingDataRef.current;
        var repeatMsg = `Let me repeat your booking: Name: ${dataR.name || 'not provided'}; Phone: ${dataR.phone || 'not provided'}; Service: ${dataR.service || 'not provided'}; Date: ${dataR.date || 'not provided'}; Time: ${dataR.time || 'not provided'}. Does this look correct? Please say yes or no.`;
        addMessage('assistant', repeatMsg);
        speakGroq(repeatMsg);
        return;
      }
      if (/yes|confirm|correct|okay|ok/i.test(userText)) {
        // Submit booking
        var data = bookingDataRef.current;
        var token = localStorage.getItem('lakme_token');
        const bookStart = Date.now();
        try {
          console.log('Attempting to submit booking...');
          setStatusText('Booking...');
          // Save draft before submitting
          saveDraft(data);
          saveUserData({ name: data.name, phone: data.phone, email: data.email });

          if (token) {
              var bookResp = await API.post('/ai/voice-book', { serviceName: data.service, dateText: data.date, timeSlot: data.time });
              var bookData = bookResp.data;
              console.log('AI booking response received:', bookData);
              if (bookData && bookData.success) {
              var successMsg = "✅ Excellent! Your booking is confirmed. " + bookData.message + ". A confirmation email will be sent to you shortly. Thank you for choosing Lakmé Salon!";
              addMessage('assistant', successMsg);
              speakGroq(successMsg);
              localStorage.removeItem('lakme_booking_draft');
              setBookingStep(null);
              updateBookingData({ name: null, phone: null, service: null, date: null, time: null, email: null });
              setStatusText('Tap mic to speak');
              return;
            } else {
              console.error('AI booking failed:', bookData);
              var backendMsg = (bookData && (bookData.message || bookData.error)) ? (bookData.message || bookData.error) : 'Unable to complete booking. Please try again.';
              addMessage('assistant', backendMsg);
              speakGroq(backendMsg);
              setBookingStep(null);
              setStatusText('Tap mic to speak');
              return;
            }
          }

          // Guest booking flow: obtain reCAPTCHA token (if configured) then POST to guest endpoint
          var recaptchaToken = null;
          if (process.env.REACT_APP_RECAPTCHA_SITE_KEY) {
            try {
              console.log('Requesting reCAPTCHA token...');
              recaptchaToken = await getRecaptchaToken('voice_book_guest');
            } catch (gErr) {
              console.warn('reCAPTCHA token error', gErr);
            }
          }

          var guestResp = await API.post('/ai/voice-book/guest', { toEmail: data.email, toName: data.name, serviceName: data.service, dateText: data.date, timeSlot: data.time, recaptchaToken });
          setConnStats(prev => ({ ...prev, latency: Date.now() - bookStart }));
          console.log('AI response received (Guest-flow).');
          console.log('Guest booking response received:', guestResp.data);
          var guestData = guestResp.data;
          if (guestData && guestData.success) {
              var successMsg2 = '✅ Excellent! Your booking is confirmed and a confirmation email has been sent to ' + data.email + '. Confirmed via Voice Assistant — thank you for choosing Lakmé Salon!';
            addMessage('assistant', successMsg2);
            speakGroq(successMsg2);
            localStorage.removeItem('lakme_booking_draft');
            setBookingStep(null);
            updateBookingData({ name: null, phone: null, service: null, date: null, time: null, email: null });
            setStatusText('Tap mic to speak');
          } else {
            var backendMsg2 = (guestData && (guestData.message || guestData.error)) ? (guestData.message || guestData.error) : 'Unable to complete booking. Please try again.';
            console.error('Guest booking failed:', guestData);
            addMessage('assistant', backendMsg2);
            speakGroq(backendMsg2);
            setBookingStep(null);
            setStatusText('Tap mic to speak');
          }
        } catch (e) {
          console.error('Booking fetch error:', e);
          console.log('Booking conversation complete.');
          const serverMsg = e?.response?.data?.message || e?.serverMessage || e?.message || 'There was an error completing your booking. Please try again later.';
          // If backend returned alternative slots, offer them to the user
          const alternatives = e?.response?.data?.alternatives || null;
          // If server returned 409 (just booked), fetch live available slots and offer them
          if (e?.response?.status === 409) {
            try {
              const dateQuery = bookingDataRef.current.date || bookingDataRef.current.dateText || 'tomorrow';
              const slotsResp = await API.get(`/bookings/slots?date=${encodeURIComponent(dateQuery)}`);
              const live = slotsResp?.data?.data || [];
              if (live && live.length > 0) {
                const altText2 = `That slot was just taken. Available slots are: ${live.slice(0,4).join(', ')}. Which one would you prefer?`;
                addMessage('assistant', altText2);
                speakGroq(altText2);
                setAlternativeSlots(live.slice(0,4));
                setBookingStep('chooseAlternative');
                setStatusText('Choose an alternative slot');
                return;
              }
            } catch (errSlots) { console.warn('Failed to fetch live slots', errSlots); }
          }
          if (alternatives && alternatives.length > 0) {
            const altText = `That slot is taken. Available alternatives are: ${alternatives.slice(0,3).join(', ')}. Which one would you prefer?`;
            addMessage('assistant', altText);
            speakGroq(altText);
            setAlternativeSlots(alternatives.slice(0,3));
            setBookingStep('chooseAlternative');
            setStatusText('Choose an alternative slot');
            return;
          }

          // Handle reCAPTCHA or forbidden responses with clear guidance
          if (e?.response?.status === 403 || /recaptcha/i.test(serverMsg)) {
            const rcMsg = 'I could not verify that you are human. Please complete the captcha on the booking page or try again from the website. I can also open the booking page for you.';
            addMessage('assistant', rcMsg);
            speakGroq(rcMsg);
            setShowManualSend(true);
            setBookingStep(null);
            setStatusText('reCAPTCHA required');
            return;
          }

          addMessage('assistant', serverMsg);
          speakGroq(serverMsg);
          setBookingStep(null);
          setStatusText('Tap mic to speak');
        }
        console.log('Booking conversation complete.');
        console.log('Conversation complete.');

      } else if (/no|incorrect|wrong/i.test(userText)) {
        var retryMsg = "No problem! Let's start over. What is your full name?";
        addMessage('assistant', retryMsg);
        speakGroq(retryMsg);
        setBookingStep('askName');
        console.log('Booking cancelled by user, restarting flow.');
        updateBookingData({ name: null, phone: null, service: null, date: null, time: null });
      } else {
        var clarifyMsg = "Please say yes if the details are correct, or no if you'd like to change something.";
        addMessage('assistant', clarifyMsg);
        speakGroq(clarifyMsg);
      }
      return;
    }
  }

  // ── Web Speech STT ────────────────────────────────────────────────────────
  function startListening() {
    console.log('Attempting to start listening...');
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatusText('Voice not supported'); return; }
    // Prevent starting STT while TTS is speaking to avoid race conditions
    try {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        console.log('TTS speaking — delaying STT start until speech ends.');
        setTimeout(() => { try { startListening(); } catch(e) {} }, 600);
        return;
      }
    } catch (e) { console.warn('Error checking speechSynthesis state', e); }
    
    if(srRef.current) { try{srRef.current.abort(); console.log('Aborting previous listening session.');}catch(e){} }
    
    // Reset restart counter for this new listening session
    listenRestartCountRef.current = 0;
    
    console.log('Listening started.');
    console.log('Listening started (Awaiting user speech)...');
    setPhase('listening'); phaseRef.current = 'listening';
    setStatusText('Listening… speak now');
    hasLoudSpeechRef.current = false; // Reset the "gate" for this session
    setVolume(0);
    setShowManualSend(false); // Hide manual send button initially

    // Set overall listening timeout (20 seconds max per listening session)
    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
    listeningTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === 'listening') {
        console.log('Listening timeout reached (20s). Stopping listening.');
        if (srRef.current) { try { srRef.current.abort(); } catch(e) {} }
        setPhase('idle');
        phaseRef.current = 'idle';
        setStatusText('No speech detected. Tap mic to try again.');
      }
    }, 20000); // 20 second timeout

    // Setup a parallel volume monitor to act as a logical noise gate
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      // Reuse existing audioContext or create new one (only create ONE)
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioContext = audioCtxRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        // Ensure we only check volume if still listening
        if (phaseRef.current !== 'listening') {
          setVolume(0);
          stream.getTracks().forEach(t => t.stop());
          // Don't close AudioContext here - reuse it
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate peak volume for better visual response
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > peak) peak = dataArray[i];
        }
        
        setVolume(peak);
        // Open gate if volume hits a reasonable threshold
        if (peak > 20) hasLoudSpeechRef.current = true; // Lowered threshold to be more sensitive to normal speech
        
        // Sensitivity threshold: 15 (tuned for average phone/laptop mic)
        if (peak > 15) hasLoudSpeechRef.current = true; 
        
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    }).catch(err => {
      console.error('getUserMedia error:', err.name, err.message);
      setMicPermission('denied');
      setStatusText('Microphone denied. Try typing instead.');
      setShowManualSend(true);
      setPhase('listening');
    });
    
    var r = new SR();
    r.lang = 'en-IN';
    r.continuous = false; // Set to false to stop after a pause
    r.interimResults = true;
    r.maxAlternatives = 1;
    
    var finalText = ''; // Reset transcript
    var interimText = '';

    r.onstart = () => { finalText = ''; interimText = ''; };

    r.onresult = (e) => {
      // We must rebuild the entire transcript from index 0 to ensure we don't lose the start of the sentence
      var currentFinal = '';
      var currentInterim = '';
      for (var i = 0; i < e.results.length; i++) {
        var transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          currentFinal += transcript + ' ';
        } else {
          currentInterim += transcript;
        }
      }
      finalText = currentFinal;
      interimText = currentInterim;
      currentTranscriptRef.current = { finalText, interimText };

      // If final speech is detected, process it immediately
      if (e.results[e.resultIndex].isFinal) {
        console.log('Final transcript received:', (finalText + ' ' + interimText).trim());
        console.log('Transcript received:', (finalText + ' ' + interimText).trim());
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
        var text = (finalText + ' ' + interimText).trim();
        // Deduplicate identical transcripts to avoid double-processing
        if (text && text !== lastProcessedTextRef.current) {
          lastProcessedTextRef.current = text;
          processSpeech(text);
        } else {
          console.log('Duplicate transcript ignored:', text);
        }
      } else {
        // If only interim results, reset silence timer to slightly longer duration
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (phaseRef.current !== 'listening') return;
          var text = (finalText + ' ' + interimText).trim();
          if (text.length > 2) { // Only process if there's meaningful text
            if (text !== lastProcessedTextRef.current) {
              lastProcessedTextRef.current = text;
              processSpeech(text);
            } else {
              console.log('Interim duplicate ignored.');
            }
          } else {
            console.log('No meaningful text detected, continuing to listen...');
            // Restart listening if not enough text
            setTimeout(() => startListening(), 300);
          }
        }, 1400); // Slightly increased to 1.4s to allow natural pauses
      }
    };

    r.onerror = (e) => {
      console.log('Speech error:', e.error);
      console.log('Restart attempts:', listenRestartCountRef.current);
      
      // Ignore "aborted" errors - they're normal when user stops listening
      if (e.error === 'aborted') {
        console.log('Speech aborted (normal behavior).');
        return;
      }
      
      // Limit restart attempts to prevent infinite loop
      const recoverable = (e.error === 'no-speech' || e.error === 'audio-capture' || e.error === 'network');
      const MAX_RETRIES = 3;

      if (recoverable && listenRestartCountRef.current < MAX_RETRIES) {
        listenRestartCountRef.current++;
        // exponential backoff to avoid rapid restarts causing race with TTS
        const backoff = restartBackoffRef.current;
        const delay = backoff.nextDelay;
        backoff.attempts = (backoff.attempts || 0) + 1;
        backoff.nextDelay = Math.min(3000, delay * 2);
        console.log('Recoverable speech error, will retry after', delay, 'ms. Attempt', listenRestartCountRef.current);
        setTimeout(() => { try { startListening(); } catch (err) { console.warn('Restart failed', err); } }, delay);
        return;
      }

      // If we reach here, show manual input fallback
      console.warn('Speech recognition error unrecoverable or max retries exceeded. Falling back to manual input.');
      setStatusText('Voice not responding. Type instead (or refresh):');
      setShowManualSend(true);
      setVolume(0);
      setPhase('idle'); 
      phaseRef.current = 'idle';
      listenRestartCountRef.current = 0; // Reset on fatal error
      restartBackoffRef.current = { attempts: 0, nextDelay: 300 };
      console.error('Fatal speech recognition error:', e);
    };

    r.onend = () => {
      // Clear timers
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
      // If the phase is still 'listening', it means no valid speech was processed
      // or the processing hasn't changed the phase yet.
      // In this case, we should restart listening to continue the conversation.
      if (phaseRef.current === 'listening') {
        console.log('Listening ended unexpectedly, restarting.');
        setTimeout(() => { try { startListening(); } catch (e) {} }, 300);
      } else {
        console.log('Listening ended, phase is not "listening". Current phase:', phaseRef.current);
      }
    };

    srRef.current = r;
    try { r.start(); } catch(e) { console.log('SR start error:', e); }
  }

  async function processSpeech(text) {
    console.log('Transcript received:', text);
    // Dedupe: ignore immediate repeated transcripts (common with continuous SR)
    try {
      const now = Date.now();
      if (text && lastProcessedTextRef.current && text.trim().toLowerCase() === lastProcessedTextRef.current.trim().toLowerCase()) {
        if (now - (lastProcessedAtRef.current || 0) < 3000) {
          console.log('Duplicate transcript ignored:', text);
          return;
        }
      }
      lastProcessedTextRef.current = text;
      lastProcessedAtRef.current = now;
    } catch (e) { }
    // Allow short confirmations (yes/no) during booking confirm step even if short
    const isConfirmShort = bookingStepRef.current === 'confirm' && /\b(yes|no|yeah|yep|yup|sure|confirm|ok|okay)\b/i.test(text);
    if ((text.length > 3 && hasLoudSpeechRef.current) || isConfirmShort) {
      if (srRef.current) { try { srRef.current.stop(); console.log('Listening stopped due to valid speech.'); } catch(e) {} } // Stop listening immediately
      setPhase('thinking'); phaseRef.current = 'thinking';
      setStatusText('Thinking…'); // Update status text
      addMessage('user', text);
      console.log('Sending to AI:', text);
      if (bookingStepRef.current) {
        await processBookingResponse(text);
      } else if (/book|appointment|reserve/i.test(text)) {
        startBookingFlow();
      } else if (/register|sign up|signup|create account|sign me up|help me register|help me with register|i want to register|i want to sign up|sign me up please/i.test(text)) {
        // Directly handle register phrases locally to avoid network calls
        setBookingStep('collectName');
        const prompt = 'Sure — I can help you register. What is your full name?';
        addMessage('assistant', prompt);
        speakGroq(prompt);
        (async () => {
          try {
            const ok = await ensureMicPermission();
            if (ok) setTimeout(() => { try { startListening(); } catch(e) {} }, 1200);
          } catch (e) { console.warn('ensureMicPermission failed', e); }
        })();
        return;
      } else {
        await askGroq(text);
      }
    } else { // If silence detected but no valid speech, just restart listening
      console.log('Speech too quiet or too short, restarting listener.');
      
      // ── TIER 2: Hesitation Detection ──
      // If in booking step and silence detected, provide gentle prompt
      if (bookingStepRef.current) {
        const step = bookingStepRef.current;
        const hesitationPrompts = {
          'askName': "Take your time. What's your full name?",
          'askPhone': "I'm ready. What's your phone number?",
          'askService': 'Which service are you interested in?',
          'askDate': 'When would you like to visit us?',
          'askTime': 'What time works best for you?',
          'askEmail': 'Could you provide your email address?',
          'confirm': 'Just let me know if everything looks correct.'
        };
        
        const prompt = hesitationPrompts[step] || 'Please continue.';
        console.log('[TIER2] Hesitation detected in step:', step);
        addMessage('assistant', prompt);
        enhancedSpeak(prompt);
      }
      
      setTimeout(() => { try { startListening(); } catch (e) {} }, 500);
      if (srRef.current) { try { srRef.current.stop(); console.log('Listening stopped due to invalid speech, restarting.'); } catch(e) {} }
      setTimeout(() => { try { startListening(); } catch (e) {} }, 300); // This prevents the manual send button from appearing for accidental mic triggers
    }
  }

  // ── reCAPTCHA v3 helper ───────────────────────────────────────────────────
  function loadRecaptchaScript(siteKey) {
    return new Promise((resolve, reject) => {
      if (!siteKey) return reject(new Error('reCAPTCHA site key not provided'));
      if (window.grecaptcha) return resolve(window.grecaptcha);
      const id = 'recaptcha-v3-script';
      if (document.getElementById(id)) {
        const intv = setInterval(() => { if (window.grecaptcha) { clearInterval(intv); resolve(window.grecaptcha); } }, 200);
        setTimeout(() => clearInterval(intv), 8000);
        return;
      }
      const s = document.createElement('script');
      s.id = id;
      s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      s.async = true;
      s.defer = true;
      s.onload = () => { if (window.grecaptcha) resolve(window.grecaptcha); else reject(new Error('grecaptcha not available after load')); };
      s.onerror = (e) => reject(e || new Error('Failed to load reCAPTCHA'));
      document.head.appendChild(s);
    });
  }

  async function getRecaptchaToken(action = 'general') {
    const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    if (!siteKey) throw new Error('RECAPTCHA_SITE_KEY not configured');
    const gre = await loadRecaptchaScript(siteKey);
    return await gre.execute(siteKey, { action });
  }

  // Simple TTS test helper (uses existing speakGroq and selected voice)
  function testTTS() {
    try {
      console.log('Initiating TTS test.');
      const sample = 'This is a test of the Lakme voice assistant text to speech. If you hear this, T T S is working.';
      addMessage('assistant', sample);
      speakGroq(sample);
    } catch (e) {
      console.error('TTS test failed', e);
      addMessage('assistant', 'TTS test failed: ' + (e && e.message));
    }
  }
  // (dev helpers removed)

  function stopListening() {
    console.log('Stopping listening interaction.');
    if(srRef.current) { try { srRef.current.abort(); } catch(e) {} }
    if(silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if(callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    if(listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
    setCallDuration(0);
    setPhase('idle');
    setStatusText('Tap mic to speak');
  }

  // ── Groq LLM (for general questions) ──────────────────────────────────────
  async function askGroq(userText) {
    // Quick canned replies for greetings / short chit-chat to avoid hitting LLM
    const canned = {
      hi: 'Hi! How can I help you today?',
      hello: 'Hello! Looking to book or need styling advice?',
      hey: 'Hey there — would you like to book an appointment or chat about styles?',
      thanks: "You're welcome! Anything else I can do?",
      'thank you': "You're welcome! Anything else I can do?"
    };
    const clean = userText.trim().toLowerCase();
    if (clean.length <= 20) {
      const key = canned[clean] ? clean : (clean.replace(/[!.,?]/g,'') in canned ? clean.replace(/[!.,?]/g,'') : null);
      if (key || /^(hi|hello|hey|hlo|thanks|thank you)$/.test(clean)) {
        const reply = canned[key] || 'Hi! How can I help you today?';
      addMessage('assistant', reply);
      speakGroq(reply);
      return;
    }
    }
    setPhase('thinking'); phaseRef.current = 'thinking';
    setStatusText('Thinking…');
    console.log('Sending to AI (general question):', userText);
    setVolume(0);
    setShowManualSend(false); // Hide manual send button when thinking
    const startTime = Date.now();

    try {
      var res = await API.post('/ai/voice-chat', {
        messages: [
          { role: 'system', content: 'You are Lakmé Salon assistant. Keep responses under 2 sentences for voice.' },
          ...messagesRef.current.slice(-8).map(m => ({role: m.role, content: m.text})),
          { role: 'user', content: userText }
        ]
      });
      console.log('AI response received.');
      setConnStats(prev => ({ ...prev, latency: Date.now() - startTime }));
      var data = res.data;
      var reply = data?.choices?.[0]?.message?.content || "I'm sorry, I couldn't understand. Please try again!";
      addMessage('assistant', reply);
      console.log('Conversation complete.');
      speakGroq(reply);
    } catch(e) {
      setConnStats(prev => ({ ...prev, latency: Date.now() - startTime, quality: 'Poor' }));
      var fb = "I'm having trouble connecting. Please try again!";
      addMessage('assistant', fb);
      speakGroq(fb);
    }
  }

  function micClick() {
    (async () => {
      console.log('Mic button clicked. Current phase:', phase);
      if (phase === 'listening') return stopListening();
      // try to ensure microphone permission before starting
      const ok = await ensureMicPermission();
      if (!ok) {
        const msg = 'Microphone access is blocked. Please allow microphone in the browser (click the lock icon near the address bar) and try again.';
        setStatusText('Microphone blocked');
        addMessage('assistant', msg);
        try { speakGroq('I need microphone permission. Please enable the microphone in your browser settings.'); } catch(e){}
        return;
      }
      // Do not start STT while TTS is active — wait until speaking ends
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        console.log('Waiting for TTS to finish before starting STT');
        setStatusText('Waiting for assistant to finish...');
        // start after a brief delay; speakGroq/onend will also auto-start when done
        setTimeout(() => { try { startListening(); } catch(e){} }, 600);
      } else if (phase === 'idle' || phase === 'speaking') startListening(); // Only start listening if idle or bot finished speaking
      setShowManualSend(false); // Hide manual send button when mic is clicked to start/stop
    })();
  }

  function sendManualText() {
    const text = manualTextInput.trim();
    if (!text) return;
    // If assistant is currently asking for a date, validate and block past dates locally
    if (bookingStepRef.current === 'askDate') {
      const parsed = isValidDate(text);
      if (!parsed) {
        const msg = "I didn't understand that date. Please say today, tomorrow, or a weekday like Monday.";
        addMessage('assistant', msg);
        speakGroq(msg);
        setManualTextInput('');
        return;
      }
      if (isPastDate(parsed)) {
        const msg = 'That date has already passed. Please choose today, tomorrow, or a future date.';
        addMessage('assistant', msg);
        speakGroq(msg);
        setManualTextInput('');
        return;
      }
    }
    addMessage('user', text);
    setManualTextInput('');
    setShowManualSend(false);
    processSpeech(text);
  }



  var disabled = phase === 'speaking' || phase === 'thinking';

  return React.createElement('div', { style: styles.modalBackdrop, onClick: e => { if(e.target===e.currentTarget) { stopListening(); onClose(); } } },
    React.createElement('div', { style: styles.voiceModal },
        React.createElement('div', { style: styles.vmHeader },
        React.createElement('div', { style: styles.vmLogo }, React.createElement('span', { style:{fontSize:20} }, '🎙')),
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: styles.vmTitle }, 'Voice Assistant'),
          React.createElement('div', { style: styles.vmSub }, 'Lakmé Salon · Smart Booking')
        ),
        React.createElement('div', { style: styles.vmConnWrap },
          React.createElement('div', { style: Object.assign({}, styles.vmConnDot, { backgroundColor: connStats.quality === 'Good' ? '#0F9B58' : (connStats.quality === 'Fair' ? '#F5A623' : '#C8003B') }) }),
          React.createElement('span', { style: styles.vmConnText }, connStats.quality + (connStats.latency > 0 ? ` (${connStats.latency}ms)` : ''))
        ),
        React.createElement('button', { onClick: () => { stopListening(); onClose(); }, style: styles.vmClose }, '✕')
      ),
      React.createElement('div', { style: styles.vmDisplayArea },
        React.createElement('div', { style: styles.vmTimer }, formatTime(callDuration)),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', color:'#c9a84c', fontSize:'20px', fontWeight: '500' } },
          phase==='listening' ? '🎙 Listening...' :
          phase==='thinking' ? React.createElement(React.Fragment, null, '✨ Thinking...', React.createElement('div', { style: styles.vmSpinner })) :
          phase==='speaking' ? React.createElement(React.Fragment, null, '🔊 Speaking...', React.createElement('div', { style: styles.vmSpinner })) :
          'Ready to help'
        )
      ),
      // Alternative slots tappable UI
      alternativeSlots && alternativeSlots.length > 0 ? React.createElement('div', { style: styles.alternativesWrap },
        React.createElement('div', { style: styles.alternativesLabel }, 'Available alternatives'),
        React.createElement('div', { style: styles.alternativesList },
          alternativeSlots.map((s, idx) => React.createElement('button', {
            key: s + idx,
            style: styles.alternativeBtn,
            onClick: async () => {
              updateBookingData({ time: s });
              setBookingStep('confirm');
              setAlternativeSlots([]);
              try { await processBookingResponse('yes'); } catch(e){ console.warn('Alt select error', e); }
            }
          }, s))
        )
      ) : null,
      React.createElement('div', { style: styles.vmMicArea },
        // Visual Sound Wave
        React.createElement('div', { style: styles.waveContainer },
          [0.4, 0.7, 1.1, 0.9, 0.6, 0.4].map((scale, i) => 
            React.createElement('div', { 
              key: i,
              style: Object.assign({}, styles.waveBar, { 
                height: `${Math.max(4, (volume / 255) * 50 * scale)}px`,
                backgroundColor: phase === 'listening' ? '#c9a84c' : (phase === 'speaking' ? '#fff' : '#333'),
                opacity: phase === 'idle' ? 0.2 : 1
              }) 
            })
          )
        ),
        React.createElement('div', { style: styles.vmStatusText }, statusText),
        
        // Manual text input (shown when voice fails)
        showManualSend ? React.createElement('div', { style: { padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' } },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Type your message...',
            value: manualTextInput,
            onChange: e => setManualTextInput(e.target.value),
            onKeyPress: e => e.key === 'Enter' && sendManualText(),
            style: {
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #c9a84c',
              borderRadius: '6px',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'Montserrat'
            }
          }),
          React.createElement('button', {
            onClick: sendManualText,
            style: styles.vmManualSendBtn
          }, 'Send')
        ) : null,
        
        React.createElement('div', { style: styles.vmRingWrap },
          (phase==='listening'||phase==='speaking') ? React.createElement(React.Fragment, null,
            React.createElement('div', { style: Object.assign({},styles.vmRing,{animationDuration:'1.2s'}) }),
            React.createElement('div', { style: Object.assign({},styles.vmRing,{animationDuration:'2s',animationDelay:'0.3s'}) })
          ) : null,
          React.createElement('button', { onClick: micClick, disabled, style: Object.assign({}, styles.vmMicBtn, { background: phase==='listening' ? '#c9a84c' : 'linear-gradient(135deg, #c9a84c, #a07830)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 }) }, phase==='thinking' ? React.createElement('span',{style:{fontSize:24}},'⋯') : phase==='listening' ? React.createElement('svg',{width:28,height:28,fill:'white',viewBox:'0 0 24 24'},React.createElement('rect',{x:6,y:4,width:4,height:16,rx:2}),React.createElement('rect',{x:14,y:4,width:4,height:16,rx:2})) : React.createElement('svg',{width:28,height:28,fill:'white',viewBox:'0 0 24 24'},React.createElement('path',{d:'M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z'})))
        ),
        React.createElement('div', { style: styles.vmHint }, 
          phase==='speaking'?'Bot is talking...':
          phase==='thinking'?'Processing...':
          phase==='listening'?'Ask me anything...':
          'Tap to restart flow'
        ),
        
        // Phone call style "End" button
        phase !== 'idle' ? React.createElement('button', { 
          onClick: stopListening, 
          style: styles.vmEndBtn 
        }, 'End Interaction') : null
      )
    ),
    React.createElement('style', null, `@keyframes lva-ring-pulse { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.2);opacity:0} }`)
  );
}

function AIAssistantSection({ onOpenChat }) {
  // ── TIER 1: State variables for outer component ──
  const MAX_RETRIES = 3;
  var [isOnline, setIsOnline] = React.useState(navigator.onLine);
  var [errorState, setErrorState] = React.useState(null);
  var [retryCount, setRetryCount] = React.useState(0);
  var [hasDraft, setHasDraft] = React.useState(false);
  
  var [voiceOpen, setVoiceOpen] = React.useState(false);
  var [hoverVoice, setHoverVoice] = React.useState(false);
  var [hoverMsg, setHoverMsg] = React.useState(false);

  // ── TIER 1: Offline detection ──
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check for saved draft on mount
    try {
      const savedDraft = localStorage.getItem('lakme_booking_draft');
      if (savedDraft) {
        setHasDraft(true);
      }
    } catch (e) {
      console.warn('Failed to check draft:', e);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── TIER 1: Helper functions ──
  const clearDraft = () => {
    try {
      localStorage.removeItem('lakme_booking_draft');
      setHasDraft(false);
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  };

  const loadDraft = () => {
    try {
      const draft = localStorage.getItem('lakme_booking_draft');
      return draft ? JSON.parse(draft) : null;
    } catch (e) {
      console.warn('Failed to load draft:', e);
      return null;
    }
  };

  const retryLastAction = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
    }
  };

  return React.createElement('section', { style: styles.section },
    React.createElement('div', { style: styles.bgDecor, 'aria-hidden':'true' },
      React.createElement('div', { style: styles.bgLine1 }),
      React.createElement('div', { style: styles.bgLine2 }),
      React.createElement('div', { style: styles.bgGlow })
    ),
    React.createElement('div', { style: styles.container },
      React.createElement('div', { style: styles.badge }, React.createElement('span',{style:styles.badgeDot}), 'AI-POWERED ASSISTANTS'),
      React.createElement('h2', { style: styles.heading }, 'Your Personal', React.createElement('br'), React.createElement('span',{style:styles.headingGold},'Beauty Concierge')),
      React.createElement('p', { style: styles.sub }, 'Talk to our AI or chat instantly — get answers about services,', React.createElement('br'), 'book appointments, and get beauty advice. Available 24/7.'),
      React.createElement('div', { style: styles.cardsRow },
        React.createElement('div', { style: Object.assign({},styles.card,hoverVoice?styles.cardHover:{}), onMouseEnter:()=>setHoverVoice(true), onMouseLeave:()=>setHoverVoice(false) },
          React.createElement('div',{style:styles.cardIconWrap},
            React.createElement('div',{style:Object.assign({},styles.cardIconRing,hoverVoice?styles.cardIconRingActive:{})}),
            React.createElement('div',{style:styles.cardIcon},React.createElement('svg',{width:30,height:30,fill:'#c9a84c',viewBox:'0 0 24 24'},React.createElement('path',{d:'M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z'})))
          ),
          React.createElement('div',{style:styles.cardLabel},'VOICE ASSISTANT'),
          React.createElement('div',{style:styles.cardTitle},'Speak to Us'),
          React.createElement('div',{style:styles.cardDesc},"Smart booking with confirmation. Say your details slowly, we'll repeat them back, and confirm before saving."),
          React.createElement('div',{style:styles.cardFeatures},
            React.createElement('span',{style:styles.cardFeature},'🎙 Voice activated'),
            React.createElement('span',{style:styles.cardFeature},'✅ Details confirmed'),
            React.createElement('span',{style:styles.cardFeature},'🛡️ Smart validation')
          ),
          React.createElement('button',{onClick:()=>setVoiceOpen(true),style:styles.btnGold},'Start Voice Assistant →')
        ),
        React.createElement('div',{style:styles.orDivider},React.createElement('div',{style:styles.orLine}),React.createElement('span',{style:styles.orText},'or'),React.createElement('div',{style:styles.orLine})),
        React.createElement('div',{style:Object.assign({},styles.card,hoverMsg?styles.cardHover:{}),onMouseEnter:()=>setHoverMsg(true),onMouseLeave:()=>setHoverMsg(false)},
          React.createElement('div',{style:styles.cardIconWrap},
            React.createElement('div',{style:Object.assign({},styles.cardIconRing,hoverMsg?styles.cardIconRingActive:{})}),
            React.createElement('div',{style:styles.cardIcon},React.createElement('svg',{width:30,height:30,fill:'#c9a84c',viewBox:'0 0 24 24'},React.createElement('path',{d:'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z'})))
          ),
          React.createElement('div',{style:styles.cardLabel},'HAIR AI · MESSAGE'),
          React.createElement('div',{style:styles.cardTitle},'Chat with AI'),
          React.createElement('div',{style:styles.cardDesc},'Upload a photo, ask about hairstyles, get styling tips, or book — our Hair AI is ready.'),
          React.createElement('div',{style:styles.cardFeatures},
            React.createElement('span',{style:styles.cardFeature},'📸 Photo upload'),
            React.createElement('span',{style:styles.cardFeature},'💬 Live chat'),
            React.createElement('span',{style:styles.cardFeature},'💇 Style advice')
          ),
          React.createElement('button',{onClick:()=>onOpenChat&&onOpenChat(),style:styles.btnOutline},'Open Hair AI Chat →')
        )
      ),
      React.createElement('p',{style:styles.bottomNote},'✦ Both assistants are free to use · No login required · Instant responses'),
      
      // ═══════════════════════════════════════════════════════════
      // TIER 1: UI FOR ERROR, OFFLINE, AND DRAFT FEATURES
      // ═══════════════════════════════════════════════════════════
      
      // Offline Banner
      !isOnline ? React.createElement('div', { style: { padding: '16px 24px', background: '#ff9800', color: '#fff', textAlign: 'center', marginTop: '20px', borderRadius: '8px', fontSize: '14px', fontFamily: "'Montserrat', sans-serif" } },
        '⚠️ You are offline. Booking requests will sync when online.'
      ) : null,
      
      // Error Notification
      errorState ? React.createElement('div', { style: { padding: '16px 24px', background: '#f44336', color: '#fff', marginTop: '20px', borderRadius: '8px', fontFamily: "'Montserrat', sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '8px' } }, '❌ ' + (errorState.type || 'Error')),
          React.createElement('div', { style: { fontSize: '14px' } }, errorState.message)
        ),
        React.createElement('button', {
          onClick: retryLastAction,
          disabled: retryCount >= MAX_RETRIES,
          style: {
            padding: '8px 16px',
            background: '#fff',
            color: '#f44336',
            border: 'none',
            borderRadius: '4px',
            cursor: retryCount >= MAX_RETRIES ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: retryCount >= MAX_RETRIES ? 0.5 : 1
          }
        }, `Retry (${retryCount}/${MAX_RETRIES})`)
      ) : null,
      
      // Draft Restoration Option
      hasDraft ? React.createElement('div', { style: { padding: '16px 24px', background: '#4caf50', color: '#fff', marginTop: '20px', borderRadius: '8px', fontFamily: "'Montserrat', sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '8px' } }, '✓ Draft Booking Found'),
          React.createElement('div', { style: { fontSize: '14px' } }, 'Resume your previous booking')
        ),
        React.createElement('div', { style: { display: 'flex', gap: '8px' } },
          React.createElement('button', {
              onClick: () => {
                const draft = loadDraft();
                if (!draft) return;
                // Prefer updating via helper if available (keeps localStorage in sync)
                try {
                  if (typeof updateBookingData === 'function') {
                    updateBookingData(draft);
                  } else {
                    // Fallback: persist and set ref; some callers may not have setter in scope
                    try { localStorage.setItem('lakme_booking_draft', JSON.stringify(draft)); } catch(e){}
                    if (typeof bookingDataRef !== 'undefined' && bookingDataRef && bookingDataRef.current !== undefined) bookingDataRef.current = draft;
                    // Notify any listeners elsewhere
                    window.dispatchEvent(new CustomEvent('lakme_booking_resume', { detail: draft }));
                  }
                } catch (e) { console.warn('Resume handler error', e); }
                try { setVoiceOpen(true); } catch(e) { /* ignore */ }
              },
              style: { padding: '8px 16px', background: '#fff', color: '#4caf50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
            }, 'Resume'),
          React.createElement('button', {
            onClick: () => { clearDraft(); setHasDraft(false); },
            style: { padding: '8px 16px', background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
          }, 'Clear')
        )
      ) : null
    ),
    voiceOpen ? React.createElement(VoiceAssistantModal,{onClose:()=>setVoiceOpen(false)}) : null
  );
}

var styles = {
  section:{position:'relative',background:'#0a0a0a',padding:'100px 24px',overflow:'hidden',fontFamily:"'Cormorant Garamond','Playfair Display',Georgia,serif"},
  bgDecor:{position:'absolute',inset:0,pointerEvents:'none'},
  bgLine1:{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:1,height:'100%',background:'linear-gradient(to bottom,transparent,rgba(201,168,76,0.15),transparent)'},
  bgLine2:{position:'absolute',top:'50%',left:0,transform:'translateY(-50%)',height:1,width:'100%',background:'linear-gradient(to right,transparent,rgba(201,168,76,0.08),transparent)'},
  bgGlow:{position:'absolute',top:'30%',left:'50%',transform:'translate(-50%,-50%)',width:600,height:400,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(201,168,76,0.06) 0%,transparent 70%)'},
  container:{maxWidth:960,margin:'0 auto',position:'relative',textAlign:'center'},
  badge:{display:'inline-flex',alignItems:'center',gap:8,fontSize:11,letterSpacing:'0.2em',color:'#c9a84c',fontFamily:"'Montserrat','Arial Narrow',sans-serif",fontWeight:600,marginBottom:24},
  badgeDot:{width:6,height:6,borderRadius:'50%',background:'#c9a84c',boxShadow:'0 0 8px rgba(201,168,76,0.8)',display:'inline-block'},
  heading:{fontSize:'clamp(36px,5vw,58px)',fontWeight:400,color:'#f5f0e8',margin:'0 0 16px',lineHeight:1.15},
  headingGold:{color:'#c9a84c',fontStyle:'italic'},
  sub:{fontSize:16,color:'#888',lineHeight:1.7,marginBottom:64,fontFamily:"'Montserrat',sans-serif",fontWeight:300},
  cardsRow:{display:'flex',alignItems:'stretch',gap:0,justifyContent:'center',flexWrap:'wrap'},
  card:{flex:'1 1 320px',maxWidth:380,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:2,padding:'48px 36px',textAlign:'left',transition:'background 0.3s,border-color 0.3s,transform 0.3s'},
  cardHover:{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.5)',transform:'translateY(-4px)'},
  cardIconWrap:{position:'relative',width:64,height:64,marginBottom:28},
  cardIconRing:{position:'absolute',inset:-8,border:'1px solid rgba(201,168,76,0.2)',borderRadius:'50%',transition:'border-color 0.3s'},
  cardIconRingActive:{border:'1px solid rgba(201,168,76,0.6)'},
  cardIcon:{width:64,height:64,borderRadius:'50%',background:'rgba(201,168,76,0.12)',display:'flex',alignItems:'center',justifyContent:'center'},
  cardLabel:{fontSize:10,letterSpacing:'0.25em',color:'#c9a84c',fontFamily:"'Montserrat',sans-serif",fontWeight:700,marginBottom:8},
  cardTitle:{fontSize:26,fontWeight:500,color:'#f5f0e8',marginBottom:14},
  cardDesc:{fontSize:14,color:'#777',lineHeight:1.7,fontFamily:"'Montserrat',sans-serif",fontWeight:300,marginBottom:24},
  cardFeatures:{display:'flex',flexDirection:'column',gap:8,marginBottom:32},
  cardFeature:{fontSize:12,color:'#999',fontFamily:"'Montserrat',sans-serif"},
  btnGold:{width:'100%',padding:'14px 24px',background:'linear-gradient(135deg,#c9a84c,#a07830)',border:'none',borderRadius:1,color:'#0a0a0a',fontSize:12,fontFamily:"'Montserrat',sans-serif",fontWeight:700,letterSpacing:'0.1em',cursor:'pointer'},
  btnOutline:{width:'100%',padding:'14px 24px',background:'transparent',border:'1px solid rgba(201,168,76,0.5)',borderRadius:1,color:'#c9a84c',fontSize:12,fontFamily:"'Montserrat',sans-serif",fontWeight:700,letterSpacing:'0.1em',cursor:'pointer'},
  orDivider:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 20px',gap:12,minWidth:40},
  orLine:{width:1,flex:1,minHeight:40,background:'rgba(201,168,76,0.2)'},
  orText:{fontSize:11,color:'#555',letterSpacing:'0.1em',fontFamily:"'Montserrat',sans-serif"},
  bottomNote:{marginTop:56,fontSize:12,color:'#555',fontFamily:"'Montserrat',sans-serif"},
  modalBackdrop:{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999,padding:16},
  voiceModal:{background:'#111',border:'1px solid rgba(201,168,76,0.3)',borderRadius:4,width:'100%',maxWidth:'min(440px,96vw)',display:'flex',flexDirection:'column',maxHeight:'90vh',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,0.6)'},
  vmHeader:{padding:'20px 24px',borderBottom:'1px solid rgba(201,168,76,0.15)',display:'flex',alignItems:'center',gap:14,background:'rgba(201,168,76,0.05)'},
  vmLogo:{width:44,height:44,borderRadius:'50%',background:'rgba(201,168,76,0.15)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(201,168,76,0.3)'},
  vmTitle:{fontSize:16,fontWeight:500,color:'#f5f0e8',fontFamily:"'Cormorant Garamond',Georgia,serif"},
  vmSub:{fontSize:11,color:'#c9a84c',fontFamily:"'Montserrat',sans-serif",letterSpacing:'0.1em'},
  vmConnWrap: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', marginRight: '10px' },
  vmConnDot: { width: '6px', height: '6px', borderRadius: '50%' },
  vmConnText: { fontSize: '10px', color: '#888', fontFamily: 'Montserrat', fontWeight: '500', textTransform: 'uppercase' },
  vmClose:{marginLeft:'auto',background:'none',border:'none',color:'#666',cursor:'pointer',fontSize:18,padding:4}, // Existing close button
  vmDisplayArea: { minHeight:'120px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', borderBottom:'1px solid rgba(255,255,255,0.03)', padding: '12px 16px' },
  vmTimer: { fontSize: '14px', color: '#888', fontFamily: "'Montserrat', sans-serif", letterSpacing: '2px', marginBottom: '12px' },
  vmMicArea:{padding:'32px 20px', display:'flex',flexDirection:'column',alignItems:'center',gap:20,background:'rgba(0,0,0,0.2)'},
  waveContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '60px', width: '100%' },
  waveBar: { width: '4px', borderRadius: '4px', transition: 'height 0.08s ease', minHeight: '4px' },
  vmStatusText:{fontSize:12,color:'#666',fontFamily:"'Montserrat',sans-serif",letterSpacing:'0.05em'},
  vmRingWrap:{position:'relative',width:80,height:80,display:'flex',alignItems:'center',justifyContent:'center'},
  vmRing:{position:'absolute',width:80,height:80,borderRadius:'50%',border:'2px solid rgba(201,168,76,0.5)',animation:'lva-ring-pulse 1.4s ease-out infinite'},
  vmMicBtn:{position:'relative',zIndex:2,width:72,height:72,borderRadius:'50%',border:'2px solid rgba(201,168,76,0.4)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(201,168,76,0.3)'},
  vmHint:{fontSize:12,color:'#c9a84c',fontFamily:"'Montserrat',sans-serif",letterSpacing:'0.05em'},
  vmSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #c9a84c', // Gold color for the spinner
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginLeft: '8px',
  },
  vmManualSendBtn: { background: 'rgba(74,144,217,0.1)', border: '1px solid rgba(74,144,217,0.3)', color: '#4A90D9', padding: '8px 20px', borderRadius: '50px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '10px' },
  vmEndBtn: { background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', padding: '8px 20px', borderRadius: '50px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '10px' },
  alternativesWrap: { padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.02)' },
  alternativesLabel: { fontSize: 12, color: '#c9a84c', fontWeight: 700, letterSpacing: '0.06em' },
  alternativesList: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 },
  alternativeBtn: { padding: '8px 12px', background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', color: '#f5f0e8', borderRadius: 6, cursor: 'pointer', fontSize: 13 }
};

export default AIAssistantSection;