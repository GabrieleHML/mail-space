// Test configuration. Cognito and Gemini values are fake: those services are mocked.
// The database is a local PostgreSQL (`docker compose up -d db`) or the CI service;
// tests always use a dedicated database, so they can never wipe the development data.
const defaults = {
  LOG_LEVEL: 'silent',
  AWS_REGION: 'eu-west-1',
  COGNITO_USER_POOL_ID: 'eu-west-1_TestPool1',
  COGNITO_CLIENT_ID: 'test-client-id',
  GEMINI_API_KEY: 'test-api-key',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'mailspace',
  DB_PASSWORD: 'mailspace',
};

for (const [name, value] of Object.entries(defaults)) {
  process.env[name] ??= value;
}
process.env.DB_NAME = process.env.TEST_DB_NAME || 'mailspace_test';
process.env.DB_SSL = 'false';
