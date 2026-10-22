const { rateLimit } = require('express-rate-limit');

const message = { message: 'Too many requests, try again later', code: 'TooManyRequests' };

// Slows down brute-force attempts on login, sign-up and password reset (per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message,
});

// Caps the requests that call Gemini, which is billed per use (per user)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.email,
  message,
});

module.exports = { authLimiter, aiLimiter };
