import nextJest from 'next/jest.js';

/**
 * Unit and component tests only. Playwright end-to-end tests live in ./tests and are
 * run by `playwright test`, so the two runners never pick up each other's files.
 *
 * next/jest compiles TS/JSX with Next's SWC, loads .env files,
 * and mocks CSS and image imports. It does not read tsconfig "paths"; see moduleNameMapper.
 */
const createJestConfig = nextJest({ dir: './' });

export default createJestConfig({
  // jsdom plus fetch/Response/TextEncoder, which plain jsdom leaves out (see the file).
  // Server tests opt into Node with a @jest-environment docblock.
  testEnvironment: '<rootDir>/jest.environment.mjs',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }, // keep in step with "paths" in tsconfig.json
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '<rootDir>/tests/', '<rootDir>/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/test-ids.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx', // pages are covered by Playwright
  ],
  coverageReporters: ['text-summary', 'json-summary', 'html', 'lcov'],
  // No thresholds on day one. Once the real number is known, add e.g.
  // coverageThreshold: { global: { lines: 60, branches: 50 } } and only ever raise it.
});
