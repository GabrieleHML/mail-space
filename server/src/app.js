// Builds the Express application (without starting it, so tests can use it directly).
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const config = require('./config');
const logger = require('./logger');
const apiRouter = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Trust X-Forwarded-For only from the reverse proxy, so that rate limiting sees the real client IP
app.set('trust proxy', config.trustProxy);

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/api/health' },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);
app.use(helmet());
// In production NGINX serves the SPA and the API from the same origin, so CORS is
// needed only when the client runs elsewhere
if (config.corsOrigins.length > 0) {
  app.use(cors({ origin: config.corsOrigins }));
}
app.use(express.json({ limit: '1mb' }));
// Express 5 leaves req.body undefined when the request has no body
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
