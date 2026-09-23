# Next.js app test kit: unit tests, test-id conventions, PR gate

Drop-in files for a Next.js (App Router, TypeScript) project. Pairs with the QA pipeline
starter (Playwright), which covers end-to-end; this kit covers everything below it.

This repo is not an app and has no `package.json`: running `npm install` or `npm test` in it
does nothing. `setup.sh` adds it to an app with one command, described below.

Verified on 2026-09-23 with Next 15 and 16, React 19, Jest 30, Testing Library 16: all reference
tests pass, `tsc` and ESLint are clean, and the test-id lint rule fires on a string literal.

## What's here and where it goes

```
setup.sh                      -> run in an app to add everything below (see "Start testing")
jest.config.mjs               -> repo root. next/jest, coverage, only picks up src/**/*.test.{ts,tsx}
jest.setup.ts                 -> repo root. jest-dom matchers, mock/env reset, next/navigation mocks
jest.environment.mjs          -> repo root. jsdom plus fetch/Response/TextEncoder from Node
eslint.testing.mjs            -> repo root. Spread into eslint.config.mjs (see below)
package.additions.json        -> merge scripts + devDependencies into package.json
.nvmrc                        -> repo root
.github/workflows/pr-checks.yml -> replaces the QA starter's version inside the app repo
src/test-ids.ts               -> the only place data-testid values are defined
src/test/render.tsx           -> render() wrapped in your providers
src/test/navigation.ts        -> mockRouter and mockUrl() for the mocked App Router hooks
src/lib/format-price.ts       (+ .test.ts)   reference: pure function
src/lib/validate-contact.ts   (+ .test.ts)   reference: table test
src/lib/apply-coupon.ts       (+ .test.ts)   reference: the worked example below
src/components/ui/button.tsx  (+ .test.tsx)  reference: prop forwarding, role queries
src/components/contact-form.tsx (+ .test.tsx) reference: form flow with fetch stubbed
src/hooks/use-debounced-value.ts (+ .test.ts) reference: custom hook, fake timers
src/components/search-box.tsx (+ .test.tsx)   reference: userEvent + fake timers, navigation
src/app/api/contact/route.ts  (+ .test.ts)   reference: route handler, hostile input
src/app/actions/subscribe.ts  (+ .test.ts)   reference: server action, database mocked
src/lib/mailer.ts, src/lib/db.ts             -> infrastructure boundaries the tests mock
docs/unit-testing-practices.md
docs/new-project-checklist.md
```

The reference files are examples to copy from, not part of the setup. Bring the ones you want
into the app to read and run, and delete them once the app has real tests of the same kind.

## Start testing in a new repo

**1. Create the app.**

```bash
npx create-next-app@latest my-app --typescript --eslint --app --src-dir --import-alias "@/*"
cd my-app
```

**2. Run the setup script** from the app's root:

```bash
curl -fsSL https://raw.githubusercontent.com/praharshaAdhikari/nextjs-app-test-kit/main/setup.sh | bash -s -- --examples
```

It downloads this repo to a temporary folder, then:

1. copies `jest.config.mjs`, `jest.setup.ts`, `jest.environment.mjs`, `eslint.testing.mjs`,
   `src/test/`, `src/test-ids.ts` and `.nvmrc` into the app
2. with `--examples`, also copies two reference tests: `src/lib/apply-coupon.*` and
   `src/lib/format-price.*`
3. adds the `test:unit`, `test:unit:watch`, `test:unit:coverage`, `typecheck` and `check` scripts
4. adds the testing rules to `eslint.config.mjs`, and tells ESLint to skip `coverage/`
5. installs the dev dependencies listed in `package.additions.json`, with npm, pnpm, yarn or bun
   (whichever lockfile the app has)
6. runs Jest once to check it starts, then deletes the download

It changes nothing if one of those files already exists; `--force` overwrites them. Leave out
`--examples` to start with no tests. `--help` lists the options.

**3. Check it works.**

```bash
npm run check          # lint, typecheck, unit tests: all green
```

Without `--examples`, `npm run test:unit` reports "No tests found" and `npm run check` fails
until the first test exists. That is deliberate: a typo in `testMatch` should not pass
silently. Write the first test (see "Writing a function and its tests" below) and it goes green.
Delete the example files once you have tests of your own.

Then carry on with `docs/new-project-checklist.md` from section 3 (Playwright, then CI with
`pr-checks.yml`, then branch protection). `pr-checks.yml` is not copied by the script: its smoke
job needs the Playwright setup first.

## Start testing in an existing repo

Commit or stash your work first so the script's changes are easy to review, then run the same
command from the repo root. Leave out `--examples` if you already have code to test.

