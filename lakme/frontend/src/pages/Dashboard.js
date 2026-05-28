import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Star, Award, ArrowRight, X } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  confirmed: { bg: 'rgba(74,144,217,0.1)', color: '#4A90D9', label: 'Confirmed' },
  pending:   { bg: 'rgba(245,166,35,0.1)', color: '#F5A623', label: 'Pending' },
  completed: { bg: 'rgba(15,155,88,0.1)',  color: '#0F9B58', label: 'Completed' },
  cancelled: { bg: 'rgba(200,0,59,0.1)',   color: '#C8003B', label: 'Cancelled' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    API.get('/bookings/my').then(r => { setBookings(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await API.put(`/bookings/${id}/cancel`);
      setBookings(b => b.map(x => x._id === id ? { ...x, status: 'cancelled' } : x));
      toast.success('Appointment cancelled');
    } catch { toast.error('Failed to cancel'); }
  };

  const submitFeedback = async () => {
    try {
      await API.put(`/bookings/${feedbackModal._id}/feedback`, feedback);
      toast.success('Thank you for your feedback! 🌟');
      setBookings(b => b.map(x => x._id === feedbackModal._id ? { ...x, feedback } : x));
      setFeedbackModal(null);
    } catch { toast.error('Failed to submit'); }
  };

  const now = new Date();
  const upcoming = bookings.filter(b => new Date(b.date) >= now && b.status !== 'cancelled');
  const past = bookings.filter(b => new Date(b.date) < now || b.status === 'cancelled');
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A0A0A, #1A0A14)', padding: '50px 0 40px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <span style={{ fontSize: 11, letterSpacing: 4, color: 'var(--gold)', textTransform: 'uppercase' }}>My Account</span>
              <h1 style={{ color: 'white', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginTop: 8 }}>Hello, {user?.name?.split(' ')[0]} 👋</h1>
            </div>
            <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '20px 28px', textAlign: 'center' }}>
              <Award size={24} color="var(--gold)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gold)', lineHeight: 1 }}>{user?.loyaltyPoints || 0}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginTop: 4 }}>LOYALTY POINTS</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 32 }}>
            {[
              { label: 'Total Bookings', val: bookings.length, icon: '📅' },
              { label: 'Upcoming', val: upcoming.length, icon: '⏰' },
              { label: 'Completed', val: bookings.filter(b => b.status === 'completed').length, icon: '✅' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'white' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['upcoming', 'past'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 24px', borderRadius: 50, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                background: tab === t ? 'var(--gold)' : 'white',
                color: tab === t ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${tab === t ? 'var(--gold)' : 'var(--border-light)'}`,
                fontWeight: tab === t ? 600 : 400, textTransform: 'capitalize'
              }}>{t} ({t === 'upcoming' ? upcoming.length : past.length})</button>
            ))}
          </div>
          <Link to="/booking" className="btn-primary" style={{ fontSize: 12 }}>
            <Calendar size={14} /> New Appointment
          </Link>
        </div>

        {loading ? <div className="spinner" /> : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>No {tab} appointments</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
              {tab === 'upcoming' ? "You don't have any upcoming appointments." : "No past bookings yet."}
            </p>
            <Link to="/booking" className="btn-primary">Book Now <ArrowRight size={14} /></Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {displayed.map(b => {
              const st = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
              const canCancel = b.status === 'confirmed' && new Date(b.date) > new Date(Date.now() + 2 * 3600000);
              const canFeedback = b.status === 'completed' && !b.feedback?.rating;
              return (
                <div key={b._id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden', display: 'flex', transition: 'box-shadow 0.3s' }}>
                  <div style={{ width: 8, background: st.color, flexShrink: 0 }} />
                  <div style={{ padding: '20px 24px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>{b.service?.name}</h3>
                        <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, letterSpacing: 1 }}>{st.label}</span>
                        <span className="badge badge-gold">{b.service?.category}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 20, color: 'var(--text-secondary)', fontSize: 13, flexWrap: 'wrap' }}>
                        <span>📅 {new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>🕐 {b.timeSlot}</span>
                        <span>✂️ {b.stylist}</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>₹{b.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {canFeedback && (
                        <button onClick={() => { setFeedbackModal(b); setFeedback({ rating: 5, comment: '' }); }} className="btn-primary" style={{ padding: '9px 16px', fontSize: 11 }}>
                          <Star size={12} /> Rate
                        </button>
                      )}
                      {b.feedback?.rating && (
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[...Array(b.feedback.rating)].map((_, i) => <Star key={i} size={14} fill="var(--gold)" color="var(--gold)" />)}
                        </div>
                      )}
                      {canCancel && (
                        <button onClick={() => cancel(b._id)} style={{ padding: '9px 14px', borderRadius: 6, border: '1px solid rgba(200,0,59,0.3)', background: 'rgba(200,0,59,0.05)', color: 'var(--rose)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <X size={12} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {feedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '36px', width: '100%', maxWidth: 440 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 6 }}>Rate Your Experience</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>{feedbackModal.service?.name}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setFeedback(f => ({ ...f, rating: n }))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 32, transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}>
                  <Star size={32} fill={n <= feedback.rating ? 'var(--gold)' : 'none'} color="var(--gold)" />
                </button>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Your Comment (Optional)</label>
              <textarea className="form-input" rows={3} placeholder="Tell us about your experience..." value={feedback.comment} onChange={e => setFeedback(f => ({ ...f, comment: e.target.value }))} style={{ resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setFeedbackModal(null)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
              <button onClick={submitFeedback} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Submit Feedback ⭐</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
