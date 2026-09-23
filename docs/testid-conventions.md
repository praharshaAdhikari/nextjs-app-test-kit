# data-testid conventions

Tests should find elements the way a user does. A `data-testid` is the fallback for when
that isn't possible, not the default.

## Locator priority

1. `getByRole('button', { name: 'Submit order' })` for anything interactive or structural
2. `getByLabel('Email')` for form fields
3. `getByPlaceholder(...)`, `getByAltText(...)`, `getByTitle(...)`
4. `getByText(...)` for static content (use a regex, not exact copy, unless the copy is part of the requirement)
5. `getByTestId(...)` when none of the above is stable
6. CSS/XPath: only for things like `iframe` or `a[href]`, never for class names tied to styling

## When a testid is the right tool

| Situation | Example | Why |
|---|---|---|
| Container of a repeated component | `product-card`, `order-row`, `faq-item` | Lets tests scope: `getByTestId('product-card').filter({ hasText: 'Blue Hoodie' }).getByRole('button', { name: 'Add to cart' })` |
| Text is CMS-driven or changes often | `hero-cta`, `contact-success`, `promo-banner` | Copy edits shouldn't break tests |
| Wrapper with no semantic role | `modal-root`, `drawer`, `toast-region` | First ask whether it should have a role (`dialog`, `status`); if not, testid |
| Region to screenshot or mask in visual tests | `cookie-banner`, `live-chat`, `timestamp` | Stable handle for `mask: [...]` |
| Only other handle is a generated id/class | Radix, MUI, CSS Modules output | Generated names change every build |
| Multi-locale sites | any element whose name differs by language | Testids are locale-independent |
| Non-visual state a test needs to read | `data-testid="cart-count"` | Cleaner than parsing a badge |

## When a testid is the wrong tool

- A button, link or field with a clear label. The label is what the user relies on; test that.
- As a workaround for a missing accessible name. Icon-only button? Add `aria-label`. That fixes
  the test and an accessibility bug in one change.
- On every `div`. If you can't say why a test would need it, don't add it.
- On styling wrappers. Tests should not care about layout.

## Naming

- kebab-case, `[feature]-[element]-[type]`: `checkout-submit`, `nav-cart-link`, `hero-cta`
- Repeated items get a static testid plus a separate identity attribute:
  `data-testid="product-card" data-product-id="123"` (never `product-card-123`)
- No index numbers, no abbreviations, no styling words (`blue-button`)

## The contract with developers

- Testids are an API. Adding one is free. Renaming or removing one is a breaking change:
  list it in the PR description so whoever maintains the tests knows.
- Ship them to production. Don't strip them in the build; production smoke tests use them and
  the byte cost is negligible.
- Components must forward the attribute: spread `...rest` onto the root element so
  `<Button data-testid="checkout-submit" />` actually renders it.
- In the Next.js repo, keep a shared constants file so a rename is a refactor, not a search:

```ts
// src/test-ids.ts  (imported by both components and e2e tests)
export const TID = {
  checkoutSubmit: 'checkout-submit',
  productCard: 'product-card',
  contactSuccess: 'contact-success',
} as const;
```

```tsx
// component
<button data-testid={TID.checkoutSubmit} onClick={submit}>Place order</button>

// test
await page.getByTestId(TID.checkoutSubmit).click();
```

## Quick check before adding one

1. Does it have a role and a name a screen reader would announce? Use `getByRole`.
2. Is it a labelled field? Use `getByLabel`.
3. Is the text stable and part of the requirement? Use `getByText` with a regex.
4. Otherwise, add a testid following the naming above and mention it in the PR.
