const Log = require('../models/Log');

const logger = {
  info: async (category, message, details = {}) => {
    try {
      await Log.create({ category, level: 'info', message, details: JSON.stringify(details) });
    } catch (err) {
      console.error('Failed to log info event:', err);
    }
  },
  warn: async (category, message, details = {}) => {
    try {
      await Log.create({ category, level: 'warn', message, details: JSON.stringify(details) });
    } catch (err) {
      console.error('Failed to log warn event:', err);
    }
  },
  error: async (category, message, details = {}) => {
    try {
      await Log.create({ category, level: 'error', message, details: JSON.stringify(details) });
    } catch (err) {
      console.error('Failed to log error event:', err);
    }
  }
};

module.exports = logger;