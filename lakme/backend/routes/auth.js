const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');
const { sendOtpEmail } = require('../utils/otpEmailService');
const logger = require('../utils/logger');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'lakme_secret', {
  expiresIn: process.env.JWT_EXPIRE || '30d'
});

// Register
router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    console.log('Register request body:', req.body);
    const exists = await User.findOne({ email });
    if (exists) {
      await logger.warn('user', `Registration failed: Email already registered (${email})`, { email });
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, phone, password });
    const token = signToken(user._id);
    await logger.info('user', `User registered successfully: ${user.name} (${user.email})`, { userId: user._id, email: user.email, phone: user.phone });
    res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, loyaltyPoints: user.loyaltyPoints } });
  } catch (err) {
    console.error('Register error:', err && err.message);
    await logger.error('error', `User registration failed: ${err.message}`, { email, error: err.message });
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      await logger.warn('security', `Failed login attempt: User not found for email ${email}`, { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!(await user.matchPassword(password))) {
      await logger.warn('security', `Failed login attempt: Incorrect password for email ${email}`, { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate OTP for 2FA
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const hashedOtp = await bcrypt.hash(otp, 10); // Hash OTP before storing
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    const otpLastGenerated = new Date();

    user.otp = hashedOtp;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    user.otpLastGenerated = otpLastGenerated;
    await user.save();

    await sendOtpEmail({ toEmail: user.email, toName: user.name, otp });
    await logger.info('security', `OTP generated and sent to ${user.email}`, { userId: user._id, email: user.email, ip: req.ip });

    res.json({ success: true, message: 'OTP sent to your email for verification', requires2FA: true, email: user.email });
  } catch (err) {
    await logger.error('error', `User login failed: ${err.message}`, { email, error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Generate and resend OTP
// @route   POST /api/auth/generate-otp
// @access  Public
router.post('/generate-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Cooldown for OTP resend (e.g., 30 seconds)
    if (user.otpLastGenerated && (Date.now() - user.otpLastGenerated.getTime() < 30 * 1000)) {
      return res.status(429).json({ success: false, message: 'Please wait before resending OTP.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    const otpLastGenerated = new Date();

    user.otp = hashedOtp;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0; // Reset attempts on new OTP generation
    user.otpLastGenerated = otpLastGenerated;
    await user.save();

    await sendOtpEmail({ toEmail: user.email, toName: user.name, otp });
    await logger.info('security', `OTP regenerated and sent to ${user.email}`, { userId: user._id, email: user.email, ip: req.ip });

    res.json({ success: true, message: 'New OTP sent to your email.' });
  } catch (err) {
    await logger.error('error', `Failed to generate/resend OTP for ${email}: ${err.message}`, { email, error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Verify OTP and complete login
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.otp) {
      await logger.warn('security', `OTP verification failed: No OTP found for ${email}`, { email, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid OTP or session expired.' });
    }

    if (user.otpExpires < new Date()) {
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      await logger.warn('security', `OTP verification failed: OTP expired for ${email}`, { email, ip: req.ip });
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (user.otpAttempts >= 3) {
      await logger.warn('security', `Excessive OTP attempts blocked for ${email}`, { email, ip: req.ip });
      return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please request a new OTP.' });
    }

    if (!(await bcrypt.compare(otp, user.otp))) {
      user.otpAttempts += 1;
      await user.save();
      await logger.warn('security', `OTP verification failed: Incorrect OTP for ${email}`, { email, ip: req.ip, attempts: user.otpAttempts });
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // OTP is valid, complete login
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.otpLastGenerated = undefined;
    await user.save();

    const token = signToken(user._id);
    if (user.role === 'admin') {
      await logger.info('app', `Admin logged in: ${user.email}`, { userId: user._id, ip: req.ip });
    }
    await logger.info('user', `User logged in successfully: ${user.name} (${user.email})`, { userId: user._id, email: user.email, ip: req.ip });
    await logger.info('security', `OTP verified successfully for user: ${user.email}`, { userId: user._id, email: user.email, ip: req.ip });

    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, loyaltyPoints: user.loyaltyPoints } });
  } catch (err) {
    await logger.error('error', `User login failed: ${err.message}`, { email, error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
