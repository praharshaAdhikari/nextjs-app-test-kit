'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type CartValue = {
  items: string[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
};

const CartContext = createContext<CartValue | null>(null);

/** Holds the cart for everything inside it. Real apps often put this in the root layout. */
export function CartProvider({
  children,
  initialItems = [],
}: {
  children: ReactNode;
  initialItems?: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const add = (id: string) => setItems((current) => (current.includes(id) ? current : [...current, id]));
  const remove = (id: string) => setItems((current) => current.filter((item) => item !== id));
  return <CartContext.Provider value={{ items, add, remove }}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart must be used inside <CartProvider>');
  return cart;
}

/** These two components only work inside CartProvider: their tests must render one. */
export function AddToCartButton({ productId, name }: { productId: string; name: string }) {
  const { items, add } = useCart();
  const inCart = items.includes(productId);
  return (
    <button type="button" onClick={() => add(productId)} disabled={inCart}>
      {inCart ? `${name} is in your cart` : `Add ${name} to cart`}
    </button>
  );
}

export function CartCount() {
  const { items } = useCart();
  return (
    <p role="status" aria-label="Cart">
      {items.length} {items.length === 1 ? 'item' : 'items'}
    </p>
  );
}
