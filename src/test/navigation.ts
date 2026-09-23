import type { ReadonlyURLSearchParams } from 'next/navigation';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * The router every mocked useRouter() returns (see jest.setup.ts). Assert on it directly:
 *   expect(mockRouter.push).toHaveBeenCalledWith('/thank-you');
 */
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
  refresh: jest.fn(),
};

/**
 * Points the mocked App Router hooks at a URL for the current test:
 *   mockUrl('/products?q=shoes&page=3');
 * The values stay the same across re-renders, like the real hooks. Reset after every test.
 */
export function mockUrl(url: string) {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  jest.mocked(usePathname).mockReturnValue(pathname);
  jest.mocked(useSearchParams).mockReturnValue(searchParams as unknown as ReadonlyURLSearchParams);
}
