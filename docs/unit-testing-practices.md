# Unit testing practices (Next.js)

Short enough to read once, specific enough to review against. ESLint enforces the mechanical
parts; this document explains the judgement calls.

## Which test goes where

| Code | Test with | File |
|---|---|---|
| Pure functions: formatting, validation, pricing, dates, permissions | Jest | `x.test.ts` next to `x.ts` |
| Client components (`'use client'`) and custom hooks | Jest + Testing Library | `x.test.tsx` next to `x.tsx` |
| Synchronous Server Components (no `async`, no data fetching) | Jest + Testing Library | `x.test.tsx` |
| Server actions, route handlers (`app/api/**/route.ts`) | Jest (Node environment), call the function directly | `route.test.ts` |
| `async` Server Components, pages, layouts, middleware, real navigation | Playwright (Jest cannot render them) | `tests/**` |
| Visual regression, accessibility scans, cross-browser | Playwright | `tests/**` |

The shape to aim for is a lot of fast unit tests on logic and components, a small number of
Playwright journeys on the pages that make money, and nothing in between that needs a running
server. If a component is hard to unit test, that is usually a sign it mixes data fetching with
rendering; move the fetching into a `lib/` function and test that.

## The ten rules

1. **Test behaviour, not implementation.** Assert what the user sees or gets back. Never assert
   on state variables, that a child received a prop, or that an internal function was called.
2. **Query like a user.** Same priority as Playwright: `getByRole` > `getByLabelText` >
   `getByPlaceholderText` > `getByText` > `getByTestId`. No `container.querySelector`, no class
   names. If you cannot find an element by role or label, fix the markup (add a label, a role,
   an `aria-label`); that fixes accessibility at the same time.
3. **`userEvent`, not `fireEvent`, and always `await` it.** `userEvent.click` fires the same
   sequence of events a real click does. In a test with fake timers, create the user with
   `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })` (see "Time" below).
