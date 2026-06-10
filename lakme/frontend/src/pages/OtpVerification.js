import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function OtpVerification() {
  const { verifyOtp, resendOtp, loading } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    console.log('OtpVerification: Component mounted.');
    const storedEmail = localStorage.getItem('lakme_2fa_email');
    if (!storedEmail) {
      navigate('/login'); // Redirect if no email is found for 2FA
      return;
    }
    setEmail(storedEmail);

    console.log('OtpVerification: Stored email for 2FA:', storedEmail);
    // Start cooldown if a new OTP was just sent (implied by landing on this page)
    setResendCooldown(60); // 60 seconds cooldown
  }, [navigate]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('OTP must be 6 digits long.');
      return;
    }

    setAttempts(prev => prev + 1);

    if (attempts >= MAX_ATTEMPTS -1) { // -1 because attempts is incremented before check
      toast.error('Too many incorrect OTP attempts. Please resend OTP.');
      // Optionally, disable verification and force resend
      return;
    }

    try {
      await verifyOtp(email, otp);
      toast.success('Login successful! Welcome back! 💄');
      navigate('/'); // Redirect to home or intended page
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await resendOtp(email);
      toast.success('New OTP sent to your email.');
      setResendCooldown(60); // Reset cooldown
      setAttempts(0); // Reset attempts on resend
      setOtp(''); // Clear OTP input
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', maxWidth: '450px', width: '100%', textAlign: 'center' }}>
        <MailCheck size={48} color="var(--gold)" style={{ marginBottom: '20px' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '10px' }}>Verify Your Login</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '15px' }}>
          A 6-digit OTP has been sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Please enter it below to complete your login.
        </p>

        <form onSubmit={handleVerify}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" htmlFor="otp">One-Time Password (OTP)</label>
            <input
              id="otp"
              className="form-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              required
              style={{ textAlign: 'center', letterSpacing: '5px' }}
            />
          </div>

          <button type="submit" disabled={loading || attempts >= MAX_ATTEMPTS} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px' }}>
            {loading ? 'Verifying...' : <>Verify OTP <ArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{ marginTop: '25px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Didn't receive the OTP?{' '}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: resendCooldown > 0 || loading ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
          </button>
        </div>
        {attempts > 0 && <p style={{ color: 'var(--rose)', fontSize: '13px', marginTop: '10px' }}>Attempts remaining: {MAX_ATTEMPTS - attempts}</p>}
      </div>
    </div>
  );
}