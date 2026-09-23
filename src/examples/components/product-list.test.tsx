import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { ProductList, type Product } from './product-list';

// Test data: a builder gives every field a sensible default, so each test only states the
// fields it cares about.
function buildProduct(overrides: Partial<Product> = {}): Product {
  return { id: crypto.randomUUID(), name: 'Mug', priceCents: 1200, inStock: true, ...overrides };
}

/** Makes the fake API return these products. */
function givenProducts(products: Product[]) {
  server.use(http.get('/api/products', () => HttpResponse.json(products)));
}

/** The names in the list, top to bottom. */
async function productNames() {
  const rows = await screen.findAllByRole('listitem');
  return rows.map((row) => within(row).getByRole('heading').textContent);
}

describe('ProductList', () => {
  it('shows a loading message, then the products sorted by name', async () => {
    givenProducts([buildProduct({ name: 'Teapot' }), buildProduct({ name: 'Mug' })]);
    render(<ProductList />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading products');

    expect(await productNames()).toStrictEqual(['Mug', 'Teapot']);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows each product with its price and stock', async () => {
    givenProducts([buildProduct({ name: 'Teapot', priceCents: 3450, inStock: false })]);
    render(<ProductList />);

    // within() scopes queries to one row, so the price and stock are checked on this product.
    const row = await screen.findByRole('listitem');
    expect(within(row).getByRole('heading')).toHaveTextContent('Teapot');
    expect(within(row).getByText('$34.50')).toBeVisible();
    expect(within(row).getByText('Out of stock')).toBeVisible();
  });

  it('sorts by price when the user picks it', async () => {
    givenProducts([
      buildProduct({ name: 'Bowl', priceCents: 2500 }),
      buildProduct({ name: 'Cup', priceCents: 900 }),
    ]);
    render(<ProductList />);
    await screen.findAllByRole('listitem');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Price, low to high');

    expect(await productNames()).toStrictEqual(['Cup', 'Bowl']);
  });

  it('says so when there are no products', async () => {
    givenProducts([]);
    render(<ProductList />);

    expect(await screen.findByText('No products yet.')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows an error when the API fails, and loads again on retry', async () => {
    // Handlers are tried in order: the first request gets the 500, later ones the products.
    // The 500 has a JSON body, like most real APIs, so the code must check the status.
    server.use(
      http.get('/api/products', () => HttpResponse.json({ message: 'Internal error' }, { status: 500 }), {
        once: true,
      }),
      http.get('/api/products', () => HttpResponse.json([buildProduct({ name: 'Mug' })])),
    );
    render(<ProductList />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load products.');

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await productNames()).toStrictEqual(['Mug']);
  });

  it('shows an error when the network is down', async () => {
    server.use(http.get('/api/products', () => HttpResponse.error()));
    render(<ProductList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load products.');
  });
});
