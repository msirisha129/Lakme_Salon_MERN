import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, Calendar, LogOut, Shield } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/booking', label: 'Book Now' },
    { to: '/hairstyle', label: 'AI Stylist' },
    { to: '/contact', label: 'Contact' },
  ];

  const isHome = location.pathname === '/';

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
background: scrolled 
  ? 'rgba(255,255,255,0.97)' 
  : 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(20px)',
borderBottom: '1px solid rgba(201,168,76,0.15)',
      transition: 'all 0.4s ease',
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600,
            color: scrolled ? 'var(--black)' : 'white',
            textShadow: !scrolled ? '0 0 10px rgba(255,255,255,0.15)' : 'none',
            letterSpacing: 3, transition: 'color 0.4s'
          }}>LAKMÉ</span>
          <span style={{
            fontSize: 9, letterSpacing: 5, textTransform: 'uppercase',
            color: 'var(--gold)', fontWeight: 500
          }}>SALON</span>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'flex', gap: 36, alignItems: 'center' }} className="desktop-nav">
          {links.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500,
              color: location.pathname === to ? 'var(--gold)' :
                    scrolled || !isHome ? 'var(--text-primary)' : 'rgba(255,255,255,0.9)',
              transition: 'color 0.3s',
              position: 'relative',
            }}
            onMouseEnter={e => e.target.style.color = 'var(--gold)'}
            onMouseLeave={e => e.target.style.color = location.pathname === to ? 'var(--gold)' :
                    scrolled || !isHome ? 'var(--text-primary)' : 'rgba(255,255,255,0.9)'}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* User / Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="desktop-nav">
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setDropOpen(!dropOpen)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                border: '1px solid var(--border)', borderRadius: 50, background: 'transparent',
                cursor: 'pointer', transition: 'var(--transition)'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 12, fontWeight: 600
                }}>{user.name?.[0]?.toUpperCase()}</div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{user.name?.split(' ')[0]}</span>
              </button>
              {dropOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, width: 200,
                  background: 'white', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-light)', overflow: 'hidden', zIndex: 100
                }}>
                  <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13, color: scrolled ? 'var(--black)' : 'white', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <User size={14} /> My Bookings
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13, color: 'var(--gold)', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Shield size={14} /> Admin Panel
                    </Link>
                  )}
                  <button onClick={() => { logout(); setDropOpen(false); navigate('/'); }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13,
                    color: 'var(--rose)', width: '100%', background: 'transparent', border: 'none',
                    cursor: 'pointer', borderTop: '1px solid var(--border-light)'
                  }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-outline" style={{ padding: '10px 24px', fontSize: 11 }}>Sign In</Link>
              <Link to="/register" className="btn-primary" style={{ padding: '10px 24px', fontSize: 11 }}>Join Us</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-menu-btn" style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
        color: scrolled ? 'var(--black)' : '#ffffff',
        }}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{
          background: 'white', borderTop: '1px solid var(--border-light)',
          padding: '16px 24px 24px'
        }}>
          {links.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              display: 'block', padding: '12px 0', fontSize: 13, letterSpacing: 2,
              textTransform: 'uppercase', borderBottom: '1px solid var(--border-light)',
              color: location.pathname === to ? 'var(--gold)' : 'var(--text-primary)'
            }}>{label}</Link>
          ))}
          {user ? (
            <button onClick={() => { logout(); setMenuOpen(false); }} style={{ marginTop: 16, color: 'var(--rose)', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>Sign Out</button>
          ) : (
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Link to="/login" className="btn-outline" style={{ fontSize: 11, padding: '10px 20px' }}>Sign In</Link>
              <Link to="/register" className="btn-primary" style={{ fontSize: 11, padding: '10px 20px' }}>Join Us</Link>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) { .desktop-nav { display: none !important; } }
        @media (min-width: 769px) { .mobile-menu-btn { display: none !important; } }
      `}</style>
    </nav>
  );
}
