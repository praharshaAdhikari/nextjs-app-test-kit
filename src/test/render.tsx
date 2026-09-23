import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/**
 * Wrap this in whatever providers your app needs (theme, i18n, query client).
 * Tests import { render } from '@/test/render' so nobody has to remember the providers.
 */
function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
