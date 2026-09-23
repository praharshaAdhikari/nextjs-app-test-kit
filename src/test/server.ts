import { setupServer } from 'msw/node';

/**
 * A fake API for tests (Mock Service Worker). Started and stopped in jest.setup.ts; each test
 * says what the API returns with server.use(...):
 *
 *   server.use(http.get('/api/products', () => HttpResponse.json([{ id: '1', name: 'Mug' }])));
 *
 * Handlers are reset after every test. A request with no handler fails the test, so a test
 * can never reach a real server by accident.
 */
export const server = setupServer();
