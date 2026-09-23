'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/examples/components/ui/button';
import { validateContact, type ContactErrors } from '@/examples/lib/validate-contact';
import { TID } from '@/test-ids';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * A client component with three kinds of behaviour worth unit testing:
 * validation feedback, a successful submit, and a failed submit.
 * The network call is the only thing mocked in its tests.
 */
export function ContactForm({ endpoint = '/api/contact' }: { endpoint?: string }) {
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      message: String(data.get('message') ?? ''),
    };

    const nextErrors = validateContact(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus('submitting');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      setStatus(response.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    // This copy is CMS-editable in a real project, so the stable handle is a testid,
    // while role="status" makes screen readers announce it.
    return (
      <p role="status" data-testid={TID.contactSuccess}>
        Thanks, we will be in touch soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate data-testid={TID.contactForm}>
      <div>
        <label htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          name="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'contact-name-error' : undefined}
        />
        {errors.name && (
          <p id="contact-name-error" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'contact-email-error' : undefined}
        />
        {errors.email && (
          <p id="contact-email-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          name="message"
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
        />
        {errors.message && (
          <p id="contact-message-error" role="alert">
            {errors.message}
          </p>
        )}
      </div>

      {status === 'error' && <p role="alert">Something went wrong. Please try again.</p>}

      <Button type="submit" loading={status === 'submitting'}>
        Send message
      </Button>
    </form>
  );
}
