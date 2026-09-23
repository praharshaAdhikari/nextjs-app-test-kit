# New project: day-one checklist

Do these in order, in the first two days, before any feature work. Each item is small; together
they mean quality is the default instead of a retrofit.

## 1. Scaffold

- [ ] `npx create-next-app@latest <name> --typescript --eslint --app --src-dir --import-alias "@/*"`
- [ ] Commit `.nvmrc` (Node 22) and use `npm ci` everywhere, never `npm install` in CI
- [ ] `tsconfig.json`: keep `"strict": true`; add `"noUncheckedIndexedAccess": true`
- [ ] Prettier with the same `.prettierrc` as the QA repo; format on save in the editor

## 2. Unit tests (this kit)

- [ ] From the app root, run the setup script (see "Start testing in a new repo" in the kit README):
      `curl -fsSL https://raw.githubusercontent.com/praharshaAdhikari/nextjs-app-test-kit/main/setup.sh | bash -s -- --examples`
- [ ] `npm run check` passes; delete the example tests once you have real ones
- [ ] `npm run lint` fails on a literal `data-testid="x"` (try it)

## 3. End-to-end tests (QA pipeline starter)

- [ ] Copy `playwright.config.ts`, `tests/`, `fixtures/`, `pages/` from the QA starter
- [ ] In `playwright.config.ts`, enable `webServer` with
      `command: process.env.CI ? 'npm run start' : 'npm run dev'` (CI builds first)
- [ ] Write the first three `@smoke` tests for the pages that exist on day one

## 4. CI

- [ ] Copy `.github/workflows/pr-checks.yml` from this kit (it includes the unit test job)
- [ ] Copy `nightly.yml` and `prod-smoke.yml` from the QA starter
- [ ] Add repository Variables (`TEAM_SITE_STAGING_URL`, ...) and Secrets as described there
- [ ] Branch protection on `main`: require "Lint, typecheck, unit tests" and
      "Smoke tests (Chromium, PR build)"; require one review; no force pushes
- [ ] Open a throwaway PR to confirm both checks run and block on failure

## 5. ClickUp

- [ ] Connect the repo to the Space (App Center > GitHub)
- [ ] Create the project's sprint list with the statuses from `docs/clickup-setup.md`
- [ ] Apply the QA kickoff and Definition of Done checklist templates to the first stories
- [ ] Add the first journeys to the Automation backlog

## 6. Team agreement (30-minute meeting)

- [ ] Walk through `docs/unit-testing-practices.md` and `docs/testid-conventions.md`
- [ ] Agree the Definition of Done in `docs/team-practices.md`
- [ ] Agree the branch naming rule: `CU-<taskid>-short-description`
- [ ] Decide who reviews test code (answer: the same people who review production code)

## 7. First feature

Build the first real feature with the full loop, deliberately slowly:
QA kickoff checklist -> component with unit tests -> `data-testid` from `TID` where the
checklist says so -> PR with task ID -> green checks -> Ready for QA -> smoke test added.
That one feature becomes the example everyone copies.