4. **`findBy*` after anything asynchronous.** Never `setTimeout` or arbitrary waits.
5. **Mock only at the boundary.** Network (MSW: `server.use(http.get(...))`, see "Faking the
   API" below), time (`jest.useFakeTimers()`), randomness, `next/navigation`, and
   infrastructure clients (database, payment SDK). Do not mock your own modules or child
   components; if you feel you need to, the component is doing too much.
6. **One behaviour per test, named as a sentence.** `it('shows an error when the email is
   invalid')`, not `it('works')`. Arrange, act, assert, with a blank line between each.
7. **No snapshot tests by default.** They fail on every change and nobody reads the diff.
   Assert the specific thing that matters.
8. **Tests are independent.** No shared mutable state, no order dependency. After every test,
   Testing Library unmounts and `jest.setup.ts` resets every mock (including a `mockReturnValue`
   a test set), restores real timers and restores `process.env`. Set up what a test needs
   inside that test or its `beforeEach`, never at module level with `let`.
9. **`data-testid` values come from `src/test-ids.ts`.** A string literal in JSX is a lint
   error. Add an entry only after the checklist in `docs/testid-conventions.md`.
10. **A bug fix ships with a test that failed before the fix.** Add a row to a table test or a
    new `it`, watch it fail, fix, watch it pass.

## Worth testing, not worth testing

Worth it: validation rules, formatting, calculations, conditional rendering, form flows
(valid, invalid, submitting, failed), error and empty states, keyboard interaction, custom hooks,
reducers, anything with an `if`.

Not worth it: styling and layout, static markup ("renders a heading"), third-party library
behaviour, pass-through components with no logic, framework glue (layouts, config files).
Pages are covered by Playwright; do not unit test them.

## Required tests, by kind of code

"Tests for its behaviours" is the Definition of Done; this is what it means per kind of code.
Each list is the minimum a reviewer can ask for, and each kind has a reference test in this
kit to copy.

**Pure function** (`format-price`, `validate-contact`)
- [ ] The happy path, with a realistic value
- [ ] Boundaries: zero, empty, negative, the exact limit and one past it
- [ ] Every rule that rejects input, one table row each, asserting *which* rule fired
- [ ] Invalid input (`NaN`, wrong type from an `any` boundary): throws or returns the documented value
- [ ] Normalisation the function promises (trimming, case) proved with messy input

**Custom hook** (`use-debounced-value`)
- [ ] The initial value/state on first render
- [ ] Each transition, driven by `rerender` with new props or by calling the returned functions inside `act`
- [ ] Cleanup: a timer, subscription or listener set up by the hook does not fire after the input changes or the hook unmounts

**Client component** (`button`, `search-box`)
- [ ] What it renders from props, found by role and accessible name
- [ ] Every interaction a user has: click, type, and the keys it handles (Enter, Escape, arrows)
- [ ] Every conditional branch the user can see: disabled, loading, empty, error
- [ ] Side effects at the boundary: the navigation call (`router.push/replace`) or callback prop, with the exact arguments

**Form** (`contact-form`): all five states, not just the happy path
- [ ] Invalid: one message per invalid field, linked to its input (`toHaveAccessibleDescription`), nothing sent
- [ ] Submitting: button busy and disabled while the request is in flight
- [ ] Success: confirmation shown, request sent with the right method, URL and body
- [ ] Server error: `fetch` resolves with a 4xx/5xx, and the message is shown
- [ ] Network error: `fetch` *rejects* (offline). This is a different code path from a 500

**Route handler** (`examples/api/contact/route`)
- [ ] One test per status code it can return, asserting status *and* body
- [ ] Hostile bodies: malformed JSON, `{}`, wrong types, `null`. Each is a 400, never a 500
- [ ] Nothing is sent or written when the request is rejected
- [ ] The downstream service failing maps to the documented status (e.g. 502)

**Server action** (`examples/actions/subscribe`)
- [ ] Success: the returned state *and* what was written, with normalised input
- [ ] Validation failure returns an error state and does not touch the database
- [ ] Idempotency or duplicate handling, if the action promises it
- [ ] The database failing returns a user-facing error state instead of throwing

**Bug fix**: whatever kind of code it is
- [ ] A test (or table row) that reproduces the report and failed before the fix, with a comment
      naming the bug or task. See "Regression tests" below

## Worked examples

Excerpts from the reference tests. The full files are in `src/`.

### A custom hook: `renderHook`, `rerender`, `act`

```ts
const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
  initialProps: { value: 'sh' },
});

rerender({ value: 'shoes' });
act(() => jest.advanceTimersByTime(299));
expect(result.current).toBe('sh');

act(() => jest.advanceTimersByTime(1));
expect(result.current).toBe('shoes');
```

Test the hook directly when it has logic of its own. When a hook is two lines of glue, test it
through the component that uses it instead.

### Time: fake timers with `userEvent`

Debounces, throttles, polling, toasts that disappear, "5 minutes ago": control the clock, never
wait on it. Three details make it work:

```ts
beforeEach(() => {
  jest.useFakeTimers();                   // real timers come back automatically after the test
});

it('updates the URL once the user stops typing', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime }); // 1. or it hangs
  render(<SearchBox delayMs={300} />);

  await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'boots');
  expect(mockRouter.replace).not.toHaveBeenCalled();                         // 2. before the delay

  act(() => jest.advanceTimersByTime(300));                                  // 3. inside act
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledWith('/products?q=boots');
});
```

For "today" and dates, use `jest.setSystemTime(new Date('2026-01-15T10:00:00Z'))` after
`jest.useFakeTimers()`, and put a timezone in the string.

### Navigation: assert on `mockRouter`, set the URL with `mockUrl`

`jest.setup.ts` mocks `next/navigation` so that `useRouter()` returns `mockRouter`, one object
that stays the same across renders like the real router. Assert on it; set the current URL with
`mockUrl`:

```ts
import { mockRouter, mockUrl } from '@/test/navigation';

it('keeps other filters and goes back to page 1', async () => {
  mockUrl('/products?q=shoes&sort=price&page=3');
  // ...render, clear, type 'boots', advance time...
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledWith('/products?q=boots&sort=price');
});
```

Assert the exact URL. `toHaveBeenCalled()` alone passes when the query string is wrong.

### A route handler: Node environment, hostile input as a table

```ts
/**
 * @jest-environment node
 */
import { sendEmail } from '@/examples/lib/mailer';
import { POST } from './route';

jest.mock('@/examples/lib/mailer'); // infrastructure only; validation runs for real

it.each([
  ['malformed JSON', '{"name":'],
  ['an empty object', {}],
  ['a non-string field', { ...valid, message: 42 }],
  ['null', null],
])('returns 400 for %s', async (_label, body) => {
  const res = await post(body);

  expect(res.status).toBe(400);
  expect(sendEmail).not.toHaveBeenCalled();
});
```

The `@jest-environment node` docblock (it must be the first comment in the file) runs server
code without jsdom: it is faster, and a test cannot pass by accident because `window` exists.

### A server action: mock the database module, assert what was written

```ts
jest.mock('@/examples/lib/db'); // every function becomes a jest.fn that returns undefined

it('stores a new subscriber with a normalised email', async () => {
  jest.mocked(db.subscriber.findByEmail).mockResolvedValue(null);

  const state = await subscribe(idle, form({ email: '  Ada@Example.COM ' }));

  expect(state.status).toBe('success');
  expect(db.subscriber.create).toHaveBeenCalledTimes(1);
  expect(db.subscriber.create).toHaveBeenCalledWith({ email: 'ada@example.com' });
});
```

Keep the real database client behind one module (`src/lib/db.ts` in your app) so there is exactly one thing
to mock. A server action that imports Prisma directly in five places is five mocks to maintain.

### Faking the API: MSW

`src/test/server.ts` is a fake API that `jest.setup.ts` starts before the tests and resets after
each one. A test says what each endpoint returns; the component's real `fetch`, status checks
and JSON parsing all run:

```ts
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';

server.use(http.get('/api/products', () => HttpResponse.json([buildProduct({ name: 'Mug' })])));
server.use(http.get('/api/products', () => HttpResponse.json({ message: 'Oops' }, { status: 500 })));
server.use(http.get('/api/products', () => HttpResponse.error())); // network down
```

- A request with no handler fails the test (`onUnhandledRequest: 'error'`), so nothing reaches a
  real server by accident.
- Give error responses a JSON body, like the real API. With an empty body, `response.json()`
  fails anyway and hides a missing `if (!response.ok)`.
- Handlers passed to one `server.use` call are tried in order: put a `{ once: true }` handler
  first to fail only the first request.
- To check what was sent, record it in the handler: `sent.push(await request.json())`.

### A form's in-flight state: control when the response arrives

```ts
const release = Promise.withResolvers<void>();
server.use(
  http.post('/api/contact', async () => {
    await release.promise; // the response waits until the test says so
    return new HttpResponse(null, { status: 200 });
  }),
);
// ...fill in and submit...

const button = await screen.findByRole('button', { name: 'Please wait' });
expect(button).toBeDisabled();

release.resolve();
expect(await screen.findByTestId(TID.contactSuccess)).toBeVisible();
```

Release the response before the test ends so the component can finish updating.

### Regression tests

The fix is not done until a test proves it stays fixed:

1. Write the test from the bug report, in the user's words: `it('sends one request when the
   button is double-clicked')`. For a validation or parsing bug, add a row to the existing table.
2. Run it and **watch it fail** for the reason in the report. A regression test that never failed
   proves nothing.
3. Fix the code and watch it pass. Leave a one-line comment naming the bug or ClickUp task
   (`// Regression: CU-abc123 double click sent two enquiries`).

## Reviewing a test

Test code is reviewed like production code. On a PR, check:

- [ ] The names read as a list of behaviours; the file's `it` names alone explain the feature
- [ ] Each required case for its kind of code (above) is present, or its absence is explained
- [ ] Queries are by role or label; any `getByTestId` uses `TID` and has a reason
- [ ] Mocks are only at a boundary (network via MSW, time, navigation, the database and email modules, SDKs)
- [ ] Assertions are specific: exact arguments, exact status, exact text or pattern. No
      `toBeTruthy()` on something that has a real value, no bare `toHaveBeenCalled()`
- [ ] No `waitFor` wrapping a `getBy*` (use `findBy*`), no `setTimeout`, no real waits
- [ ] Break the code on purpose (delete the line the test is about). The test should fail. If it
      doesn't, the test is not testing that line

## Next.js specifics

- **`next/navigation`** is mocked globally in `jest.setup.ts`. Assert on `mockRouter` and set
  the URL with `mockUrl` (see "Navigation" above):
  ```ts
  import { mockRouter } from '@/test/navigation';
  // ...act...
  expect(mockRouter.push).toHaveBeenCalledWith('/thank-you');
  ```
- **`next/link`** renders a plain `<a>` in jsdom; query it with `getByRole('link', { name })`.
- **`next/font`** is only used in layouts, which are not unit tested. If a component imports it,
  mock the module: `jest.mock('next/font/google', () => ({ Inter: () => ({ className: 'font' }) }))`.
- **Route handlers** are functions that take a `Request`. Start the test file with a
  `/** @jest-environment node */` docblock:
  ```ts
  import { POST } from '@/app/api/contact/route';
  const res = await POST(new Request('http://test/api/contact', { method: 'POST', body: JSON.stringify(input) }));
  expect(res.status).toBe(200);
  ```
- **Server actions** are async functions. Test them like functions; mock the database client at
  its module boundary (`jest.mock('@/lib/db')`), which is the allowed exception to rule 5.
- **Environment variables:** assign `process.env.NEXT_PUBLIC_API_URL = 'http://test'` inside
  the test; `jest.setup.ts` gives every test a fresh copy of `process.env` and restores it after.
  Read the variable when the function runs, not at module top level, or the test cannot change it.

## Jest specifics

The things that differ from the Jest you may know from other projects, all handled in the kit:

- **jsdom has no `fetch`.** Plain `jest-environment-jsdom` leaves out `fetch`, `Response`,
  `Request`, `TextEncoder` and friends. `jest.environment.mjs` copies them in from Node, and
  nothing else: `FormData` stays jsdom's so `new FormData(formElement)` keeps working.
- **Packages that ship only ES modules** fail to load ("Must use import to load ES Module").
  `jest.config.mjs` has an `esmPackages` list that Jest compiles; MSW's dependencies are in it.
  It also sets `customExportConditions: ['']` so packages load their Node builds rather than
  their browser builds. See `docs/troubleshooting.md`.
- **`jest.resetAllMocks()` removes default implementations,** including the ones in a
  `jest.mock` factory. That is why `jest.setup.ts` sets the `next/navigation` defaults in a
  `beforeEach`. Do the same for any shared mock with a default: create the `jest.fn()` in the
  factory, give it its return value in a `beforeEach`.
- **`jest.mock` is hoisted** above the imports. A factory can only use variables whose names start
  with `mock` (`mockRouter`). Keep factories small and set behaviour in the test.
- **`@/` imports** are mapped by `moduleNameMapper` in `jest.config.mjs`, not read from
  `tsconfig.json`. Add a line there when you add a path alias.
- **Matchers:** Jest has no `toHaveBeenCalledOnce`. Use `toHaveBeenCalledTimes(1)`, plus
  `toHaveBeenCalledWith(...)` for the arguments.

## Coverage

No threshold on day one. After the first month, set the current number as the floor in
`jest.config.mjs` (`coverageThreshold.global`) and only ever raise it. Track lines and branches;
branches is the honest one. Coverage is a map of what is untested, not a score to reach: 100%
on `format-price.ts` and 0% on the checkout reducer is a problem coverage-percentage hides.

## Speed

The full unit suite should run in under ten seconds locally. Use `npm run test:unit:watch` while
developing; it reruns only affected tests. If the suite passes thirty seconds, check `--maxWorkers` (CI runners
have few cores; `--maxWorkers=50%` is a good start) before splitting anything.

## Definition of Done additions

- A new utility, hook, component, route handler or server action ships with the tests listed
  for its kind under "Required tests, by kind of code".
- A bug fix ships with a regression test.
- Reviewers check the ten rules; the reference tests below show what "good" looks like.

## Reference tests in this repo

All in `src/examples/` (copied into an app with `setup.sh --examples`):

- `lib/format-price.test.ts`: pure function, four behaviours, one error case
- `lib/validate-contact.test.ts`: table test with `it.each`, one row per rule
- `lib/apply-coupon.test.ts`: boundaries on both sides of each limit, time passed in as a
  parameter (the function walkthrough in the README)
- `components/confirm-dialog.test.tsx`: role queries, keyboard, focus, a portal, a failing
  callback (the component walkthrough in the README)
- `components/product-list.test.tsx`: loading, empty, error with retry, loaded, sorting; MSW;
  a test data builder; `within()` per row
- `components/cart.test.tsx`: components and a hook that need a provider (`wrapper`)
- `components/contact-form.test.tsx`: all five form states against MSW, a response held in
  flight, a regression test, testid from `TID` for CMS-driven copy
- `components/ui/button.test.tsx`: role queries, `userEvent`, prop forwarding
- `components/search-box.test.tsx`: fake timers with `userEvent`, keyboard, navigation
  asserted with exact URLs, `mockUrl`
- `hooks/use-debounced-value.test.ts`: `renderHook`, `rerender`, fake timers
- `api/contact/route.test.ts`: route handler in the Node environment, hostile-input table,
  mailer mocked, `process.env` set per test
- `actions/subscribe.test.ts`: server action, the database module mocked, idempotency,
  infrastructure failure
