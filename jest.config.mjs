import nextJest from 'next/jest.js';

/**
 * Unit and component tests only. Playwright end-to-end tests live in ./tests and are
 * run by `playwright test`, so the two runners never pick up each other's files.
 *
 * next/jest compiles TS/JSX with Next's SWC, loads .env files,
 * and mocks CSS and image imports. It does not read tsconfig "paths"; see moduleNameMapper.
 */
const createJestConfig = nextJest({ dir: './' });

/**
 * Packages in node_modules that ship only ES modules. Jest does not compile node_modules and
 * cannot load these as they are, so they are compiled like the app's own code. When a test
 * fails with "Must use import to load ES Module" or "Cannot use import statement outside a
 * module" for a file in node_modules, add that package's name here.
 */
const esmPackages = ['rettime', 'until-async', '@open-draft/deferred-promise'];

const jestConfig = createJestConfig({
  // jsdom plus fetch/Response/TextEncoder, which plain jsdom leaves out (see the file).
  // Server tests opt into Node with a @jest-environment docblock.
  testEnvironment: '<rootDir>/jest.environment.mjs',
  // jsdom makes packages load their *browser* builds, which for some (MSW's included) are
  // ES modules Jest cannot run: "Must use import to load ES Module". Load their Node builds.
  testEnvironmentOptions: { customExportConditions: [''] },
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

/**
 * next/jest only compiles the node_modules packages in next.config's transpilePackages (plus a
 * few of Next's own). Add esmPackages to its patterns, in both the npm and the pnpm layout, so
 * this list lives here with the rest of the test setup.
 */
function compileEsmPackages(patterns) {
  const names = esmPackages.join('|');
  const pnpmNames = esmPackages.map((name) => name.replaceAll('/', '\\+')).join('|');
  const pathNames = esmPackages.map((name) => name.replaceAll('/', '[\\\\/]')).join('|');
  return patterns.map((pattern) =>
    pattern === '/node_modules/'
      ? `/node_modules/(?!(?:\\.pnpm|${names})/)`
      : pattern
          .replace('/node_modules/(?!.pnpm)(?!(', `/node_modules/(?!.pnpm)(?!(${names}|`)
          .replace('\\.pnpm[\\\\/](?!(', `\\.pnpm[\\\\/](?!(${pnpmNames}|`)
          .replace('(?!.*node_modules[\\\\/](', `(?!.*node_modules[\\\\/](${pathNames}|`),
  );
}

export default async function config() {
  const resolved = await jestConfig();
  resolved.transformIgnorePatterns = compileEsmPackages(resolved.transformIgnorePatterns);
  return resolved;
}
