import React, { useEffect, useState } from 'react';
import AIAssistantSection from '../components/AIAssistantSection';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Sparkles, Award, Clock, Phone, MapPin } from 'lucide-react';
import API from '../utils/api';

export default function Home({ onOpenChat }) {
  const [services, setServices] = useState([]);

  useEffect(() => {
    API.get('/services?popular=true').then(r => setServices(r.data.data?.slice(0, 6) || []));
  }, []);

  const stats = [
    { num: '15+', label: 'Years of Excellence' },
    { num: '50,000+', label: 'Happy Clients' },
    { num: '200+', label: 'Expert Stylists' },
    { num: '4.9★', label: 'Average Rating' },
  ];

  const categories = [
    { name: 'Hair', icon: '✂️', desc: 'Cuts, Color & Treatments',
      img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=85' },
    { name: 'Skin', icon: '✨', desc: 'Facials & Glow Treatments',
      img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=85' },
    { name: 'Bridal', icon: '👰', desc: 'Complete Bridal Packages',
      img: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=85' },
    { name: 'Nails', icon: '💅', desc: 'Manicure, Pedicure & Art',
      img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=85' },
    { name: 'Makeup', icon: '💄', desc: 'Party & Occasion Looks',
      img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=85' },
    { name: 'Spa', icon: '🌸', desc: 'Relaxation & Wellness',
      img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=85' },
  ];

  const testimonials = [
    { name: 'Priya Sharma', service: 'Bridal Package', rating: 5, text: 'My wedding day look was absolutely stunning. The team understood my vision perfectly and delivered beyond expectations.' },
    { name: 'Ananya Reddy', service: 'Hydrafacial', rating: 5, text: "The Korean Glass Skin treatment gave me the most radiant complexion I've ever had. I keep getting compliments!" },
    { name: 'Divya Menon', service: 'Balayage', rating: 5, text: 'The balayage looks so natural and beautiful. Exactly the sun-kissed look I wanted. Worth every penny!' },
  ];

  // ── Service card config: image URL + accent colors per category ──────────
  const serviceImageMap = {
    'Signature Haircut':               { img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', accent: '#8B5E3C' },
    'Hair Color (Global)':             { img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', accent: '#7B3F6E' },
    'Balayage & Highlights':           { img: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&q=80', accent: '#A0522D' },
    'Keratin Smoothening':             { img: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80', accent: '#5C6B4A' },
    'Hair Spa':                        { img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80', accent: '#4A7C6F' },
    'Nanoplastia':                     { img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80', accent: '#6B4A7C' },
    'Butterfly Haircut':               { img: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&q=80', accent: '#7C4A6B' },
    'Classic Facial':                  { img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', accent: '#8B7355' },
    'Hydrafacial':                     { img: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&q=80', accent: '#4A7C6B' },
    'Korean Glass Skin':               { img: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80', accent: '#6B8B7C' },
    'Anti-Aging Treatment':            { img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80', accent: '#7C6B4A' },
    'Tan Removal':                     { img: 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=400&q=80', accent: '#8B6B4A' },
    'Classic Manicure':                { img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', accent: '#C8003B' },
    'Gel Nail Extension':              { img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', accent: '#8B003B' },
    'Nail Art (10 nails)':             { img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', accent: '#6B003B' },
    'Pedicure Royale':                 { img: 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=400&q=80', accent: '#7C4A6B' },
    'Pre-Bridal Package':              { img: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80', accent: '#8B6B3C' },
    'Bridal Makeup':                   { img: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&q=80', accent: '#C9A84C' },
    'Mehendi Application':             { img: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80', accent: '#7C5C2A' },
    'Party Makeup':                    { img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80', accent: '#8B003B' },
    'Natural Look Makeup':             { img: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80', accent: '#6B4A3C' },
    'Full Body Massage':               { img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80', accent: '#4A7C6B' },
    'Body Polishing':                  { img: 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=400&q=80', accent: '#6B7C4A' },
    'Foot Reflexology':                { img: 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=400&q=80', accent: '#4A6B7C' },
  };

  const catFallback = {
    Hair:   { img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', accent: '#8B5E3C' },
    Skin:   { img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', accent: '#4A7C6B' },
    Nails:  { img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', accent: '#C8003B' },
    Bridal: { img: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80', accent: '#C9A84C' },
    Makeup: { img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80', accent: '#8B003B' },
    Spa:    { img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80', accent: '#4A7C6B' },
  };

  const getServiceMeta = (s) =>
    serviceImageMap[s.name] || catFallback[s.category] || catFallback.Hair;

  return (
    <div>
      {/* ── HERO (YOUR VERSION — UNTOUCHED) ─────────────────────────────── */}
      <section style={{
        minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center',
        backgroundImage: "url('/images/salon-image.png')",
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: `repeating-linear-gradient(45deg, var(--gold) 0, var(--gold) 1px, transparent 0, transparent 50%)`, backgroundSize: '30px 30px' }} />
        <div style={{ position: 'absolute', top: '20%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,0,59,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: 220, paddingBottom: 80 }}>
          <div style={{ maxWidth: 720 }}>
            <span style={{ fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 500 }}>✦ The Art of Beauty ✦</span>
            <h1 style={{ color: 'white', marginTop: 20, marginBottom: 24 }}>
              Where Beauty<br /><em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Becomes Art</em>
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', maxWidth: 540, lineHeight: 1.8, marginBottom: 48 }}>
              India's most trusted salon experience. Expert stylists, premium products, and personalized beauty rituals crafted just for you.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link to="/booking" className="btn-primary" style={{ fontSize: 12 }}>Book Appointment <ArrowRight size={14} /></Link>
              <Link to="/services" className="btn-outline" style={{ fontSize: 12, borderColor: 'rgba(201,168,76,0.5)', color: 'var(--gold)' }}>Explore Services</Link>
            </div>
            <div style={{ display: 'flex', gap: 32, marginTop: 60, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32, flexWrap: 'wrap' }}>
              {[{ icon: <Phone size={14} />, text: '+91 98765 43210' }, { icon: <MapPin size={14} />, text: 'Multiple Locations' }, { icon: <Clock size={14} />, text: '9 AM – 8 PM Daily' }].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                  <span style={{ color: 'var(--gold)' }}>{item.icon}</span>{item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{ width: 1, height: 60, background: 'linear-gradient(to bottom, transparent, var(--gold))', margin: '0 auto' }} />
        </div>
      </section>

      {/* ── MARQUEE TICKER (YOUR VERSION — UNTOUCHED) ───────────────────── */}
      <div style={{ background: 'var(--gold)', overflow: 'hidden', padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.1)', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <div className="marquee-track">
          {[...Array(2)].map((_, repeatIndex) => (
            <div key={repeatIndex} style={{ display: 'flex', alignItems: 'center', gap: 40, paddingRight: 40, whiteSpace: 'nowrap' }}>
              {['Hair Spa','Color','Waxing','Facial','Runway Rewards','Makeup','Nails','Bridal','Innovation'].map((item, i) => (
                <span key={i} style={{ fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', color: 'black' }}>{item} •</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES (YOUR VERSION — UNTOUCHED) ───────────────────────── */}
      <section className="section" style={{ background: 'var(--cream)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span className="section-label">Our Expertise</span>
            <h2>Beauty Services</h2>
            <div className="gold-line" />
            <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '16px auto', fontSize: 15 }}>
              From haircuts to bridal transformations — every service crafted with precision and artistry
            </p>
          </div>
          <div className="grid-3">
            {categories.map((cat, i) => (
              <Link to={`/services?category=${cat.name}`} key={i} style={{
                display: 'block', borderRadius: 14, overflow: 'hidden', position: 'relative',
                height: 320, transition: 'transform 0.4s, box-shadow 0.4s',
                boxShadow: '0 4px 24px rgba(0,0,0,0.13)'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 24px 60px rgba(0,0,0,0.28)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.13)'; }}>
                {/* Background image */}
                <img src={cat.img} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, transition: 'transform 0.6s' }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'} />
                {/* Dark gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.08) 100%)' }} />
                {/* Gold shimmer top border */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
                {/* Content */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 28px 24px', textAlign: 'left' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
                  <h3 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: 6, lineHeight: 1.1 }}>{cat.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5, marginBottom: 14, letterSpacing: 0.3 }}>{cat.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
                    Explore <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── POPULAR SERVICES — FIXED with real images ───────────────────── */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 60, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="section-label">Most Loved</span>
              <h2>Popular Services</h2>
              <div className="gold-line-left" />
            </div>
            <Link to="/services" style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid-3">
            {(services.length > 0 ? services : [
              { name: 'Signature Haircut',    category: 'Hair',   price: 599,   duration: 45,  description: 'Expert cut tailored to your face shape by our master stylists', popular: true },
              { name: 'Hydrafacial',          category: 'Skin',   price: 2999,  duration: 75,  description: 'Multi-step facial with cleansing, peeling, extraction & hydration', popular: true },
              { name: 'Balayage & Highlights',category: 'Hair',   price: 3499,  duration: 150, description: 'Natural sun-kissed highlights with hand-painting technique', popular: true },
              { name: 'Pre-Bridal Package',   category: 'Bridal', price: 15999, duration: 360, description: 'Complete 6-session bridal prep — facials, body polishing, hair', popular: true },
              { name: 'Gel Nail Extension',   category: 'Nails',  price: 1499,  duration: 90,  description: 'Beautiful gel extensions in your choice of design', popular: false },
              { name: 'Korean Glass Skin',    category: 'Skin',   price: 3499,  duration: 90,  description: 'Advanced Korean treatment for luminous, translucent skin', popular: true },
            ]).map((s, i) => {
              const meta = getServiceMeta(s);
              return (
                <div key={s._id || i} style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE6D6', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', transition: 'transform 0.3s, box-shadow 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-7px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(201,168,76,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)'; }}>

                  {/* ── Image area ── */}
                  <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                    <img
                      src={meta.img}
                      alt={s.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                      onMouseEnter={e => e.target.style.transform = 'scale(1.07)'}
                      onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                    {/* Fallback if image fails */}
                    <div style={{ display: 'none', height: '100%', background: `linear-gradient(135deg, ${meta.accent}22, ${meta.accent}44)`, alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                      {['✂️','✨','🎨','💅','👰','🌸'][i % 6]}
                    </div>
                    {/* Gradient overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)` }} />
                    {/* Category pill */}
                    <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: 'white', fontSize: 9, fontWeight: 600, letterSpacing: 2, padding: '4px 10px', borderRadius: 50, textTransform: 'uppercase' }}>
                      {s.category}
                    </span>
                    {/* Popular badge */}
                    {s.popular && (
                      <span style={{ position: 'absolute', top: 12, right: 12, background: 'var(--gold)', color: 'white', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: '4px 10px', borderRadius: 50, textTransform: 'uppercase' }}>
                        Popular
                      </span>
                    )}
                    {/* Duration on image */}
                    <span style={{ position: 'absolute', bottom: 10, right: 12, color: 'rgba(255,255,255,0.85)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {s.duration} min
                    </span>
                  </div>

                  {/* ── Card body ── */}
                  <div style={{ padding: '18px 20px 20px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#1A1A1A', marginBottom: 7, lineHeight: 1.3 }}>{s.name}</h3>
                    <p style={{ fontSize: 12.5, color: '#888', lineHeight: 1.65, marginBottom: 16 }}>{(s.description || '').slice(0, 72)}...</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F0EAE0', paddingTop: 14 }}>
                      <div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', color: 'var(--gold)', fontWeight: 600 }}>₹{(s.price || 0).toLocaleString()}</span>
                        <span style={{ fontSize: 11, color: '#AAAAAA', marginLeft: 3 }}>onwards</span>
                      </div>
                      <Link to={s._id ? `/booking?service=${s._id}` : '/booking'} style={{
                        fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'white',
                        background: `linear-gradient(135deg, ${meta.accent}, ${meta.accent}CC)`,
                        padding: '8px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, transition: 'opacity 0.2s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        Book <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI HAIRSTYLE BANNER — PREMIUM ───────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#080808', minHeight: 620, display: 'flex', alignItems: 'center' }}>
        {/* Full bleed bg texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(200,0,59,0.06) 0%, transparent 50%)', zIndex: 0 }} />

        {/* Animated gold lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, var(--gold) 40%, var(--gold) 60%, transparent 100%)', opacity: 0.6 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.4) 50%, transparent 100%)' }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 480px', gap: 80, alignItems: 'center' }}>

            {/* ── LEFT: text + stats ── */}
            <div>
              {/* Label */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 50, padding: '6px 16px', marginBottom: 28 }}>
                <Sparkles size={12} color="var(--gold)" />
                <span style={{ fontSize: 10, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600 }}>AI-Powered · Exclusive Feature</span>
              </div>

              <h2 style={{ color: 'white', lineHeight: 1.1, marginBottom: 24, fontSize: 'clamp(2.2rem, 4vw, 3.8rem)' }}>
                Discover Your<br />
                <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Signature</em> Look
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.9, marginBottom: 40, maxWidth: 440 }}>
                Our AI scans your face shape, hair texture, and lifestyle preferences — then recommends the most flattering styles, colors, and treatments tailored just for you.
              </p>

              <Link to="/hairstyle" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'linear-gradient(135deg, var(--gold) 0%, #A8843C 100%)',
                color: 'white', padding: '16px 40px', borderRadius: 4,
                fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase',
                boxShadow: '0 8px 32px rgba(201,168,76,0.35)', transition: 'all 0.3s'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(201,168,76,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,168,76,0.35)'; }}>
                <Sparkles size={14} /> Try AI Stylist — It's Free
              </Link>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 0, marginTop: 48, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 36 }}>
                {[
                  { num: '5K+', label: 'Styles Analyzed' },
                  { num: '95%', label: 'Match Accuracy' },
                  { num: '30s', label: 'Results In' },
                  { num: 'Free', label: 'Always' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none', padding: '0 16px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--gold)', lineHeight: 1 }}>{s.num}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: photo + floating feature pills ── */}
            <div style={{ position: 'relative' }}>
              {/* Main photo */}
              <div style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.2)' }}>
                <img src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=90" alt="AI Hairstyle" style={{ width: '100%', height: 480, objectFit: 'cover', display: 'block' }} />
                {/* Image overlay gradient */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.7) 0%, transparent 50%)' }} />
                {/* Bottom label on photo */}
                <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>✦ AI Analysis Active</div>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>Oval face · Wavy hair · Party occasion</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>→ Butterfly Cut recommended · 96% match</div>
                </div>
              </div>

              {/* Floating feature cards */}
              <div style={{ position: 'absolute', top: -20, right: -24, background: 'rgba(201,168,76,0.15)', backdropFilter: 'blur(16px)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 12, padding: '14px 18px', minWidth: 150 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🔬</div>
                <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>Face Analysis</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>Shape detection AI</div>
              </div>

              <div style={{ position: 'absolute', top: '38%', left: -28, background: 'rgba(155,89,182,0.2)', backdropFilter: 'blur(16px)', border: '1px solid rgba(155,89,182,0.4)', borderRadius: 12, padding: '14px 18px', minWidth: 150 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>💎</div>
                <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>Style Match</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>Curated for you</div>
              </div>

              <div style={{ position: 'absolute', bottom: 100, right: -24, background: 'rgba(39,174,96,0.15)', backdropFilter: 'blur(16px)', border: '1px solid rgba(39,174,96,0.35)', borderRadius: 12, padding: '14px 18px', minWidth: 150 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🎨</div>
                <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>Color Advice</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>Skin-tone matched</div>
              </div>
            </div>

          </div>
        </div>

        <style>{`
          @media(max-width:900px){
            .ai-grid{grid-template-columns:1fr!important}
            .ai-photo{display:none!important}
          }
        `}</style>
      </section>

      {/* ── TESTIMONIALS (YOUR VERSION — UNTOUCHED) ─────────────────────── */}
      <section className="section" style={{ background: 'var(--cream)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span className="section-label">Client Love</span>
            <h2>What They Say</h2>
            <div className="gold-line" />
          </div>
          <div className="grid-3">
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, padding: '32px', border: '1px solid var(--border-light)', position: 'relative', transition: 'transform 0.3s, box-shadow 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-gold)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: 32, color: 'var(--gold)', fontFamily: 'Georgia', marginBottom: 16, opacity: 0.4 }}>"</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>{t.text}</p>
                <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                  {[...Array(t.rating)].map((_, i) => <Star key={i} size={14} fill="var(--gold)" color="var(--gold)" />)}
                </div>
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: 1 }}>{t.service}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── AI ASSISTANT SECTION ── */}
<AIAssistantSection onOpenChat={onOpenChat} />

      {/* ── CTA (YOUR VERSION — UNTOUCHED) ──────────────────────────────── */}
      <section style={{ background: 'var(--black)', padding: '80px 0', textAlign: 'center' }}>
        <div className="container">
          <Award size={40} color="var(--gold)" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ color: 'white', marginBottom: 16 }}>Ready for Your <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Transformation?</em></h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, marginBottom: 40, maxWidth: 440, margin: '0 auto 40px' }}>
            Book your appointment today and experience the Lakmé difference
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/booking" className="btn-primary">Book Now <ArrowRight size={14} /></Link>
            <Link to="/contact" className="btn-outline" style={{ borderColor: 'rgba(201,168,76,0.4)' }}>Contact Us</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER (YOUR VERSION — UNTOUCHED) ───────────────────────────── */}
      <footer style={{ background: '#060606', padding: '60px 0 30px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'white', letterSpacing: 3, marginBottom: 4 }}>LAKMÉ</div>
              <div style={{ fontSize: 9, letterSpacing: 5, color: 'var(--gold)', marginBottom: 20 }}>SALON</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.8, maxWidth: 260 }}>India's most trusted beauty salon — where every visit is a luxurious experience.</p>
            </div>
            {[
              { title: 'Services', links: ['Hair', 'Skin', 'Nails', 'Bridal', 'Makeup', 'Spa'] },
              { title: 'Quick Links', links: ['Home', 'Services', 'Book Now', 'AI Stylist', 'Contact'] },
              { title: 'Connect', links: ['+91 98765 43210', 'hello@lakmesalon.com', 'WhatsApp Us', 'Instagram', 'Facebook'] },
            ].map((col, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 20 }}>{col.title}</div>
                {col.links.map((l, j) => {
  // Route map for Quick Links and Services
  const routeMap = {
    'Home': '/', 'Services': '/services', 'Book Now': '/booking',
    'AI Stylist': '/hairstyle', 'Contact': '/contact',
    'Hair': '/services', 'Skin': '/services', 'Nails': '/services',
    'Bridal': '/services', 'Makeup': '/services', 'Spa': '/services',
  };
  const href = routeMap[l];
  const isExternal = l === 'Instagram' || l === 'Facebook' || l === 'WhatsApp Us';
  const isPhone = l.startsWith('+91');
  const isEmail = l.includes('@');

  const sharedStyle = {
    color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 10,
    cursor: 'pointer', transition: 'color 0.2s', display: 'block',
    textDecoration: 'none',
  };

  if (isPhone) return (
    <a key={j} href={`tel:${l.replace(/\s/g,'')}`} style={sharedStyle}
      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</a>
  );
  if (isEmail) return (
    <a key={j} href={`mailto:${l}`} style={sharedStyle}
      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</a>
  );
  if (l === 'WhatsApp Us') return (
    <a key={j} href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={sharedStyle}
      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</a>
  );
  if (l === 'Instagram') return (
    <a key={j} href="https://instagram.com" target="_blank" rel="noreferrer" style={sharedStyle}
      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</a>
  );
  if (l === 'Facebook') return (
    <a key={j} href="https://facebook.com" target="_blank" rel="noreferrer" style={sharedStyle}
      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</a>
  );
  if (href) return (
    <Link key={j} to={href} style={sharedStyle}
      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</Link>
  );
  return (
    <div key={j} style={sharedStyle}
      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</div>
  );
})}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>© 2024 Lakmé Salon. All rights reserved.</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Privacy Policy · Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}