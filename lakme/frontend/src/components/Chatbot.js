import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ArrowRight, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';

export default function Chatbot({ externalOpen, onExternalOpenHandled }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      onExternalOpenHandled?.();
    }
  }, [externalOpen]);
  const [messages, setMessages] = useState([
    { 
      from: 'bot', 
      text: "Hello! Welcome to Lakmé Salon! 💄✨\n\nI'm your AI beauty assistant. How can I help you today?\n\n• **Book appointments** 📅\n• **Explore services & prices** 💇‍♀️\n• **AI hairstyle suggestions** ✨\n• **Upload photo for analysis** 📸\n• **Hair care advice** 💆‍♀️\n• **Contact info & timings** 📞" 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [bookingState, setBookingState] = useState(null);
// null | 'askService' | 'askDate' | 'askTime' | 'confirm'
  const [bookingData, setBookingData] = useState({});
  
  const bottomRef = useRef();
  const fileInputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, typing]);

const send = async (customMsg = null) => {
  const msg = customMsg || input.trim();
  if (!msg && !selectedImage) return;

  const userMessage = { from: 'user', text: msg, image: imagePreview };
  setMessages(m => [...m, userMessage]);
  setConversationHistory(h => [...h, userMessage]);
  setInput('');
  setTyping(true);
  setLoading(true);

  try {
    // ── IMAGE ANALYSIS ──
    if (selectedImage) {
      await analyzeImage(msg);
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    // ── BOOKING FLOW ──
    if (bookingState === 'askService') {
      setBookingData(p => ({ ...p, service: msg }));
      setBookingState('askDate');
      await new Promise(r => setTimeout(r, 600));
      setTyping(false);
      const botMsg = { from: 'bot', text: `Great choice! 💇‍♀️ What date would you like? (e.g. "tomorrow", "2nd June", "this Saturday")` };
      setMessages(m => [...m, botMsg]);
      setLoading(false);
      return;
    }

    if (bookingState === 'askDate') {
      setBookingData(p => ({ ...p, date: msg }));
      setBookingState('askTime');
      await new Promise(r => setTimeout(r, 600));
      setTyping(false);
      const botMsg = { from: 'bot', text: `Perfect! 📅 What time works for you?\n\nAvailable slots:\n• 09:00 AM • 10:00 AM • 11:00 AM\n• 12:00 PM • 02:00 PM • 03:00 PM\n• 04:00 PM • 05:00 PM • 06:00 PM` };
      setMessages(m => [...m, botMsg]);
      setLoading(false);
      return;
    }

    if (bookingState === 'askTime') {
      const newData = { ...bookingData, time: msg };
      setBookingData(newData);
      setBookingState('confirm');
      await new Promise(r => setTimeout(r, 600));
      setTyping(false);
      const botMsg = { 
        from: 'bot', 
        text: `Here's your booking summary:\n\n💇‍♀️ **Service:** ${newData.service}\n📅 **Date:** ${newData.date}\n⏰ **Time:** ${msg}\n\nShall I confirm this booking? Reply **"yes"** to confirm or **"no"** to cancel.`,
        bookingSummary: newData
      };
      setMessages(m => [...m, botMsg]);
      setLoading(false);
      return;
    }

    if (bookingState === 'confirm') {
      if (/yes|confirm|ok|sure|yeah|yep/i.test(msg)) {
        // Check if user is logged in
        const token = localStorage.getItem('lakme_token');
        if (!token) {
          setBookingState(null);
          setBookingData({});
          await new Promise(r => setTimeout(r, 600));
          setTyping(false);
          const botMsg = { 
            from: 'bot', 
            text: "To book an appointment, you need to be logged in first! 🔐", 
            action: 'navigate', 
            target: '/login' 
          };
          setMessages(m => [...m, botMsg]);
          setLoading(false);
          return;
        }

        // Make real booking
        try {
          const { data } = await API.post('/ai/chat-book', {
          serviceName: bookingData.service,
             dateText: bookingData.date,
            timeSlot: bookingData.time,
});
console.log('Booking response:', data);

          setBookingState(null);
          setBookingData({});
          await new Promise(r => setTimeout(r, 600));
          setTyping(false);

          if (data.success) {
            const botMsg = { 
              from: 'bot', 
              text: `🎉 **Booking Confirmed!**\n\n✅ ${data.message}\n\n📧 A confirmation email has been sent to you!\n\n🌟 You earned loyalty points for this booking!`
            };
            setMessages(m => [...m, botMsg]);
          } else {
            setMessages(m => [...m, { from: 'bot', text: `Sorry, couldn't book: ${data.message}. Please try the booking page!` }]);
          }
        } catch (err) {
          setBookingState(null);
          setTyping(false);
          setMessages(m => [...m, { from: 'bot', text: "Booking failed. Please try again or use the Book Now page! 💄" }]);
        }
        setLoading(false);
        return;

      } else {
        // User said no
        setBookingState(null);
        setBookingData({});
        await new Promise(r => setTimeout(r, 600));
        setTyping(false);
        setMessages(m => [...m, { from: 'bot', text: "No problem! Booking cancelled. Is there anything else I can help you with? 💄" }]);
        setLoading(false);
        return;
      }
    }

    // ── DETECT BOOKING TRIGGER ──
    if (/\b(book|appointment|schedule|reserve)\b/i.test(msg)) {
      setBookingState('askService');
      await new Promise(r => setTimeout(r, 600));
      setTyping(false);
      const botMsg = { from: 'bot', text: "I'd love to book an appointment for you! 💄\n\nWhich service are you interested in?\n\n• Hair Cut & Styling\n• Hair Colour\n• Balayage & Highlights\n• Facial\n• Bridal Makeup\n• Manicure / Pedicure\n• Hair Spa\n• Waxing" };
      setMessages(m => [...m, botMsg]);
      setLoading(false);
      return;
    }

    // ── NORMAL AI CHAT ──
    const { data } = await API.post('/ai/chat', { message: msg, conversationHistory });
    await new Promise(r => setTimeout(r, 600));
    setTyping(false);
    const botMessage = { from: 'bot', text: data.data.message, action: data.data.action, target: data.data.target };
    setMessages(m => [...m, botMessage]);
    setConversationHistory(h => [...h, botMessage]);

  } catch (error) {
    setTyping(false);
    setMessages(m => [...m, { from: 'bot', text: "I'm having trouble connecting. Please try again! 💄" }]);
  } finally {
    setLoading(false);
    setTyping(false);
  }
};

  const analyzeImage = async (additionalContext) => {
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (additionalContext) {
        formData.append('preferences', additionalContext);
      }

      const { data } = await API.post('/ai/analyze-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await new Promise(r => setTimeout(r, 800));
      setTyping(false);
      
      const botMessage = { 
        from: 'bot', 
        text: data.data.analysis,
        imageAnalysis: true
      };
      
      setMessages(m => [...m, botMessage]);
      setConversationHistory(h => [...h, botMessage]);
      
      // Clear image after analysis
      setSelectedImage(null);
      setImagePreview(null);
      setShowImageUpload(false);
      
    } catch (error) {
      setTyping(false);
      setMessages(m => [...m, { 
        from: 'bot', 
        text: "I couldn't analyze the image. Please try again or ensure it's a clear face photo! 📸" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setShowImageUpload(true);
    }
  };

  const handleKey = (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      send(); 
    } 
  };

  const formatText = (text) => {
    return text.split('\n').map((line, i) => {
      // Handle bold text
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <div 
          key={i} 
          dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} 
          style={{ lineHeight: 1.6, marginBottom: '4px' }} 
        />
      );
    });
  };

  const quickActions = [
    { label: 'Book appointment', icon: '📅' },
    { label: 'Services & prices', icon: '💇‍♀️' },
    { label: 'Upload my photo', icon: '📸', action: 'upload' },
    { label: 'Hair care tips', icon: '💆‍♀️' },
    { label: 'Contact us', icon: '📞' }
  ];

  return (
    <>
      <button
  onClick={() => setOpen(!open)}
  style={{
    
    position: 'fixed',
    top: '50%',
    right: 0,
    transform: 'translateX(calc(50% - 18px)) translateY(-50%) rotate(-90deg)',
    transformOrigin: 'center center',
    zIndex: 999,
    background: 'linear-gradient(135deg, #C9A84C, #9A7A30)',
    border: 'none',
    borderRadius: '0 0 10px 10px',
    padding: '10px 18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
    transition: 'background 0.25s',
  }}
  onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #E2C97E, #C9A84C)'}
  onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #C9A84C, #9A7A30)'}
>
 <Sparkles size={14} color="white" />
  <span style={{
    color: 'white',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'var(--font-body)',
    whiteSpace: 'nowrap',
  }}>
    {open ? 'Close Chat' : 'Beauty AI'}
  </span>
  <div style={{
    width: 6, height: 6, borderRadius: '50%',
    background: '#25D366',
    animation: 'pulse 2s infinite',
  }} />
</button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', 
          bottom: 96, 
          right: 28, 
          width: 380, 
          height: 550,
          background: 'white', 
          borderRadius: 16, 
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          border: '1px solid var(--border-light)', 
          display: 'flex', 
          flexDirection: 'column',
          zIndex: 998, 
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #0A0A0A, #1A0A14)', 
            padding: '16px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12 
          }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: 16, 
              flexShrink: 0 
            }}>
              <Sparkles size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>
                Lakmé AI Assistant
              </div>
              <div style={{ color: 'var(--gold)', fontSize: 11 }}>
                ● Powered by AI • Ready to help
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '16px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 12,
            background: '#FAFAFA'
          }}>
            {messages.map((m, i) => (
              <div 
                key={i} 
                style={{ 
                  display: 'flex', 
                  justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' 
                }}
              >
                <div style={{
                  maxWidth: '85%', 
                  padding: '12px 16px', 
                  borderRadius: m.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.from === 'user' 
                    ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))' 
                    : 'white',
                  color: m.from === 'user' ? 'white' : 'var(--text-primary)', 
                  fontSize: 13.5,
                  border: m.from === 'bot' ? '1px solid var(--border-light)' : 'none',
                  boxShadow: m.from === 'bot' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                }}>
                  {m.image && (
  <img
    src={m.image}
    alt="Uploaded"
    style={{
      width: '100%',
      borderRadius: 12,
      marginBottom: 8,
      maxHeight: 220,
      objectFit: 'cover'
    }}
  />
)}

{formatText(m.text)}

{m.action === 'navigate' && m.target && (
  <button
    onClick={() => navigate(m.target)}
    style={{
      marginTop: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      color: 'var(--gold)',
      background: 'rgba(201,168,76,0.1)',
      border: '1px solid var(--gold)',
      cursor: 'pointer',
      padding: '6px 12px',
      borderRadius: 50,
      fontWeight: 600,
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'var(--gold)';
      e.currentTarget.style.color = 'white';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(201,168,76,0.1)';
      e.currentTarget.style.color = 'var(--gold)';
    }}
  >
    Take me there <ArrowRight size={12} />
  </button>
)}

                </div>
              </div>
            ))}
            
            {typing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ 
                  padding: '12px 16px', 
                  background: 'white', 
                  borderRadius: '16px 16px 16px 4px', 
                  border: '1px solid var(--border-light)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div 
                        key={i} 
                        style={{ 
                          width: 7, 
                          height: 7, 
                          borderRadius: '50%', 
                          background: 'var(--gold)', 
                          animation: 'bounce 1s infinite', 
                          animationDelay: `${i * 0.2}s` 
                        }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Image preview if selected */}
          {imagePreview && (
            <div style={{ 
              padding: '12px 16px', 
              background: '#F5F5F5', 
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  width: 60, 
                  height: 60, 
                  objectFit: 'cover', 
                  borderRadius: 8,
                  border: '2px solid var(--gold)'
                }} 
              />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
                Photo ready for analysis! 📸
                <br />
                <span style={{ fontSize: 11 }}>Add preferences or send directly</span>
              </div>
              <button 
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                  setShowImageUpload(false);
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ 
            padding: '8px 12px', 
            borderTop: '1px solid var(--border-light)', 
            display: 'flex', 
            gap: 6, 
            flexWrap: 'wrap',
            background: 'white'
          }}>
            {quickActions.map(q => (
              <button 
                key={q.label} 
                onClick={() => {
                  if (q.action === 'upload') {
                    fileInputRef.current?.click();
                  } else {
                    setInput(q.label);
                    send(q.label);
                  }
                }} 
                style={{
                  fontSize: 10.5, 
                  padding: '6px 10px', 
                  borderRadius: 50, 
                  background: 'var(--cream)',
                  border: '1px solid var(--border-light)', 
                  cursor: 'pointer', 
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s', 
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.background = 'var(--gold)'; 
                  e.currentTarget.style.color = 'white'; 
                  e.currentTarget.style.borderColor = 'var(--gold)'; 
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.background = 'var(--cream)'; 
                  e.currentTarget.style.color = 'var(--text-secondary)'; 
                  e.currentTarget.style.borderColor = 'var(--border-light)'; 
                }}
              >
                <span>{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ 
            padding: '12px 16px', 
            borderTop: '1px solid var(--border-light)', 
            display: 'flex', 
            gap: 8, 
            alignItems: 'center',
            background: 'white'
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--cream)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--gold)';
                e.currentTarget.style.borderColor = 'var(--gold)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--cream)';
                e.currentTarget.style.borderColor = 'var(--border-light)';
              }}
              title="Upload photo for analysis"
            >
              <ImageIcon size={16} color={imagePreview ? 'var(--gold)' : 'var(--text-muted)'} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={imagePreview ? "Add preferences (optional)..." : "Ask me anything..."}
              disabled={loading}
              style={{ 
                flex: 1, 
                padding: '10px 14px', 
                background: 'var(--cream)', 
                border: '1px solid var(--border-light)', 
                borderRadius: 50, 
                fontSize: 13, 
                outline: 'none', 
                fontFamily: 'var(--font-body)' 
              }}
            />
            <button 
              onClick={() => send()} 
              disabled={(!input.trim() && !selectedImage) || loading} 
              style={{
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: (input.trim() || selectedImage) && !loading 
                  ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))' 
                  : 'var(--cream)',
                border: 'none', 
                cursor: (input.trim() || selectedImage) && !loading ? 'pointer' : 'not-allowed', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'all 0.2s', 
                flexShrink: 0
              }}
            >
              <Send 
                size={15} 
                color={(input.trim() || selectedImage) && !loading ? 'white' : 'var(--text-muted)'} 
              />
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
          @keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}
        }
      `}</style>
    </>
  );
}