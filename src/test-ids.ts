/**
 * Single source of truth for data-testid values.
 *
 * Imported by components AND by tests (Jest and Playwright), so renaming one is a
 * refactor that the compiler checks, not a search through every test.
 *
 * Before adding an entry, run the checklist in docs/testid-conventions.md:
 * role, label, text first. A testid is for containers of repeated items, CMS-driven copy,
 * regions to mask in visual tests, and elements with no stable accessible handle.
 *
 * ESLint blocks string literals in data-testid="..." so every value goes through here.
 */
export const TID = {
  // forms
  contactForm: 'contact-form',
  contactSuccess: 'contact-success',
  // marketing
  heroCta: 'hero-cta',
  cookieBanner: 'cookie-banner',
  liveChat: 'live-chat',
  // catalog
  productCard: 'product-card',
} as const;

export type TestId = (typeof TID)[keyof typeof TID];
