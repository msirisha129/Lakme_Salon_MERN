const dbLogger = require('../utils/logger');

const logger = {
  error: (message, details = '') => {
    dbLogger.error('error', message, details);
  },
  app: (message, details = '') => {
    dbLogger.info('error', message, details);
  }
};

module.exports = logger;