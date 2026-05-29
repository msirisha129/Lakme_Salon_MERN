import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const FACE_SHAPES = [
  { value: 'oval',    label: 'Oval',    desc: 'Balanced, slightly wider at cheeks', emoji: '🥚' },
  { value: 'round',   label: 'Round',   desc: 'Equal width and length, soft curves', emoji: '⭕' },
  { value: 'square',  label: 'Square',  desc: 'Strong jawline, equal width', emoji: '⬜' },
  { value: 'heart',   label: 'Heart',   desc: 'Wider forehead, pointed chin', emoji: '💙' },
  { value: 'diamond', label: 'Diamond', desc: 'Narrow forehead and jaw, wide cheeks', emoji: '💎' },
];
const HAIR_TYPES = ['Straight', 'Wavy', 'Curly', 'Coily'];
const LENGTHS    = ['Short (above ears)', 'Medium (chin to shoulder)', 'Long (below shoulder)'];
const OCCASIONS  = ['Everyday', 'Work', 'Party', 'Bridal'];

// ── Fallback recommendations when API is unavailable ──────────────
const FALLBACK = {
  oval: {
    Straight: 'Sleek blunt bob, face-framing layers, curtain bangs — oval face suits almost every style!',
    Wavy:     'Beachy waves with long layers, lob cut, or tousled textured shag work beautifully.',
    Curly:    'Defined curls with long layers, curly shag, or voluminous mid-length cut.',
    Coily:    'Tapered natural, voluminous afro, or coily lob — your face shape is very versatile!',
  },
  round: {
    Straight: 'Long layers, side-swept bangs, and straight blow-outs elongate your face beautifully.',
    Wavy:     'Long wavy layers, deep side part, and high volume on top help define your face.',
    Curly:    'Long curly layers, pineapple updo, or high curly ponytail to add length.',
    Coily:    'High puff, elongated twist-out, or tapered sides with height on top.',
  },
  square: {
    Straight: 'Soft layers, side-swept bangs, and wispy ends soften your strong jawline.',
    Wavy:     'Beachy waves with side part, long soft layers, or wavy lob.',
    Curly:    'Curly shag, wispy curly layers, or a mid-length curly cut with movement.',
    Coily:    'Soft coily layers, side-parted natural, or elongated coily lob.',
  },
  heart: {
    Straight: 'Side-swept bangs, chin-length bob, or layers that add width at the jaw.',
    Wavy:     'Wavy lob, soft waves from chin down, or gentle S-wave with side part.',
    Curly:    'Curly bob at chin, defined curls with low volume on top, layered curly lob.',
    Coily:    'Chin-length TWA, coily lob, or twist-out that adds volume at the jaw.',
  },
  diamond: {
    Straight: 'Chin-length bob, side bangs, or layers that add volume at forehead and jaw.',
    Wavy:     'Wavy shag, wispy fringe, or wavy lob with soft movement.',
    Curly:    'Curly fringe, curly lob, or layers that soften the cheekbones.',
    Coily:    'Coily fringe, soft natural with volume at top and bottom, coily shag.',
  },
};

function getFallbackResult(form) {
  const shapeRec = FALLBACK[form.faceShape] || FALLBACK.oval;
  const textureRec = shapeRec[form.hairType] || shapeRec.Straight;
  const lengthNote = form.length.includes('Short')
    ? 'Short styles will look ultra chic and low-maintenance.'
    : form.length.includes('Medium')
    ? 'Medium lengths are the most versatile — easy to style up or down.'
    : 'Long hair gives you endless styling options and a glamorous finish.';
  const occasionNote = {
    Everyday: 'For everyday wear, focus on easy-maintenance cuts that air-dry beautifully.',
    Work:     'For work, polished blowouts and sleek styles convey professionalism.',
    Party:    'For parties, voluminous curls, sleek updos, or glossy blowouts steal the show.',
    Bridal:   'For bridal, consider a romantic updo, soft waves, or a half-up half-down look.',
  }[form.occasion] || '';

  return `✨ YOUR PERSONALIZED HAIRSTYLE RECOMMENDATIONS

Based on your ${form.faceShape.toUpperCase()} face shape with ${form.hairType.toUpperCase()} hair:

💇 BEST STYLES FOR YOU
${textureRec}

📏 LENGTH ADVICE
${lengthNote}

🌟 OCCASION: ${form.occasion.toUpperCase()}
${occasionNote}

🏆 TOP 3 LAKME SALON SERVICES WE RECOMMEND:
1. Signature Haircut & Styling — crafted to your face shape by expert stylists
2. ${form.hairType === 'Curly' || form.hairType === 'Coily' ? 'Curl Defining Treatment' : 'Balayage & Highlights'} — enhance your natural texture
3. Hair Spa — deep conditioning for healthy, lustrous hair

💛 PRO TIP FROM OUR STYLISTS
Always ask for a face-shape consultation before your cut. Our Lakmē experts will map out the perfect cut lines for your unique features.

Book your appointment today and let our stylists bring this look to life! 🌸`;
}

