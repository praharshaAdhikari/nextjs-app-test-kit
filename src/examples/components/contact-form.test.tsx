import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { TID } from '@/test-ids';
import { ContactForm } from './contact-form';

/** Fills the form the way a user would. Shared helpers keep tests readable. */
async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('Name'), 'Ada Lovelace');
  await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
  await userEvent.type(screen.getByLabelText('Message'), 'I would like a quote for a new site.');
}

/**
 * Fakes POST /api/contact with MSW and records what the form sent. Only the network is faked:
 * validateContact and Button run for real, so the test proves the pieces work together.
 */
function givenContactApi(respond: () => Response | Promise<Response>) {
  const sent: unknown[] = [];
  server.use(
    http.post('/api/contact', async ({ request }) => {
      sent.push(await request.json());
      return respond();
    }),
  );
  return sent;
}

describe('ContactForm', () => {
  it('shows one error per invalid field and does not submit', async () => {
    const sent = givenContactApi(() => new HttpResponse(null, { status: 200 }));
    render(<ContactForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getAllByRole('alert')).toHaveLength(3);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(/valid email/i);
    expect(sent).toHaveLength(0);
  });

  it('submits valid input and shows the confirmation', async () => {
    const sent = givenContactApi(() => new HttpResponse(null, { status: 200 }));
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByTestId(TID.contactSuccess)).toBeVisible();
    expect(sent).toStrictEqual([
      { name: 'Ada Lovelace', email: 'ada@example.com', message: 'I would like a quote for a new site.' },
    ]);
  });

  it('shows an error message when the request fails', async () => {
    givenContactApi(() => new HttpResponse(null, { status: 500 }));
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByTestId(TID.contactSuccess)).not.toBeInTheDocument();
  });

  it('shows an error message when the network is unreachable', async () => {
    // fetch rejects (offline, DNS, CORS) rather than resolving with an error status.
    givenContactApi(() => HttpResponse.error());
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('shows a busy, disabled button while the request is in flight', async () => {
    const release = Promise.withResolvers<void>();
    givenContactApi(async () => {
      await release.promise; // the response waits until the test says so
      return new HttpResponse(null, { status: 200 });
    });
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    const button = await screen.findByRole('button', { name: 'Please wait' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    release.resolve();
    expect(await screen.findByTestId(TID.contactSuccess)).toBeVisible();
  });

  // Regression test (rule 10): name the bug, prove it stays fixed.
  it('sends one request when the button is double-clicked', async () => {
    const sent = givenContactApi(() => new HttpResponse(null, { status: 200 }));
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByTestId(TID.contactSuccess)).toBeVisible();
    expect(sent).toHaveLength(1);
  });
});
