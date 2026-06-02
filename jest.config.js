/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/tests/__mocks__/uuid.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/tests/**',
    '!src/server.ts',
    '!src/app.ts',
    '!src/socket.ts',
    '!src/config/**',
    '!src/utils/logger.ts',
    '!src/scripts/**',
    '!src/middlewares/security.middleware.ts',
  ],
  coverageThreshold: {
    global: {
      lines:     95,
      functions: 90,
    },
  },
  verbose: true,
};