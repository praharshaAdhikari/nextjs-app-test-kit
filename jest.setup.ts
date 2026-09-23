import '@testing-library/jest-dom';
import { useParams, useRouter } from 'next/navigation';
import { mockRouter, mockUrl } from '@/test/navigation';
import { server } from '@/test/server';

// App Router hooks throw when rendered outside Next.js, so they are mocked for every test.
// jest.mock is hoisted above the imports, so the imports above get the mocked versions.
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
  useParams: jest.fn(),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

const originalEnv = process.env;

// jsdom does not implement scrolling: without this, code that calls window.scrollTo (scroll
// locks in modals, "back to top") prints "Not implemented: window.scrollTo" in every test that
// reaches it. A jest.fn, so a test can check it: expect(window.scrollTo).toHaveBeenCalledWith(0, 0).
// Server tests (@jest-environment node) have no window.
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn();
}

// The fake API (src/test/server.ts). 'error' fails a test that calls an endpoint it did not mock.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

beforeEach(() => {
  // Defaults, set before every test because jest.resetAllMocks (below) removes them.
  // Like the real hooks, they return the same objects on every render, so effects that depend
  // on `router` or `searchParams` do not re-run just because the test re-rendered.
  // A test changes the URL with mockUrl('/products?q=shoes') and asserts on mockRouter.
  // Cast: the real router type gains fields between Next versions (Next 16 added bfcacheId).
  jest.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
  mockUrl('/');
  jest.mocked(useParams).mockReturnValue({});

  process.env = { ...originalEnv }; // tests may set process.env.X freely
});

// Testing Library unmounts rendered components after each test on its own (it registers
// an afterEach when it sees Jest's globals). This resets everything else so tests can't leak.
afterEach(() => {
  // resetAllMocks (not clearAllMocks): it also drops a mockReturnValue/mockResolvedValue set by a
  // test. It removes the defaults above too, which is why they are set in beforeEach.
  jest.resetAllMocks();
  jest.useRealTimers();
  server.resetHandlers();
  process.env = originalEnv;
});
