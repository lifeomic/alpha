import type { Config } from '@jest/types';
import inspector from 'inspector';

// If we are debugging then extend the timeout to max value, otherwise use the default.
const testTimeout = inspector.url() ? 1e8 : 10e3;

const config: Config.InitialOptions = {
  preset: '@lifeomic/jest-config',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        jsc: { target: 'es2022' },
      },
    ],
  },
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  coveragePathIgnorePatterns: ['<rootDir>/test/', '/node_modules/'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testMatch: [
    '<rootDir>/test/**/*.test.ts',
  ],
  verbose: true,
  maxWorkers: '50%',
  testTimeout,
};

export default config;
