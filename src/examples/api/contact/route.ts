import { sendEmail } from '@/examples/lib/mailer';
import { validateContact, type ContactInput } from '@/examples/lib/validate-contact';

/** Anything can arrive in a request body; only a full set of strings reaches validation. */
function parseContact(body: unknown): ContactInput | null {
  if (typeof body !== 'object' || body === null) return null;
  const { name, email, message } = body as Record<string, unknown>;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return null;
  }
  return { name, email, message };
}

export async function POST(request: Request) {
  const input = parseContact(await request.json().catch(() => null));
  if (!input) {
    return Response.json({ error: 'Expected name, email and message.' }, { status: 400 });
  }

  const errors = validateContact(input);
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  try {
    await sendEmail({
      to: process.env.CONTACT_INBOX ?? 'hello@example.com',
      replyTo: input.email.trim(),
      subject: `Website enquiry from ${input.name.trim()}`,
      text: input.message,
    });
  } catch {
    return Response.json({ error: 'Could not send your message.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
