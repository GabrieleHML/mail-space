// Shared setup of the integration tests: real Express app and PostgreSQL,
// Cognito and Gemini replaced by mocks. Must be required before anything from src/.
jest.mock('../../src/services/cognitoService');
jest.mock('../../src/services/classifierService');

const classifierService = require('../../src/services/classifierService');
const { keywordClassifier } = require('../support/fakeClassifier');
const { trustTestKeys } = require('../support/tokens');
const db = require('../support/db');

beforeAll(trustTestKeys);
beforeEach(async () => {
  await db.resetDatabase();
  classifierService.classifyEmail.mockImplementation(keywordClassifier);
});
afterAll(db.closeDatabase);
