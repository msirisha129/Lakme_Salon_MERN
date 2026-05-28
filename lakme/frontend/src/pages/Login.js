import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 💄');
      navigate(searchParams.get('redirect') || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Left — Visual */}
      <div style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1A0A14 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'white', letterSpacing: 4, marginBottom: 4 }}>LAKMÉ</div>
          <div style={{ fontSize: 10, letterSpacing: 6, color: 'var(--gold)', marginBottom: 48 }}>SALON</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 2, maxWidth: 280 }}>
            Sign in to manage your appointments, earn loyalty points, and enjoy exclusive member benefits.
          </div>
          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Book & manage appointments', 'Earn loyalty points', 'Exclusive member offers', 'AI hairstyle advisor'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', flexShrink: 0 }}>✓</div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', background: 'var(--cream)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', marginBottom: 6 }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 36 }}>Sign in to your Lakmé account</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Password</label>
              <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Your password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: 38, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 16, marginTop: 8 }}>
              {loading ? 'Signing in...' : <>Sign In <ArrowRight size={14} /></>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, padding: '16px 0', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Don't have an account? </span>
            <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 14 }}>Join Us</Link>
          </div>

          {/* Demo hint */}
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--gold-dark)' }}>Demo Admin:</strong> admin@lakmesalon.com / Admin@123
          </div>
        </div>
      </div>

      <style>{`@media(max-width:768px){div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important} div[style*="background: linear-gradient(135deg, #0A0A0A"]{display:none!important}}`}</style>
    </div>
  );
}
