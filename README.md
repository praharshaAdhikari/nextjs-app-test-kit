# Next.js app test kit: unit tests, test-id conventions, PR gate

Drop-in files for a Next.js (App Router, TypeScript) project: Jest and Testing Library for
unit and component tests, test-id conventions, and a PR workflow. End-to-end tests (Playwright)
live in the app's `tests/` folder; `docs/new-project-checklist.md` covers setting them up.

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
.github/workflows/pr-checks.yml -> the app's PR gate: lint, typecheck, unit tests, then Playwright smoke
src/test-ids.ts               -> the only place data-testid values are defined
src/test/render.tsx           -> render() wrapped in your providers
src/test/navigation.ts        -> mockRouter and mockUrl() for the mocked App Router hooks
src/test/server.ts            -> the fake API (MSW) that tests configure per test
src/examples/                 -> reference tests and the code they test (see src/examples/README.md)
  lib/                          pure functions: apply-coupon (walkthrough below), format-price, validate-contact
  components/confirm-dialog     a component from scratch: roles, keyboard, focus (walkthrough below)
  components/product-list       loading / empty / error / loaded against the fake API
  components/cart               components and a hook that need a provider
  components/contact-form       a form's five states, a response held in flight
  components/search-box         fake timers with userEvent, navigation
  components/ui/button          props reaching the DOM
  hooks/use-debounced-value     a custom hook
  api/contact/route             a route handler, hostile request bodies
  actions/subscribe             a server action, database mocked
docs/unit-testing-practices.md  the rules, required tests by kind of code, worked examples
docs/troubleshooting.md         exact error messages and their fixes
docs/testid-conventions.md      when a data-testid is the right tool, and how to name it
docs/new-project-checklist.md
```

The examples are there to copy from, not part of the setup. `setup.sh --examples` puts the
whole folder in the app; nothing else imports it and it adds no routes, so deleting
`src/examples/` removes them cleanly once the app has tests of its own.

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
2. with `--examples`, also copies `src/examples/`: 12 reference tests and the code they test
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
- **pnpm 11 build approvals:** the kit's two packages with install scripts (`msw`,
  `@parcel/watcher`) are set to `false` in `pnpm-workspace.yaml`; neither is needed for tests.
  Any other package waiting for a decision is left to you (`pnpm approve-builds`).

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
  eslint-plugin-testing-library eslint-plugin-jest-dom eslint-plugin-jest msw

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

The worked example is `applyCoupon`: take a percentage or fixed amount off a cart subtotal,
with an expiry date and a minimum spend. Write yours in `src/lib/`; the finished files are in
`src/examples/lib/apply-coupon.*`.

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

## Writing a component and its tests

A component test does what a user does and checks what a user sees. The worked example is a
`ConfirmDialog`: a "Delete project" button that opens a dialog asking to confirm. The finished
files are in `src/examples/components/confirm-dialog.*`.

**1. List what the user can see and do.** Not state, props or internals: only what shows on the
screen and what the user can click or type.

- the dialog is closed until the button is clicked
- it opens with its title and message, with focus on Cancel (the safe choice)
- Cancel closes it, does nothing, and puts focus back on the button
- Escape closes it too
- Delete confirms once and closes
- if confirming fails, it stays open and shows an error

**2. Write the tests,** next to the component: `src/components/confirm-dialog.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './confirm-dialog';

/** Renders the dialog closed, the way it first appears on the page. */
function renderDialog(onConfirm = jest.fn()) {
  render(
    <ConfirmDialog triggerLabel="Delete project" title="Delete this project?" confirmLabel="Delete" onConfirm={onConfirm}>
      This removes the project and all its tasks.
    </ConfirmDialog>,
  );
  return { onConfirm, trigger: screen.getByRole('button', { name: 'Delete project' }) };
}

