const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const startMonthlyResetJob = require('./middleware/monthlyResetJob');
const startDailySummaryJob = require('./middleware/dailySummaryJob');
const path = require('path');
const startReminderJob = require('./middleware/reminderJob');
const logger = require('./middleware/logger');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, cb) => {
    console.log('Incoming Origin:', origin);
    // allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return cb(null, true);
    const allowed = [
      'https://lakme-frontend.onrender.com',
      'https://lakme-salon.onrender.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    if (allowed.indexOf(origin) !== -1) return cb(null, true);
    return cb(new Error('CORS not allowed'));
  },
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
// Ensure OPTIONS preflight requests are handled for all routes

app.use((req, res, next) => {
  console.log("Origin:", req.headers.origin);
  next();
});
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
app.use('/api/billing', require('./routes/billing'));

app.get('/test123', (req, res) => {
  res.send('SIRISHA_TEST');
});
// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Lakme API running' }));

// metrics error handler: log unhandled server errors
const metrics = require('./middleware/metrics');
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err && err.message);
  try { metrics.increment('server.error', { route: req.originalUrl, message: err && err.message }); } catch (e) { console.warn('Metrics error', e); }
  if (!res.headersSent) res.status(500).json({ success: false, message: 'Internal server error' });
});

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
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected — retrying...');
  setTimeout(connectDB, 5000);
});

const PORT = process.env.PORT || 5000;

connectDB();

// start reminder job and keep reference so we can stop it on shutdown
const reminderTask = startReminderJob();
startMonthlyResetJob(); // Start the monthly voice call reset job
startDailySummaryJob(); // Start the daily admin summary job

const server = app.listen(PORT, () => console.log(`🚀 Lakme API running on port ${PORT}`));

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Another process may be running.`);
    process.exit(1);
  }
  console.error('Server error:', err);
});

function gracefulShutdown() {
  console.log('Shutting down server...');
  if (reminderTask && typeof reminderTask.stop === 'function') {
    try { reminderTask.stop(); console.log('Stopped reminder job'); } catch (e) { console.warn('Failed to stop reminder job', e); }
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // force exit if not closed in 5s
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); gracefulShutdown(); });
process.on('unhandledRejection', (reason) => { console.error('Unhandled rejection:', reason); });