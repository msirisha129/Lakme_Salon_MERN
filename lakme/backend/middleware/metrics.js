// Simple metrics stub for local logging of important events
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'logs', 'metrics.log');

function ensureLogDir() {
  try { fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true }); } catch (e) {}
}

function increment(event, details = {}) {
  const entry = { ts: new Date().toISOString(), event, details };
  const line = JSON.stringify(entry) + '\n';
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_PATH, line);
  } catch (e) {
    // fallback to console
    console.log('[metrics]', entry);
  }
}

module.exports = { increment };