```bash
curl -fsSL https://raw.githubusercontent.com/praharshaAdhikari/nextjs-app-test-kit/main/setup.sh | bash
git diff               # review what it changed
npm run check
```

The script handles these on its own:

- **No `src/` folder:** files go to the root (`test/`, `test-ids.ts`), and `jest.config.mjs` and
  `eslint.testing.mjs` are pointed at the root instead of `src/`.
- **Scripts you already have** (a `typecheck` or `check` of your own) are kept; the script prints
  the ones it skipped.
- **Files that already exist** stop the script before it changes anything.

It stops and asks you to decide in these cases:

**Already using Vitest?** The script refuses to add a second test runner. Keep Vitest. This kit's
docs and reference tests still apply: swap `jest.fn` for `vi.fn`, and the `@jest-environment`
comments for `// @vitest-environment node`.

**Already using Jest** (a `jest.config.js/ts/cjs` or a `"jest"` section in `package.json`)? The
script will not touch your config. Merge the parts that matter by hand:
`testEnvironment: '<rootDir>/jest.environment.mjs'` (if tests need `fetch` or `Response`), the
`moduleNameMapper` for `@/`, and `setupFilesAfterEnv`. If you already have a setup file, append
the contents of `jest.setup.ts` to it. Run the suite before and after the change.

**ESLint config the script cannot edit** (no `export default eslintConfig;` line, or still on
`.eslintrc` from Next 14 and older)? It prints a warning and carries on. Add the rules yourself:

```js
import { testingConfig } from './eslint.testing.mjs';
// ...your config...
eslintConfig.push(...testingConfig, { ignores: ['coverage/**'] });
```

`eslint.testing.mjs` is flat config. With `.eslintrc`, move to `eslint.config.mjs` first, or
copy its rules into an `overrides` block for test files.

Check these after running it:

**Tests in `__tests__/` folders or named `*.spec.tsx`?** Widen `testMatch` in
`jest.config.mjs` to include them, and keep `tests/` (Playwright) in `testPathIgnorePatterns`.

**Other `"paths"` aliases in `tsconfig.json`** (`@components/*`, `~/*`)? Add each to
`moduleNameMapper`. Jest does not read `tsconfig.json`; an unmapped alias fails with "Cannot
find module". The script warns if the `@/*` alias itself is missing.

**Pages Router?** The setup mocks `next/navigation` (App Router) only. Components that use
`next/router` need their own `jest.mock('next/router', ...)` in the test or in `jest.setup.ts`.

### Without the script

To set up by hand, or to see exactly what the script does:

```bash
git clone --depth 1 https://github.com/praharshaAdhikari/nextjs-app-test-kit.git ../nextjs-app-test-kit
KIT=../nextjs-app-test-kit
cp $KIT/jest.config.mjs $KIT/jest.setup.ts $KIT/jest.environment.mjs $KIT/eslint.testing.mjs $KIT/.nvmrc .
mkdir -p src/test && cp $KIT/src/test/* src/test/ && cp $KIT/src/test-ids.ts src/

npm install -D jest jest-environment-jsdom @types/jest \
  @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event \
  eslint-plugin-testing-library eslint-plugin-jest-dom eslint-plugin-jest

npm pkg set scripts.test:unit="jest" scripts.test:unit:watch="jest --watch" \
  scripts.test:unit:coverage="jest --coverage" scripts.typecheck="tsc --noEmit" \
  scripts.check="npm run lint && npm run typecheck && npm run test:unit"
```

Then add the `eslintConfig.push(...)` line above to `eslint.config.mjs`. A local copy of the kit
also works with the script: `QA_KIT_DIR=$KIT bash $KIT/setup.sh`.

## Introduce it gradually

In a codebase that already has code, do not set a coverage threshold yet, and do not backfill
tests for everything at once:

1. New code and bug fixes get tests from now on (the Definition of Done).
2. When you change an existing file, add tests for the behaviour you touched.
3. Start with pure logic in `lib/` (pricing, validation, formatting); it gives the most value for
   the least effort. Components come next.
4. After a month, set today's coverage as the floor in `jest.config.mjs`
   (`coverageThreshold.global`) and only ever raise it.

`npx jest --changedSince=origin/main` runs only the tests related to your branch's changes.

## Writing a function and its tests

The worked example is `src/lib/apply-coupon.ts`: take a percentage or fixed amount off a cart
subtotal, with an expiry date and a minimum spend. The full files are in this kit.

**1. List the behaviours before writing code.** Each becomes an `it`:

- 10% off $50 is $5; $15 off $50 is $15
- a percentage rounds to the nearest cent
- the total never goes below zero
- an expired coupon is rejected
- below the minimum spend is rejected; exactly the minimum is accepted
- an invalid subtotal (negative, fractional cents, `NaN`) throws

