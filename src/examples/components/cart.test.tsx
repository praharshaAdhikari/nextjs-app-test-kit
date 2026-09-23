import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AddToCartButton, CartCount, CartProvider, useCart } from './cart';

// A component that needs a provider is rendered inside one with the `wrapper` option.
// Providers every test needs (theme, i18n, query client) go in src/test/render.tsx instead,
// so tests import { render } from '@/test/render' and never think about them.

describe('AddToCartButton and CartCount', () => {
  it('adds a product and updates the count', async () => {
    render(
      <>
        <AddToCartButton productId="mug" name="Mug" />
        <CartCount />
      </>,
      { wrapper: CartProvider },
    );
    // A string matches anywhere in the text ('1 item' would pass for '1 items'); a regex with
    // ^ and $ checks the whole text.
    expect(screen.getByRole('status', { name: 'Cart' })).toHaveTextContent(/^0 items$/);

    await userEvent.click(screen.getByRole('button', { name: 'Add Mug to cart' }));

    expect(screen.getByRole('status', { name: 'Cart' })).toHaveTextContent(/^1 item$/);
    expect(screen.getByRole('button', { name: 'Mug is in your cart' })).toBeDisabled();
  });

  it('shows a product that is already in the cart as added', () => {
    // Pass props to the provider with a small wrapper component.
    function WithMugInCart({ children }: { children: ReactNode }) {
      return <CartProvider initialItems={['mug']}>{children}</CartProvider>;
    }

    render(<AddToCartButton productId="mug" name="Mug" />, { wrapper: WithMugInCart });

    expect(screen.getByRole('button', { name: 'Mug is in your cart' })).toBeDisabled();
  });
});

describe('useCart', () => {
  it('adds each product once and removes it', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => result.current.add('mug'));
    act(() => result.current.add('mug'));
    expect(result.current.items).toStrictEqual(['mug']);

    act(() => result.current.remove('mug'));
    expect(result.current.items).toStrictEqual([]);
  });

  it('explains the mistake when used outside CartProvider', () => {
    // React logs the thrown error before the test sees it; keep the output clean.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useCart())).toThrow('useCart must be used inside <CartProvider>');

    consoleError.mockRestore();
  });
});
