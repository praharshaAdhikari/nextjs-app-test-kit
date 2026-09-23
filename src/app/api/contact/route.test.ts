/**
 * @jest-environment node
 */
// Server code runs in Node, not a browser: the node environment is faster and has no DOM to
// accidentally depend on.
import { sendEmail } from '@/lib/mailer';
import { POST } from './route';

// The mailer is infrastructure: mock the module, never validateContact or the handler itself.
jest.mock('@/lib/mailer');

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'I would like a quote.' };

function post(body: unknown) {
  return POST(
    new Request('http://test/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/contact', () => {
  it('sends the enquiry to the configured inbox and returns 200', async () => {
    process.env.CONTACT_INBOX = 'sales@example.com'; // jest.setup.ts restores env

    const res = await post(valid);

    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'sales@example.com', replyTo: 'ada@example.com' }),
    );
  });

  it('returns 400 with field errors for invalid input and sends nothing', async () => {
    const res = await post({ ...valid, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(await res.json()).toStrictEqual({ errors: { email: expect.any(String) } });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  // Regression: a body with missing fields crashed validateContact (500) instead of a 400.
  it.each([
    ['malformed JSON', '{"name":'],
    ['an empty object', {}],
    ['a non-string field', { ...valid, message: 42 }],
    ['null', null],
  ])('returns 400 for %s', async (_label, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns 502 when the mailer fails', async () => {
    jest.mocked(sendEmail).mockRejectedValue(new Error('provider down'));

    const res = await post(valid);

    expect(res.status).toBe(502);
  });
});
