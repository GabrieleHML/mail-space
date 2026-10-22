// Reads the configuration from environment variables and fails fast when a
// required one is missing, instead of breaking on the first request.
const fs = require('node:fs');

const REQUIRED = [
  'AWS_REGION',
  'COGNITO_USER_POOL_ID',
  'COGNITO_CLIENT_ID',
  'GEMINI_API_KEY',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const env = process.env;

// TLS towards the database with certificate verification. The Amazon RDS CA is not in
// Node's default trust store, so DB_CA_PATH must point to the RDS CA bundle.
// DB_SSL=false is meant only for a local PostgreSQL without TLS.
const dbSsl =
  env.DB_SSL === 'false'
    ? false
    : {
        rejectUnauthorized: true,
        ca: env.DB_CA_PATH ? fs.readFileSync(env.DB_CA_PATH, 'utf8') : undefined,
      };

module.exports = Object.freeze({
  port: Number(env.PORT) || 3000,
  // Proxies whose X-Forwarded-For header is trusted (Express "trust proxy" syntax):
  // NGINX on the same host by default, the private Docker network with Docker Compose
  trustProxy: env.TRUST_PROXY || 'loopback',
  // Origins allowed by CORS; empty when NGINX serves client and API from the same origin
  corsOrigins: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) : [],
  aws: { region: env.AWS_REGION },
  cognito: { userPoolId: env.COGNITO_USER_POOL_ID, clientId: env.COGNITO_CLIENT_ID },
  gemini: { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite' },
  db: {
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 5432,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: dbSsl,
  },
});
