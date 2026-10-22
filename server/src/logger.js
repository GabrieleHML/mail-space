const pino = require('pino');

// Structured JSON logs; pipe them into pino-pretty for a readable output in development
module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
