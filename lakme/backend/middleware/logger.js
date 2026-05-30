const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

function writeLog(type, level, message, details = '') {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    details: typeof details === 'object' ? JSON.stringify(details) : details
  });
  const file = path.join(logsDir, `${type}.log`);
  fs.appendFileSync(file, entry + '\n');
}

const logger = {
  error: (message, details) => {
    console.error(message, details);
    writeLog('error', 'error', message, details);
  },
  app: (message, details) => {
    console.log(message, details);
    writeLog('app', 'info', message, details);
  }
};

module.exports = logger;