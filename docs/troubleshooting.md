# Troubleshooting

The errors people hit most with this setup, each with its exact message, the cause, and the fix.
To find the one you have, search this page for part of the message.

## "Must use import to load ES Module" / "Cannot use import statement outside a module"

```
Must use import to load ES Module: .../node_modules/some-package/build/index.mjs
```

**Cause:** a package in `node_modules` ships only ES modules. Jest does not compile
`node_modules`, and cannot load such files as they are. It is common with newer packages, and
with the dependencies of libraries you did not change (MSW 2.15 pulled in three).

**Fix:** add the package name from the path to `esmPackages` at the top of `jest.config.mjs`:

```js
const esmPackages = ['rettime', 'until-async', '@open-draft/deferred-promise', 'some-package'];
```

Run again. Another package may fail next; add it too, until the test runs. Use the name as it
appears after `node_modules/`, including its scope (`@scope/name`).

If the path contains `/browser/` (for example `.../lib/browser/index.mjs`), the package is loading
its browser build. `jest.config.mjs` already sets `customExportConditions: ['']` to prefer Node
builds; check it is still there if you merged the config into an existing one.

## "Could not locate module @/... mapped as ..."

```
Could not locate module @/lib/mailer mapped as:
.../src/$1.
```

**Cause:** the file is not where the import says, or the `@/` alias points somewhere else.
Jest does not read `tsconfig.json`; `moduleNameMapper` in `jest.config.mjs` has its own copy.

**Fix:** check the file exists at `src/lib/mailer.ts`. If the app has no `src/` folder, or
another alias (`~/`, `@components/`), make `moduleNameMapper` match `"paths"` in
`tsconfig.json`. `jest.mock('@/...')` paths need fixing too, not only imports.

## "ReferenceError: Request is not defined" (or fetch, Response, TextEncoder)

```
ReferenceError: Request is not defined
```

**Cause:** the test runs in plain jsdom, which has no `fetch` API. Usually `testEnvironment` in
the Jest config is `'jsdom'` instead of the kit's environment, often after merging into an
existing config.

**Fix:** `testEnvironment: '<rootDir>/jest.environment.mjs'` in `jest.config.mjs`.

## "ReferenceError: document is not defined"

**Cause:** the test file starts with `@jest-environment node` (meant for route handlers and
server actions) but renders a component.

**Fix:** remove the docblock from component tests. Only server code runs in `node`.

## "[MSW] Error: intercepted a request without a matching request handler"

```
[MSW] Error: intercepted a request without a matching request handler:
  • GET /api/products
```

**Cause:** the code under test called an endpoint the test did not fake. This is on purpose:
the fake API fails loudly so no test reaches a real server.

**Fix:** add a handler in the test, before `render`:

```ts
server.use(http.get('/api/products', () => HttpResponse.json([])));
```

If the handler is there: check the method (`http.post` for a POST) and the path, and that the
test is not calling a different base URL.

## "An update to X inside a test was not wrapped in act(...)"

**Cause:** the test finished while the component was still updating, usually because a fetch
or timer resolved after the last assertion. The test may pass, but it is not testing what it
looks like it is.

**Fix:** wait for the end state before the test ends: `await screen.findBy...` for what appears
after loading, or `await waitForElementToBeRemoved(...)` for a spinner. Do not wrap things in
`act()` yourself to silence it; `render`, `userEvent` and `findBy*` already do that.

## "Unable to find role=..." / `findBy` times out

**Cause:** the element is not there, not there yet, or has a different role or name than the
query expects.

**Fix:**

1. Read the DOM the error prints below the message; Testing Library shows the whole page.
2. `screen.logTestingPlaygroundURL()` or `screen.debug()` in the test shows it at any point.
3. Check the accessible name: `getByRole('button', { name: 'Save' })` matches the label a
   screen reader reads, including `aria-label`, not the `id` or class.
4. For something that appears after a fetch or a timer, use `findBy*` (it waits), not `getBy*`.
5. With MSW, check the handler returns what the component expects, and handler order when
   using `{ once: true }` (see the practices doc, "Faking the API").

## "Exceeded timeout of 5000 ms for a test" with fake timers

**Cause:** the test uses `jest.useFakeTimers()` and `userEvent`. userEvent waits on timers
between keystrokes, and fake timers never move on their own.

**Fix:** create the user with the fake clock:

```ts
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
await user.type(input, 'boots');
```

## "No tests found, exiting with code 1"

**Cause:** there are no `*.test.ts(x)` files under `src/` yet, or `testMatch` does not match
where they are (tests in `__tests__/` without `.test` in the name, or no `src/` folder).

**Fix:** write the first test, or widen `testMatch` in `jest.config.mjs`.

## A test passes on its own but fails with the others

**Cause:** state leaking between tests: a `let` at the top of the file changed by one test,
a module-level cache, a timer or request still running when the next test starts.

**Fix:** set up everything a test needs inside it or in `beforeEach`. Run the file with
`npx jest path/to/file --runInBand` to see the order, and `--testNamePattern` to find the pair
that clashes. The kit already resets mocks, timers, env and MSW handlers after each test.

## An assertion passes when it should fail

- `toHaveTextContent('1 item')` also matches `"1 items"`: a string matches anywhere in the
  text. Use a regex for the whole text: `toHaveTextContent(/^1 item$/)`.
- `toHaveBeenCalled()` passes whatever the arguments were. Use `toHaveBeenCalledWith(...)`.
- `expect(el).toBeTruthy()` on a `getBy*` result always passes (`getBy*` throws if missing).
  Use `toBeVisible()`, or `queryBy*` plus `not.toBeInTheDocument()` for absence.

The general check: break the line the test is about and run it. If it still passes, the
assertion is too loose.
