const Log = require('../models/Log');

const logger = {
  log: async (category, level, message, details = '') => {
    try {
      const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
      
      // Print to terminal console
      console.log(`[${category.toUpperCase()}][${level.toUpperCase()}] ${message}`, details ? detailsStr : '');
      
      // Save to MongoDB Log collection
      await Log.create({
        category,
        level,
        message,
        details: detailsStr
      });
    } catch (err) {
      console.error('Logger failed to save log to DB:', err.message);
    }
  },
  
  info: async (category, message, details = '') => {
    await logger.log(category, 'info', message, details);
  },
  
  warn: async (category, message, details = '') => {
    await logger.log(category, 'warn', message, details);
  },
  
  error: async (category, message, details = '') => {
    await logger.log(category, 'error', message, details);
  }
};

module.exports = logger;
