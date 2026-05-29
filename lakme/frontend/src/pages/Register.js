import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [form, setForm] = useState({ 
  name: urlParams.get('name') || '', 
  email: urlParams.get('email') || '', 
  phone: urlParams.get('phone') || '', 
  password: '', 
  confirm: '' 
}); 
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast.success('Welcome to Lakmé! 💄');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1A0A14 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'white', letterSpacing: 4, marginBottom: 4 }}>LAKMÉ</div>
          <div style={{ fontSize: 10, letterSpacing: 6, color: 'var(--gold)', marginBottom: 48 }}>SALON</div>
          <h2 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 16 }}>Join the <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Beauty Club</em></h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 2, maxWidth: 260 }}>
            Become a member and enjoy exclusive perks, loyalty rewards, and priority bookings.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', background: 'var(--cream)' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', marginBottom: 6 }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>Join thousands of happy Lakmé members</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Your full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid-2" style={{ gap: 16, marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="At least 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 16 }}>
              {loading ? 'Creating Account...' : <>Create Account <ArrowRight size={14} /></>}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Already a member? </span>
            <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 14 }}>Sign In</Link>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:768px){div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important} div[style*="background: linear-gradient(135deg, #0A0A0A"]{display:none!important}}`}</style>
    </div>
  );
}
