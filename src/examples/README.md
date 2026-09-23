# Examples

Reference tests from [nextjs-app-test-kit](https://github.com/praharshaAdhikari/nextjs-app-test-kit),
each next to the code it tests. Copy the one closest to what you are building. Nothing else in
the app imports this folder: delete it once you have tests of your own.

| Folder | Shows |
|---|---|
| `lib/` | Pure functions: boundaries, table tests, invalid input (`apply-coupon`, `format-price`, `validate-contact`) |
| `components/confirm-dialog` | A component test from scratch: role queries, keyboard, focus (the README walkthrough) |
| `components/product-list` | Loading, empty, error and loaded states against a fake API (MSW); `within()` per row |
| `components/cart` | Components that need a provider: the `wrapper` option, `renderHook` with context |
| `components/contact-form` | A form's five states: invalid, submitting, success, server error, network error |
| `components/search-box` | Fake timers with `userEvent`, navigation asserted with exact URLs |
| `components/ui/button` | Props reaching the DOM, disabled and busy states |
| `hooks/` | A custom hook with `renderHook`, `rerender` and fake timers |
| `api/contact` | A route handler in the Node environment, hostile request bodies |
| `actions/` | A server action with the database module mocked |
