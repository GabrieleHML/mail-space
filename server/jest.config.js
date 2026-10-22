const common = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/support/env.js'],
  clearMocks: true,
};

module.exports = {
  projects: [
    // Pure logic, no database
    { ...common, displayName: 'unit', testMatch: ['<rootDir>/test/unit/**/*.test.js'] },
    // HTTP API against a real PostgreSQL; Cognito and Gemini are mocked
    {
      ...common,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.test.js'],
      globalSetup: '<rootDir>/test/support/globalSetup.js',
    },
  ],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};
