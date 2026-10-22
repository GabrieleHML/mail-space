const app = require('./app');
const config = require('./config');
const logger = require('./logger');
const pool = require('./db');

const server = app.listen(config.port, () => {
  logger.info(`Mail Space API listening on port ${config.port}`);
});

// Graceful shutdown: stop accepting requests, finish the running ones, close the pool
function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
