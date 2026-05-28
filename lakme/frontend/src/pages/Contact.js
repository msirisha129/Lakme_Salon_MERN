import React, { useState } from 'react';
import { Mail, MapPin, Clock, Send, Phone } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/contact', { ...form, method: 'email' });
      toast.success(data.message || 'Message sent! We\'ll get back to you soon.');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: <Phone size={18} />,
      title: 'Phone',
      value: '+91 98765 43210',
      sub: 'Mon–Sat, 9 AM – 8 PM',
    },
    {
      icon: <Mail size={18} />,
      title: 'Email',
      value: 'hello@lakmesalon.com',
      sub: 'Reply within 24 hours',
    },
    {
      icon: <MapPin size={18} />,
      title: 'Location',
      value: 'Multiple Branches',
      sub: (
        <a
          href="https://maps.google.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--gold)', fontSize: 12 }}
        >
          Find nearest salon →
        </a>
      ),
    },
    {
      icon: <Clock size={18} />,
      title: 'Working Hours',
      value: 'Mon–Sat: 9 AM – 8 PM',
      sub: 'Sunday: 10 AM – 7 PM',
    },
  ];

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--cream)' }}>

      {/* ── Hero ── */}
      <div style={{
        backgroundImage: `linear-gradient(to bottom, rgba(5,2,10,0.5) 0%, rgba(5,2,10,0.75) 60%, rgba(5,2,10,0.98) 100%), url('https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1600&q=90')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        padding: '130px 0 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(201,168,76,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="section-label" style={{ letterSpacing: 6, fontSize: 11 }}>Get In Touch</span>
          <h1 style={{ color: 'white', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', marginBottom: 20, fontWeight: 300, letterSpacing: -1 }}>
            Contact Us
          </h1>
          <div className="gold-line" />
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 20, fontSize: 16, lineHeight: 1.8 }}>
            We're here to help — reach us any way you prefer
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="container" style={{ padding: '72px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'start' }}>

          {/* ── Left — Info ── */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 8 }}>
              Let's Talk Beauty
            </h2>
            <div className="gold-line-left" />
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.9, marginBottom: 36, marginTop: 14, fontSize: 14 }}>
              Whether you want to book an appointment, ask about our services, or just say hello — we'd love to hear from you.
            </p>

            {/* Info Cards */}
            <div style={{ display: 'grid', gap: 12, marginBottom: 36 }}>
              {contactInfo.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  padding: '16px 20px', background: 'white',
                  borderRadius: 10, border: '1px solid var(--border-light)',
                  transition: 'box-shadow 0.2s',
                }}>
                  <div style={{ color: 'var(--gold)', marginTop: 2, flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                      {item.title}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Map */}
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
              <iframe
                title="Lakme Salon Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d248849.90089862!2d77.49085!3d12.954517!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1"
                width="100%" height="200" style={{ border: 0, display: 'block' }}
                allowFullScreen loading="lazy"
              />
            </div>
          </div>

          {/* ── Right — Form ── */}
          <div style={{
            background: 'white', borderRadius: 16,
            padding: '44px 40px',
            border: '1px solid var(--border-light)',
            boxShadow: '0 4px 40px rgba(0,0,0,0.07)',
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: 6 }}>
              Send Us a Message
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 32 }}>
              Fill in the form and we'll get back to you shortly
            </p>

            <form onSubmit={handleSubmit}>

              {/* Name + Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Full Name</label>
                  <input
                    className="form-input"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Phone Number</label>
                  <input
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              {/* Message */}
              <div style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Message</label>
                <textarea
                  className="form-input"
                  rows={5}
                  placeholder="Tell us what you need — services, bookings, feedback..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  style={{ resize: 'none' }}
                  required
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: 16, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid black', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Sending...
                  </>
                ) : (
                  <><Send size={14} /> Send Message</>
                )}
              </button>

            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>or reach us directly</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
            </div>

            {/* Direct contact row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <a
                href="mailto:hello@lakmesalon.com"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  background: 'var(--cream)',
                  color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
                  transition: 'border-color 0.2s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              >
                <Mail size={15} color="var(--gold)" /> Email Us
              </a>
              <a
                href="tel:+919876543210"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  background: 'var(--cream)',
                  color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
                  transition: 'border-color 0.2s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              >
                <Phone size={15} color="var(--gold)" /> Call Us
              </a>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}