describe('ConfirmDialog', () => {
  it('is closed until the trigger is clicked', () => {
    renderDialog();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with its title, its message, and focus on Cancel', async () => {
    const { trigger } = renderDialog();

    await userEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Delete this project?' });
    expect(dialog).toHaveTextContent('This removes the project and all its tasks.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('closes on Cancel without confirming, and gives focus back to the trigger', async () => {
    const { onConfirm, trigger } = renderDialog();
    await userEvent.click(trigger);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('stays open with an error when confirming fails', async () => {
    const { trigger } = renderDialog(jest.fn().mockRejectedValue(new Error('server down')));
    await userEvent.click(trigger);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/try again/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // ...Escape, and confirming successfully: see the full file
});
```

**3. Write the component** until the tests pass. Getting the markup right is what makes it
testable, and it is the same markup a screen reader needs:

- `role="dialog"` and `aria-labelledby` pointing at the title, so `getByRole('dialog', { name })`
  finds it
- real `<button>` elements with visible text, so `getByRole('button', { name: 'Cancel' })` works
- `role="alert"` on the error, so it is announced and `findByRole('alert')` finds it

The dialog renders into `document.body` with a portal. `screen` queries the whole document, so
the tests do not need to know that.

**4. Break it on purpose** (remove the Escape handler, or the line that moves focus back) and
check a test fails. Then `npm run check`.

### Finding elements and checking results

| You want | Use |
|---|---|
| An element that must be there | `screen.getByRole('button', { name: 'Save' })` |
| To check something is *not* there | `expect(screen.queryByRole('dialog')).not.toBeInTheDocument()` |
| Something that appears later (after a fetch, a timer) | `await screen.findByRole('alert')` |
| An element inside one part of the page | `within(row).getByText('$34.50')` |
| A form field | `screen.getByLabelText('Email')` or `getByRole('textbox', { name: 'Email' })` |
| A click, typing, a key | `await userEvent.click(el)`, `await userEvent.type(el, 'text')`, `await userEvent.keyboard('{Escape}')` |
| A choice in a `<select>` | `await userEvent.selectOptions(select, 'Price, low to high')` |

Prefer role and label queries; they fail when the page is not accessible, which is a bug worth
knowing about. `getByTestId` is for the cases in `docs/testid-conventions.md`.

Useful checks from jest-dom: `toBeVisible`, `toBeDisabled`, `toHaveFocus`, `toHaveValue`,
`toHaveTextContent` (a string matches anywhere in the text; use `/^...$/` for all of it),
`toHaveAccessibleDescription`, `toHaveAttribute`.

### Other kinds of component

Copy the nearest example from `src/examples/components/`:

| Your component | Example | What it shows |
|---|---|---|
| Loads data from an API | `product-list` | Faking the API with MSW; loading, empty, error with retry, loaded; a test data builder |
| Needs a provider (context, theme, store) | `cart` | `render(ui, { wrapper: Provider })`; `renderHook` with a wrapper; app-wide providers in `src/test/render.tsx` |
| A form that submits | `contact-form` | Invalid, submitting, success, server error, network error; checking what was sent |
| Reacts to typing over time, or changes the URL | `search-box` | Fake timers with `userEvent`; `mockRouter` and `mockUrl` |
| A small shared UI piece | `ui/button` | Props reaching the DOM; disabled and busy states |

The fake API in two lines, from `product-list.test.tsx`:

```ts
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';

server.use(http.get('/api/products', () => HttpResponse.json([buildProduct({ name: 'Mug' })])));
```

A request the test did not fake fails the test. More in `docs/unit-testing-practices.md`
("Faking the API"), and the cases each kind of code must cover are under "Required tests, by
kind of code". When a test fails with an error you do not recognise, see
[`docs/troubleshooting.md`](docs/troubleshooting.md).

## Commands

```bash
npm run test:unit                    # one run, used by CI
npm run test:unit:watch              # reruns affected tests as you save
npx jest confirm-dialog              # one file (any part of the path works)
npx jest -t "minimum spend"          # tests whose name matches
npm run test:unit:coverage           # adds coverage/ (open coverage/lcov-report/index.html)
npm run check                        # lint + typecheck + unit, run before pushing
```

## How unit and end-to-end tests fit together

Inside the app:

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
   regression test. Reviewed like production code. `docs/new-project-checklist.md` (section 6)
   has a version to agree as a team and put on every story.
