import testingLibrary from 'eslint-plugin-testing-library';
import jestDom from 'eslint-plugin-jest-dom';
import jest from 'eslint-plugin-jest';

/**
 * Spread into eslint.config.mjs:  export default [...nextConfig, ...testingConfig];
 * Three things it enforces:
 *  1. data-testid values come from src/test-ids.ts, never string literals
 *  2. Testing Library rules: query by role/label, no container.querySelector, await user events
 *  3. Jest hygiene: no focused tests, every test asserts
 */
export const testingConfig = [
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="data-testid"] > Literal',
          message: 'Use data-testid={TID.something} from src/test-ids.ts, not a string literal.',
        },
      ],
    },
  },
  {
    ...testingLibrary.configs['flat/react'],
    files: ['src/**/*.test.{ts,tsx}'],
  },
  {
    ...jestDom.configs['flat/recommended'],
    files: ['src/**/*.test.{ts,tsx}'],
  },
  {
    ...jest.configs['flat/recommended'],
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'jest.setup.ts'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/no-focused-tests': 'error',
      'jest/no-disabled-tests': 'warn',
      'jest/expect-expect': 'error',
      'jest/no-identical-title': 'error',
    },
  },
];
