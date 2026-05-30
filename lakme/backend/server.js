const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const startReminderJob = require('./middleware/reminderJob');
const logger = require('./middleware/logger');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://lakme-salon.up.railway.app'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Lakme API running' }));

// Connect MongoDB
const connectDB = async () => {
  try {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lakme_salon', {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  retryWrites: true,
});
    console.log('✅ MongoDB connected');
    require('./middleware/seeder');
  } catch (err) {
    console.error('MongoDB error:', err.message);
    setTimeout(connectDB, 5000); // retry every 5 seconds
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected — retrying...');
  setTimeout(connectDB, 5000);
});

const PORT = process.env.PORT || 5000;

connectDB();
startReminderJob();

app.listen(PORT, () => console.log(`🚀 Lakme API running on port ${PORT}`));