**2. Write the test file first,** next to the code: `src/lib/apply-coupon.test.ts`. `describe`,
`it`, `expect` and `jest` are globals; do not import them.

```ts
import { applyCoupon, type Coupon } from './apply-coupon';

// A fixed "now" keeps expiry tests independent of when they run.
const now = new Date('2026-09-23T12:00:00Z');

describe('applyCoupon', () => {
  it('takes a percentage off the subtotal', () => {
    const coupon: Coupon = { kind: 'percent', percent: 10 };

    expect(applyCoupon(5000, coupon, now)).toStrictEqual({
      ok: true,
      discountCents: 500,
      totalCents: 4500,
    });
  });

  it('rejects a coupon at or after its expiry time', () => {
    const coupon: Coupon = { kind: 'percent', percent: 10, expiresAt: now };

    expect(applyCoupon(5000, coupon, now)).toStrictEqual({ ok: false, reason: 'expired' });
  });

  // Table test: one row per boundary of the minimum-spend rule.
  it.each([
    [4999, { ok: false, reason: 'min-spend' }],
    [5000, { ok: true, discountCents: 1000, totalCents: 4000 }],
    [5001, { ok: true, discountCents: 1000, totalCents: 4001 }],
  ])('with a $50 minimum spend, a subtotal of %i cents gives %o', (subtotal, expected) => {
    const coupon: Coupon = { kind: 'fixed', amountCents: 1000, minSpendCents: 5000 };

    expect(applyCoupon(subtotal, coupon, now)).toStrictEqual(expected);
  });

  // ...one `it` per remaining behaviour; see the full file
});
```

**3. Watch it fail.** `npx jest src/lib/apply-coupon --watch`. First it fails with "Cannot find
module", then, once the function exists, on each behaviour it does not handle yet. A test you
never saw fail proves nothing.

**4. Write the function** until every test passes:

```ts
/** Works in whole cents so there is no floating-point money. `now` is a parameter so tests can fix it. */
export function applyCoupon(subtotalCents: number, coupon: Coupon, now = new Date()): CouponResult {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError('subtotalCents must be a whole number of cents, 0 or more');
  }
  if (coupon.expiresAt && now >= coupon.expiresAt) {
    return { ok: false, reason: 'expired' };
  }
  if (coupon.minSpendCents !== undefined && subtotalCents < coupon.minSpendCents) {
    return { ok: false, reason: 'min-spend' };
  }

  const discount =
    coupon.kind === 'percent'
      ? Math.round((subtotalCents * coupon.percent) / 100)
      : coupon.amountCents;
  const discountCents = Math.min(discount, subtotalCents);

  return { ok: true, discountCents, totalCents: subtotalCents - discountCents };
}
```

**5. Prove the tests catch bugs.** Break one line on purpose and check that a test fails: change
`>=` to `>` in the expiry check, or `Math.round` to `Math.floor`. If nothing fails, a behaviour
is missing a test. Undo the change.

**6. Run `npm run check`** before pushing. It is what CI runs.

What the example shows:

- **Pass time in** (`now = new Date()`) rather than reading the clock inside the function; the
  test then needs no fake timers.
- **Test both sides of every limit** (4999, 5000, 5001). Off-by-one bugs live there.
- **Name each `it` as a sentence**, with a blank line between arrange, act and assert.

For a component, hook, route handler or server action, copy the nearest reference test above.
`docs/unit-testing-practices.md` lists the cases each kind of code must cover ("Required tests,
by kind of code") and the ten rules reviewers check.

## Commands

```bash
npm run test:unit                    # one run, used by CI
npm run test:unit:watch              # reruns affected tests as you save
npx jest src/lib/apply-coupon        # one file (any part of the path works)
npx jest -t "minimum spend"          # tests whose name matches
npm run test:unit:coverage           # adds coverage/ (open coverage/lcov-report/index.html)
npm run check                        # lint + typecheck + unit, run before pushing
```

## How the two repos fit together

Inside the app repo:

- `src/**/*.test.tsx` are Jest (fast, no server)
- `tests/**/*.spec.ts` are Playwright (real browser, against `npm run start` in CI)
- `src/test-ids.ts` is imported by both, so a renamed test id is a compile error, not a
  broken test at 2 a.m.

The PR workflow runs the static job (lint, typecheck, unit tests with coverage) first, then
builds the app and runs the Playwright smoke suite against that build. Coverage numbers
appear in the run's Summary tab.

## The three things that make this stick

1. **The lint rule.** `data-testid="literal"` is an error, so the constants file cannot rot.
2. **The reference tests.** New developers copy the nearest example; make sure it is a good one.
3. **Definition of Done.** New component or util: tests for its behaviours. Bug fix: a
   regression test. Reviewed like production code. It is in `docs/team-practices.md` and the
   ClickUp checklist template.