export default function Hairstyle() {
  const [form, setForm]       = useState({ faceShape: '', hairType: '', length: '', occasion: '' });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState(1);

  const handleSubmit = async () => {
    if (!form.faceShape || !form.hairType || !form.length || !form.occasion) {
      toast.error('Please answer all 4 questions!');
      return;
    }
    setLoading(true);
    try {
      const resp = await API.post('/ai/hairstyle-recommend', form);
      console.log('Hairstyle API raw response:', resp);

      // Handle every possible response shape from axios or fetch
      const payload = resp?.data ?? resp;

      let rec =
        payload?.data?.recommendations ??
        payload?.recommendations ??
        payload?.data?.result ??
        payload?.result ??
        payload?.data?.message ??
        payload?.message ??
        payload?.data?.text ??
        payload?.text ??
        null;

      // If object returned, stringify
      if (rec && typeof rec === 'object') rec = JSON.stringify(rec, null, 2);

      // Use fallback if nothing useful came back
      if (!rec || rec.trim().length < 10) rec = getFallbackResult(form);

      setResult(String(rec));
      setStep(2);
    } catch (err) {
      console.error('Hairstyle API error:', err);
      // Don't show error toast — just show smart fallback
      setResult(getFallbackResult(form));
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({ faceShape: '', hairType: '', length: '', occasion: '' });
    setResult(null);
    setStep(1);
  };

  const allAnswered = form.faceShape && form.hairType && form.length && form.occasion;
const allServices = [
  {
    name: 'Butterfly Haircut',
    category: 'Cut',
    price: '₹799',
    hairTypes: ['Wavy', 'Straight'],
    faceShapes: ['round', 'oval', 'heart'],
    occasions: ['Party', 'Work', 'Everyday'],
    lengths: ['Medium (chin to shoulder)', 'Long (below shoulder)'],
    description: 'Soft layered cut that adds beautiful movement and frames your face.',
  },
  {
    name: 'Curl Defining Treatment',
    category: 'Treatment',
    price: '₹1299',
    hairTypes: ['Curly', 'Coily'],
    faceShapes: ['square', 'oval', 'diamond'],
    occasions: ['Party', 'Everyday', 'Work'],
    lengths: ['Short (above ears)', 'Medium (chin to shoulder)', 'Long (below shoulder)'],
    description: 'Defines curls while reducing dryness and frizz for a bouncy finish.',
  },
  {
    name: 'Hair Spa',
    category: 'Care',
    price: '₹1499',
    hairTypes: ['Curly', 'Wavy', 'Straight', 'Coily'],
    faceShapes: ['round', 'square', 'oval', 'heart', 'diamond'],
    occasions: ['Everyday', 'Work'],
    lengths: ['Short (above ears)', 'Medium (chin to shoulder)', 'Long (below shoulder)'],
    description: 'Deep nourishment and glossy salon finish for all hair types.',
  },
  {
    name: 'Bridal Styling',
    category: 'Bridal',
    price: '₹4999',
    hairTypes: ['Curly', 'Wavy', 'Straight', 'Coily'],
    faceShapes: ['round', 'square', 'oval', 'heart', 'diamond'],
    occasions: ['Bridal'],
    lengths: ['Medium (chin to shoulder)', 'Long (below shoulder)'],
    description: 'Elegant premium styling for your most special occasion.',
  },
  {
    name: 'Sleek Blowout',
    category: 'Styling',
    price: '₹999',
    hairTypes: ['Straight', 'Wavy'],
    faceShapes: ['oval', 'heart', 'diamond'],
    occasions: ['Work', 'Party'],
    lengths: ['Medium (chin to shoulder)', 'Long (below shoulder)'],
    description: 'Polished, frizz-free blowout for a professional and refined look.',
  },
  {
    name: 'Balayage & Highlights',
    category: 'Colour',
    price: '₹2999',
    hairTypes: ['Straight', 'Wavy'],
    faceShapes: ['oval', 'heart', 'round'],
    occasions: ['Party', 'Everyday'],
    lengths: ['Medium (chin to shoulder)', 'Long (below shoulder)'],
    description: 'Sun-kissed dimension and depth with natural-looking colour.',
  },
  {
    name: 'Scalp Treatment',
    category: 'Care',
    price: '₹1199',
    hairTypes: ['Coily', 'Curly', 'Straight'],
    faceShapes: ['round', 'square', 'oval', 'heart', 'diamond'],
    occasions: ['Everyday', 'Work'],
    lengths: ['Short (above ears)', 'Medium (chin to shoulder)'],
    description: 'Nourishes roots and promotes healthy hair growth.',
  },
  {
    name: 'Party Updo',
    category: 'Styling',
    price: '₹1799',
    hairTypes: ['Curly', 'Wavy', 'Straight'],
    faceShapes: ['round', 'oval', 'square', 'heart', 'diamond'],
    occasions: ['Party'],
    lengths: ['Medium (chin to shoulder)', 'Long (below shoulder)'],
    description: 'Glamorous updo styled to turn heads at any event.',
  },
  {
    name: 'Keratin Smoothing',
    category: 'Treatment',
    price: '₹3499',
    hairTypes: ['Curly', 'Coily', 'Wavy'],
    faceShapes: ['oval', 'heart', 'diamond'],
    occasions: ['Work', 'Everyday'],
    lengths: ['Medium (chin to shoulder)', 'Long (below shoulder)'],
    description: 'Long-lasting frizz control and silky smooth finish.',
  },
  {
    name: 'Bob Haircut',
    category: 'Cut',
    price: '₹699',
    hairTypes: ['Straight', 'Wavy'],
    faceShapes: ['heart', 'diamond', 'oval'],
    occasions: ['Work', 'Everyday'],
    lengths: ['Short (above ears)', 'Medium (chin to shoulder)'],
    description: 'Classic sharp bob that adds structure and sophistication.',
  },
];

const recommendedServices = allServices
  .map(service => {
    let match = 0;
    let reasons = 0;

    // Occasion is the HIGHEST priority — wrong occasion = penalise heavily
    if (service.occasions.includes(form.occasion)) {
      match += 50;
      reasons++;
    } else {
      match -= 60; // hard penalty — wrong occasion kills the recommendation
    }

    if (service.hairTypes.includes(form.hairType)) {
      match += 30;
      reasons++;
    }

    if (service.faceShapes.includes(form.faceShape)) {
      match += 15;
      reasons++;
    }

    if (service.lengths.includes(form.length)) {
      match += 5;
      reasons++;
    }

    // Normalize to 0-100
    const maxPossible = 100;
    const normalized = Math.min(100, Math.max(0, Math.round((match / maxPossible) * 100)));

    return { ...service, match: normalized, reasons };
  })
  .filter(s => s.match >= 40) // only show genuinely relevant services
  .sort((a, b) => b.match - a.match)
  .slice(0, 3);
  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--cream)' }}>

      {/* ── Hero ── */}
      <div style={{
        backgroundImage: `linear-gradient(to bottom, rgba(5,2,10,0.45) 0%, rgba(5,2,10,0.75) 60%, rgba(5,2,10,0.97) 100%), url('https://images.unsplash.com/photo-1560869713-bf165a9cfac1?w=1600&q=90')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 25%',
        backgroundAttachment: 'fixed',
        padding: '130px 0 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(201,168,76,0.13) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Sparkles size={36} color="var(--gold)" style={{ margin: '0 auto 20px' }} />
          <span className="section-label" style={{ letterSpacing: 6, fontSize: 11 }}>AI-Powered</span>
          <h1 style={{ color: 'white', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', marginBottom: 20, fontWeight: 300, letterSpacing: -1 }}>
            AI Hairstyle Advisor
          </h1>
          <div className="gold-line" />
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 20, fontSize: 16, maxWidth: 500, margin: '20px auto 0', lineHeight: 1.8 }}>
            Answer 4 quick questions and get personalized hairstyle recommendations matched to your face shape
          </p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container" style={{ maxWidth: 1200, padding: '48px 24px', background: 'var(--cream)' }}>

        {/* ── STEP 1: Questions ── */}
        {step === 1 && (
          <div>

            {/* Progress */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
              {['Face Shape', 'Hair Type', 'Length', 'Occasion'].map((label, i) => {
                const vals = [form.faceShape, form.hairType, form.length, form.occasion];
                const done = !!vals[i];
                return (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ height: 3, borderRadius: 2, background: done ? 'var(--gold)' : '#DDD4C4', marginBottom: 6, transition: 'background 0.3s' }} />
                    <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: done ? 'var(--gold)' : '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {done && <CheckCircle size={10} />} {label}
                    </div>
                  </div>

                );
                
              })}
            </div>

            {/* Q1 — Face Shape */}
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 6, color: 'var(--black)' }}>
                What's your face shape?
              </h3>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
                Not sure? Look in a mirror and trace your face outline
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {FACE_SHAPES.map(fs => (
                  <div
                    key={fs.value}
                    onClick={() => setForm(f => ({ ...f, faceShape: fs.value }))}
                    style={{
                      background: form.faceShape === fs.value ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))' : '#F8F1E5',
                      border: `2px solid ${form.faceShape === fs.value ? 'var(--gold)' : '#D9CAB8'}`,
                      borderRadius: 14, padding: '24px 16px', textAlign: 'center',
                      cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: form.faceShape === fs.value ? '0 8px 24px rgba(201,168,76,0.25)' : '0 4px 12px rgba(0,0,0,0.08)',
                      transform: form.faceShape === fs.value ? 'translateY(-2px)' : 'translateY(0)',
                    }}
                    onMouseEnter={(e) => {
                      if (form.faceShape !== fs.value) {
                        e.currentTarget.style.background = '#F5E9DC';
                        e.currentTarget.style.borderColor = '#C9B299';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (form.faceShape !== fs.value) {
                        e.currentTarget.style.background = '#F8F1E5';
                        e.currentTarget.style.borderColor = '#D9CAB8';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      }
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{fs.emoji}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: form.faceShape === fs.value ? 'white' : '#1F1F1F', marginBottom: 6 }}>{fs.label}</div>
                    <div style={{ fontSize: 11, color: form.faceShape === fs.value ? 'rgba(255,255,255,0.9)' : '#6F6F6F', lineHeight: 1.5 }}>{fs.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Q2 — Hair Type */}
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 20, color: 'var(--black)' }}>
                Your hair texture?
              </h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {HAIR_TYPES.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, hairType: t }))} style={{
                    padding: '14px 32px', borderRadius: 50, fontSize: 13, cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: form.hairType === t ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))' : '#F8F1E5',
                    border: `1px solid ${form.hairType === t ? 'rgba(255,215,130,0.9)' : '#D9CAB8'}`,
                    color: form.hairType === t ? 'white' : '#1F1F1F',
                    boxShadow: form.hairType === t ? '0 8px 24px rgba(201,168,76,0.24)' : '0 4px 12px rgba(0,0,0,0.12)',
                    fontWeight: form.hairType === t ? 700 : 600,
                    transform: form.hairType === t ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (form.hairType !== t) {
                      e.target.style.background = '#F5E9DC';
                      e.target.style.borderColor = '#C9B299';
                      e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (form.hairType !== t) {
                      e.target.style.background = '#F8F1E5';
                      e.target.style.borderColor = '#D9CAB8';
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                    }
                  }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Q3 — Length */}
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 20, color: 'var(--black)' }}>
                Desired length?
              </h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {LENGTHS.map(l => (
                  <button key={l} onClick={() => setForm(f => ({ ...f, length: l }))} style={{
                    padding: '14px 28px', borderRadius: 50, fontSize: 13, cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: form.length === l ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))' : '#F8F1E5',
                    border: `1px solid ${form.length === l ? 'rgba(255,215,130,0.9)' : '#D9CAB8'}`,
                    color: form.length === l ? 'white' : '#1F1F1F',
                    boxShadow: form.length === l ? '0 8px 24px rgba(201,168,76,0.24)' : '0 4px 12px rgba(0,0,0,0.12)',
                    fontWeight: form.length === l ? 700 : 600,
                    transform: form.length === l ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (form.length !== l) {
                      e.target.style.background = '#F5E9DC';
                      e.target.style.borderColor = '#C9B299';
                      e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (form.length !== l) {
                      e.target.style.background = '#F8F1E5';
                      e.target.style.borderColor = '#D9CAB8';
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                    }
                  }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Q4 — Occasion */}
            <div style={{ marginBottom: 48 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 20, color: 'var(--black)' }}>
                What's the occasion?
              </h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {OCCASIONS.map(o => (
                  <button key={o} onClick={() => setForm(f => ({ ...f, occasion: o }))} style={{
                    padding: '14px 32px', borderRadius: 50, fontSize: 13, cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: form.occasion === o ? 'linear-gradient(135deg, var(--rose), #8B0028)' : '#F8F1E5',
                    border: `1px solid ${form.occasion === o ? 'rgba(255,145,160,0.9)' : '#D9CAB8'}`,
                    color: form.occasion === o ? 'white' : '#1F1F1F',
                    boxShadow: form.occasion === o ? '0 8px 24px rgba(180,0,60,0.22)' : '0 4px 12px rgba(0,0,0,0.12)',
                    fontWeight: form.occasion === o ? 700 : 600,
                    transform: form.occasion === o ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (form.occasion !== o) {
                      e.target.style.background = '#F5E9DC';
                      e.target.style.borderColor = '#C9B299';
                      e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (form.occasion !== o) {
                      e.target.style.background = '#F8F1E5';
                      e.target.style.borderColor = '#D9CAB8';
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                    }
                  }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: 18, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: !allAnswered ? 0.5 : 1 }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid black', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Analyzing your profile...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Get My Hairstyle Recommendations
                </>
              )}
            </button>

            {!allAnswered && (
              <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 12 }}>
                Please answer all 4 questions above to continue
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: Results ── */}
        {step === 2 && result && (
          <div style={{ padding: '40px 0' }}>

            {/* Result Header */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{
                width: 70, height: 70, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
                margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={30} color="white" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', marginBottom: 10, color: 'var(--black)' }}>
                Your Perfect Styles
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
                Based on your <strong>{form.faceShape}</strong> face shape &amp; <strong>{form.hairType}</strong> hair
              </p>
            </div>

            {/* Summary Pills */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
              {[
                { label: 'Face Shape', value: form.faceShape },
                { label: 'Hair Type', value: form.hairType },
                { label: 'Length', value: form.length.split(' ')[0] },
                { label: 'Occasion', value: form.occasion },
              ].map(p => (
                <div key={p.label} style={{
                  background: 'white', border: '1px solid var(--border-light)',
                  borderRadius: 50, padding: '6px 16px', fontSize: 12,
                  color: 'var(--text-secondary)',
                }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{p.label}: </span>
                  {p.value}
                </div>
              ))}
            </div>

            {/* Result Box */}
            <div
  style={{
    background: 'linear-gradient(135deg, #0A0A0A, #1A0A14)',
    borderRadius: 16,
    padding: '32px',
    marginBottom: 40,
    color: 'white',
    border: '1px solid rgba(201,168,76,0.2)'
  }}
>
 <div
  style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 24
}}
>
  {recommendedServices.map((service, i) => (
    <div
      key={i}
      style={{
        background: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
      }}
    >
      <div
        style={{
          background:
            'linear-gradient(135deg,#1A0A14,#2A2A2A)',
          padding: 30,
          color: 'white'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18
          }}
        >
          <span
            style={{
              background: 'var(--gold)',
              padding: '6px 14px',
              borderRadius: 50,
              fontSize: 12,
              fontWeight: 700
            }}
          >
            ✨ {service.match}% Match
          </span>

          <span
            style={{
              opacity: 0.7,
              fontSize: 13
            }}
          >
            {service.category}
          </span>
        </div>

        <h3
          style={{
            fontSize: 30,
            marginBottom: 12,
            fontFamily: 'var(--font-display)'
          }}
        >
          {service.name}
        </h3>

        <p
          style={{
            opacity: 0.85,
            lineHeight: 1.8
          }}
        >
          {service.description}
        </p>
      </div>

      <div
        style={{
          padding: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            fontSize: 30,
            color: 'var(--gold)',
            fontFamily: 'var(--font-display)'
          }}
        >
          {service.price}
        </div>

        <Link
          to="/booking"
          className="btn-primary"
        >
          Book Now →
        </Link>
      </div>
    </div>
  ))}
</div>

  <div
    style={{
      display: 'grid',
      gap: 20
    }}
  >
  {typeof result !== 'string' &&
  result.styles?.map((style, i) => (
      <div
        key={i}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(201,168,76,0.15)',
          padding: 24,
          borderRadius: 18
        }}
      >
        <h3
          style={{
            color: 'white',
            marginBottom: 10,
            fontSize: 20
          }}
        >
          ✨ {style.name}
        </h3>

        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.7,
            fontSize: 14
          }}
        >
          {style.description}
        </p>
      </div>
    ))}
  </div>

  <div style={{ marginTop: 40 }}>
    <h3
      style={{
        color: 'var(--gold)',
        marginBottom: 16
      }}
    >
      Recommended Lakmé Services
    </h3>

    <div
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }}
    >
      {result.services?.map((service, i) => (
        <div
          key={i}
          style={{
            padding: '10px 18px',
            borderRadius: 50,
            background: 'rgba(201,168,76,0.12)',
            border: '1px solid rgba(201,168,76,0.25)',
            color: 'white',
            fontSize: 13
          }}
        >
          {service}
        </div>
      ))}
    </div>
  </div>
</div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={reset} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={14} /> Try Again
              </button>
              <Link to="/booking" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Book A Service <ArrowRight size={14} />
              </Link>
            </div>

          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}