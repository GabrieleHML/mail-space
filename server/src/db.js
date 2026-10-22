const { Pool } = require('pg');
const config = require('./config');
const logger = require('./logger');

const pool = new Pool(config.db);

// Errors of idle clients (e.g. the database restarts) must not crash the process
pool.on('error', (err) => logger.error({ err }, 'Unexpected database error'));

module.exports = pool;
