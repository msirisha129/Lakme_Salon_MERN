const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
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
    if (!user || !(await user.matchPassword(password))) {
      await logger.warn('security', `Failed login attempt for email: ${email}`, { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = signToken(user._id);
    if (user.role === 'admin') {
      await logger.info('app', `Admin logged in: ${user.email}`, { userId: user._id });
    }
    await logger.info('user', `User logged in successfully: ${user.name} (${user.email})`, { userId: user._id, email: user.email });
    await logger.info('security', `Successful login for user: ${user.email}`, { userId: user._id, ip: req.ip });
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
