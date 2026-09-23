'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/examples/lib/format-price';

export type Product = { id: string; name: string; priceCents: number; inStock: boolean };

type State = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; products: Product[] };

/**
 * Loads products from the API and lists them. Four states to test: loading, error (with retry),
 * empty, and loaded; plus sorting. Tests fake the API with MSW, so this code runs its real
 * fetch and JSON parsing.
 */
export function ProductList({ endpoint = '/api/products' }: { endpoint?: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [sort, setSort] = useState<'name' | 'price'>('name');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false; // a response for an old request must not overwrite a newer one
    fetch(endpoint)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as Product[];
      })
      .then((products) => {
        if (!ignore) setState({ status: 'loaded', products });
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error' });
      });
    return () => {
      ignore = true;
    };
  }, [endpoint, attempt]);

  if (state.status === 'loading') return <p role="status">Loading products…</p>;

  if (state.status === 'error') {
    return (
      <div role="alert">
        <p>Could not load products.</p>
        <button
          type="button"
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (state.products.length === 0) return <p>No products yet.</p>;

  const products = [...state.products].sort((a, b) =>
    sort === 'price' ? a.priceCents - b.priceCents : a.name.localeCompare(b.name),
  );

  return (
    <section>
      <label>
        Sort by{' '}
        <select value={sort} onChange={(event) => setSort(event.target.value as 'name' | 'price')}>
          <option value="name">Name</option>
          <option value="price">Price, low to high</option>
        </select>
      </label>
      <ul aria-label="Products">
        {products.map((product) => (
          <li key={product.id}>
            <h3>{product.name}</h3>
            <p>{formatPrice(product.priceCents)}</p>
            {!product.inStock && <p>Out of stock</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
