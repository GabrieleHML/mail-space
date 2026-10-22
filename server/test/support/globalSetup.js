// Creates the test database if needed and applies the schema (idempotent)
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

module.exports = async () => {
  require('./env');
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const connection = { host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD };

  const admin = new Client({ ...connection, database: 'postgres' });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
  if (rowCount === 0) {
    await admin.query(`CREATE DATABASE "${DB_NAME}"`);
  }
  await admin.end();

  const db = new Client({ ...connection, database: DB_NAME });
  await db.connect();
  await db.query(fs.readFileSync(path.join(__dirname, '../../../db/schema.sql'), 'utf8'));
  await db.end();
};
