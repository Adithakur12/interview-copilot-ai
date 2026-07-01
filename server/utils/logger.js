const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

function writeLog(level, message, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  const line = `${JSON.stringify(entry)}\n`;
  fs.appendFileSync(logFile, line, 'utf8');
  console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${message}`, details);
  return entry;
}

function info(message, details) {
  return writeLog('info', message, details);
}

function warn(message, details) {
  return writeLog('warn', message, details);
}

function error(message, details) {
  return writeLog('error', message, details);
}

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    info(`${req.method} ${req.originalUrl} ${res.statusCode}`, { durationMs: duration, ip: req.ip });
  });
  next();
}

module.exports = { info, warn, error, requestLogger };
