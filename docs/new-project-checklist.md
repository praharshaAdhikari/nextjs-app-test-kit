# New project: day-one checklist

Do these in order, in the first two days, before any feature work. Each item is small; together
they mean quality is the default instead of a retrofit.

## 1. Scaffold

- [ ] `npx create-next-app@latest <name> --typescript --eslint --app --src-dir --import-alias "@/*"`
- [ ] Commit `.nvmrc` (Node 22) and use `npm ci` everywhere, never `npm install` in CI
- [ ] `tsconfig.json`: keep `"strict": true`; add `"noUncheckedIndexedAccess": true`
- [ ] Prettier, shared through the repo (`.prettierrc`); format on save in the editor

## 2. Unit tests (this kit)

- [ ] From the app root, run the setup script (see "Start testing in a new repo" in the kit README):
      `curl -fsSL https://raw.githubusercontent.com/praharshaAdhikari/nextjs-app-test-kit/main/setup.sh | bash -s -- --examples`
- [ ] `npm run check` passes; delete the example tests once you have real ones
- [ ] `npm run lint` fails on a literal `data-testid="x"` (try it)

## 3. End-to-end tests (Playwright)

- [ ] `npm init playwright@latest`: TypeScript, tests in `tests/`, no GitHub Actions workflow
      (`pr-checks.yml` below runs them). Jest already ignores `tests/`.
- [ ] In `playwright.config.ts`, keep the `chromium` project, set `use.baseURL` to
      `http://localhost:3000`, and add a `webServer`:
      `{ command: process.env.CI ? 'npm run start' : 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI }`
      (CI builds first, then tests the built app)
- [ ] Write the first three smoke tests for the pages that exist on day one, with `@smoke` in
      their names; use `TID` from `src/test-ids.ts` where a test needs a test id

## 4. CI

- [ ] Copy `.github/workflows/pr-checks.yml` from this kit: lint, typecheck and unit tests,
      then the Playwright `@smoke` tests against a build of the PR
- [ ] Add any build-time settings the app needs as repository Variables (see the comment in
      the workflow's `smoke` job); never production secrets
- [ ] Branch protection on `main`: require "Lint, typecheck, unit tests" and
      "Smoke tests (Chromium, PR build)"; require one review; no force pushes
- [ ] Open a throwaway PR to confirm both checks run and block on failure

## 5. ClickUp

- [ ] Connect the repo to the Space (App Center > GitHub) so branches and PRs with a task ID
      appear on the task
- [ ] Add the Definition of Done below to the stories as a checklist template

## 6. Team agreement (30-minute meeting)

- [ ] Walk through `docs/unit-testing-practices.md` and `docs/testid-conventions.md`
- [ ] Agree the Definition of Done. A starting point:
      - New code (util, hook, component, route handler, server action) ships with the tests
        listed for its kind in "Required tests, by kind of code"
      - A bug fix ships with a regression test that failed before the fix
      - PR checks are green; no merging on red "because it's flaky"
      - Any `data-testid` added, renamed or removed is listed in the PR description
      - Test code is reviewed like production code
- [ ] Agree the branch naming rule: `<type>/<task-id>-<short-title>`, where type is what the
      change adds (`feat`, `fix`, `chore`, ...), task-id is the ClickUp task ID, and short-title is
      a few words from the task name in kebab-case. Example: `feat/z8rcte9c5c-guest-account-claim`
- [ ] Decide who reviews test code (answer: the same people who review production code)

## 7. First feature

Build the first real feature with the full loop, deliberately slowly:
list the behaviours -> component with unit tests -> `data-testid` from `TID` only where the
conventions say so -> branch and PR named with the task ID -> green checks -> review -> smoke
test added. That one feature becomes the example everyone copies.
