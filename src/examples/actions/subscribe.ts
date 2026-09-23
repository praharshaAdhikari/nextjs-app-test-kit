'use server';

import { db } from '@/examples/lib/db';

export type SubscribeState = { status: 'idle' | 'success' | 'error'; message?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Newsletter sign-up, shaped for useActionState(subscribe, { status: 'idle' }). */
export async function subscribe(
  _previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' };
  }

  try {
    // Signing up twice is not an error for the user; it just must not create a duplicate.
    const existing = await db.subscriber.findByEmail(email);
    if (!existing) await db.subscriber.create({ email });
  } catch {
    return { status: 'error', message: 'Could not subscribe right now. Please try again.' };
  }

  return { status: 'success', message: 'You are subscribed.' };
}
