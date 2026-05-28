import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Calendar, Clock, Check, ArrowRight, ChevronLeft } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    serviceId: searchParams.get('service') || '',
    date: '', timeSlot: '', stylist: '', notes: ''
  });
  const [selectedService, setSelectedService] = useState(null);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    API.get('/services').then(r => {
      setServices(r.data.data || []);
      if (form.serviceId) {
        const s = r.data.data?.find(s => s._id === form.serviceId);
        setSelectedService(s);
      }
    });
  }, [form.serviceId]);

  useEffect(() => {
    if (form.date) {
      API.get(`/bookings/slots?date=${form.date}`).then(r => setSlots(r.data.data || []));
    }
  }, [form.date]);

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];

  const handleService = (id) => {
    const s = services.find(s => s._id === id);
    setForm(f => ({ ...f, serviceId: id }));
    setSelectedService(s);
  };

  const handleSubmit = async () => {
    if (!user) { navigate('/login?redirect=/booking'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/bookings', form);
      setBooking(data.data);
      setStep(4);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const catEmojis = { Hair: '✂️', Skin: '✨', Nails: '💅', Bridal: '👰', Makeup: '💄', Spa: '🌸' };
  const CATEGORIES = ['Hair', 'Skin', 'Nails', 'Bridal', 'Makeup', 'Spa'];

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--cream)' }}>
      <div style={{
  backgroundImage: `linear-gradient(to bottom, rgba(5,2,10,0.55) 0%, rgba(5,2,10,0.80) 60%, rgba(5,2,10,0.98) 100%), url('https://images.unsplash.com/photo-1560869713-bf165a9cfac1?w=1600&q=90')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center 30%',
  padding: '100px 0 70px',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden'
}}>
  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(201,168,76,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
 <div style={{ position: 'relative', zIndex: 1 }}></div>
  <h1 style={{ color: 'white', fontSize: 'clamp(1.8rem, 4vw, 3rem)', marginBottom: 16, textAlign: 'center' }}>Book Appointment</h1>
<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 0, marginTop: 28 }}>
  {['Select Service', 'Choose Date & Time', 'Confirm', 'Done'].map((s, i) => (
    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: step > i + 1 ? 'var(--gold)' : step === i + 1 ? 'var(--rose)' : 'rgba(255,255,255,0.1)',
          fontSize: 12, fontWeight: 600, color: 'white', flexShrink: 0
        }}>{step > i + 1 ? <Check size={12} /> : i + 1}</div>
        <span style={{ fontSize: 11, color: step === i + 1 ? 'white' : 'rgba(255,255,255,0.4)', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{s}</span>
      </div>
      {i < 3 && <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.25)', marginBottom: 18 }} />}
    </div>
  ))}
</div>
      </div>

      <div className="container" style={{ maxWidth: 860, padding: '40px 24px' }}>

        {/* STEP 1 — Service */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Choose a Service</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Select the service you'd like to book</p>
            {CATEGORIES.map(cat => {
              const catServices = services.filter(s => s.category === cat);
              if (!catServices.length) return null;
              return (
                <div key={cat} style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>{catEmojis[cat]}</span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{cat}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {catServices.map(s => (
                      <div key={s._id} onClick={() => { handleService(s._id); setStep(2); }} style={{
                        background: form.serviceId === s._id ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))' : 'white',
                        border: `1px solid ${form.serviceId === s._id ? 'var(--gold)' : 'var(--border-light)'}`,
                        borderRadius: 8, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.25s',
                        boxShadow: form.serviceId === s._id ? 'var(--shadow-gold)' : 'none'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{ fontWeight: 500, fontSize: 14, color: form.serviceId === s._id ? 'white' : 'var(--text-primary)' }}>{s.name}</span>
                          {s.popular && <span style={{ fontSize: 9, background: form.serviceId === s._id ? 'rgba(255,255,255,0.2)' : 'rgba(201,168,76,0.15)', color: form.serviceId === s._id ? 'white' : 'var(--gold-dark)', padding: '2px 6px', borderRadius: 50, letterSpacing: 1 }}>HOT</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: form.serviceId === s._id ? 'rgba(255,255,255,0.9)' : 'var(--gold)', fontWeight: 600 }}>₹{s.price?.toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: form.serviceId === s._id ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>{s.duration} min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 2 — Date & Time */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontSize: 13, marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer' }}>
              <ChevronLeft size={16} /> Back to Services
            </button>
            {selectedService && (
              <div style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', borderRadius: 8, padding: '20px 24px', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.7)' }}>SELECTED SERVICE</div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 16, marginTop: 4 }}>{selectedService.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'white' }}>₹{selectedService.price?.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{selectedService.duration} minutes</div>
                </div>
              </div>
            )}
            <div className="grid-2">
              <div>
                <label className="form-label"><Calendar size={12} style={{ display: 'inline', marginRight: 6 }} />Select Date</label>
                <input type="date" className="form-input" min={today} max={maxDate} value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value, timeSlot: '' }))} />
              </div>
              <div>
                <label className="form-label">Preferred Stylist (Optional)</label>
                <select className="form-input" value={form.stylist} onChange={e => setForm(f => ({ ...f, stylist: e.target.value }))}>
                  <option value="">Any Available Stylist</option>
                  {['Priya S.', 'Anjali M.', 'Kavya R.', 'Deepa K.', 'Sneha P.'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {form.date && (
              <div style={{ marginTop: 24 }}>
                <label className="form-label"><Clock size={12} style={{ display: 'inline', marginRight: 6 }} />Available Time Slots</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {slots.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No slots available for this date. Please choose another date.</p>
                  ) : slots.map(slot => (
                    <button key={slot} onClick={() => setForm(f => ({ ...f, timeSlot: slot }))} style={{
                      padding: '10px 18px', fontSize: 13, borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s',
                      background: form.timeSlot === slot ? 'var(--gold)' : 'white',
                      color: form.timeSlot === slot ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${form.timeSlot === slot ? 'var(--gold)' : 'var(--border-light)'}`,
                      fontWeight: form.timeSlot === slot ? 600 : 400
                    }}>{slot}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <label className="form-label">Special Notes (Optional)</label>
              <textarea className="form-input" rows={3} placeholder="Any special requests or preferences..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>

            <button onClick={() => setStep(3)} disabled={!form.date || !form.timeSlot} className="btn-primary" style={{
              marginTop: 24, opacity: !form.date || !form.timeSlot ? 0.5 : 1
            }}>
              Continue to Review <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* STEP 3 — Confirm */}
        {step === 3 && (
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Review & Confirm</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Please review your booking details before confirming</p>

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ background: 'linear-gradient(135deg, #0A0A0A, #1A0A14)', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{catEmojis[selectedService?.category]}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'white' }}>{selectedService?.name}</div>
              </div>
              <div style={{ padding: '24px' }}>
                {[
                  ['Date', new Date(form.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                  ['Time', form.timeSlot],
                  ['Stylist', form.stylist || 'Any Available'],
                  ['Duration', `${selectedService?.duration} minutes`],
                  ['Amount', `₹${selectedService?.price?.toLocaleString()}`],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontWeight: 500, color: label === 'Amount' ? 'var(--gold)' : 'var(--text-primary)', fontFamily: label === 'Amount' ? 'var(--font-display)' : 'inherit', fontSize: label === 'Amount' ? '1.2rem' : 'inherit' }}>{val}</span>
                  </div>
                ))}
                {form.notes && (
                  <div style={{ marginTop: 16, padding: '12px', background: 'var(--cream)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Notes:</strong> {form.notes}
                  </div>
                )}
              </div>
            </div>

            {!user && (
              <div style={{ background: 'rgba(200,0,59,0.08)', border: '1px solid rgba(200,0,59,0.2)', borderRadius: 8, padding: '16px', marginBottom: 20, fontSize: 13, color: 'var(--rose)', textAlign: 'center' }}>
                Please <Link to="/login?redirect=/booking" style={{ color: 'var(--rose)', fontWeight: 600, textDecoration: 'underline' }}>sign in</Link> to complete your booking
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(2)} className="btn-outline" style={{ flex: 1 }}>Edit</button>
              <button onClick={handleSubmit} disabled={loading || !user} className="btn-primary" style={{ flex: 2, opacity: loading || !user ? 0.6 : 1 }}>
                {loading ? 'Confirming...' : 'Confirm Booking'} {!loading && <Check size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Success */}
        {step === 4 && booking && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={32} color="white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Booking Confirmed! 🎉</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 15 }}>
              Your appointment has been successfully booked. We look forward to seeing you!
            </p>
            <div style={{ background: 'white', borderRadius: 12, padding: '24px', border: '1px solid var(--border-light)', maxWidth: 400, margin: '0 auto 32px', textAlign: 'left' }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: 'var(--gold)', marginBottom: 12 }}>BOOKING DETAILS</div>
              {[
                ['Service', booking.service?.name],
                ['Date', new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })],
                ['Time', booking.timeSlot],
                ['Amount', `₹${booking.totalAmount?.toLocaleString()}`],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, background: 'rgba(201,168,76,0.08)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--gold-dark)', textAlign: 'center' }}>
                🌟 You earned {Math.floor(booking.totalAmount / 10)} loyalty points!
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/dashboard" className="btn-primary">View My Bookings</Link>
              <Link to="/services" className="btn-outline">Book Another</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
