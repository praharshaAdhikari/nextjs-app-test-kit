/**
 * @jest-environment node
 */
import { db } from '@/examples/lib/db';
import { subscribe } from './subscribe';

// The database is the one module we mock (rule 5's allowed exception). jest.mock with no factory
// replaces every function in it with a jest.fn that returns undefined.
jest.mock('@/examples/lib/db');

const idle = { status: 'idle' } as const;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe('subscribe', () => {
  it('stores a new subscriber with a normalised email', async () => {
    jest.mocked(db.subscriber.findByEmail).mockResolvedValue(null);

    const state = await subscribe(idle, form({ email: '  Ada@Example.COM ' }));

    expect(state.status).toBe('success');
    expect(db.subscriber.create).toHaveBeenCalledTimes(1);
    expect(db.subscriber.create).toHaveBeenCalledWith({ email: 'ada@example.com' });
  });

  it('succeeds without a duplicate row when the email is already subscribed', async () => {
    jest.mocked(db.subscriber.findByEmail).mockResolvedValue({ id: '1', email: 'ada@example.com' });

    const state = await subscribe(idle, form({ email: 'ada@example.com' }));

    expect(state.status).toBe('success');
    expect(db.subscriber.create).not.toHaveBeenCalled();
  });

  it.each([['missing', {}], ['blank', { email: '   ' }], ['invalid', { email: 'ada@' }]])(
    'rejects a %s email without touching the database',
    async (_label, fields) => {
      const state = await subscribe(idle, form(fields));

      expect(state).toStrictEqual({ status: 'error', message: expect.stringMatching(/valid email/) });
      expect(db.subscriber.findByEmail).not.toHaveBeenCalled();
    },
  );

  it('returns a friendly error when the database fails', async () => {
    jest.mocked(db.subscriber.findByEmail).mockRejectedValue(new Error('connection refused'));

    const state = await subscribe(idle, form({ email: 'ada@example.com' }));

    expect(state).toStrictEqual({ status: 'error', message: expect.stringMatching(/try again/) });
  });
});
