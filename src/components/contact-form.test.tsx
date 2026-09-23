import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from './contact-form';
import { TID } from '@/test-ids';

/** Fills the form the way a user would. Shared helpers keep tests readable. */
async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('Name'), 'Ada Lovelace');
  await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
  await userEvent.type(screen.getByLabelText('Message'), 'I would like a quote for a new site.');
}

describe('ContactForm', () => {
  beforeEach(() => {
    // Mock at the network boundary only. Never mock validateContact or Button:
    // the test should prove the pieces work together.
    global.fetch = jest.fn();
  });

  it('shows one error per invalid field and does not submit', async () => {
    render(<ContactForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getAllByRole('alert')).toHaveLength(3);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(/valid email/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits valid input and shows the confirmation', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByTestId(TID.contactSuccess)).toBeVisible();
    expect(fetch).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('ada@example.com') }),
    );
  });

  it('shows an error message when the request fails', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByTestId(TID.contactSuccess)).not.toBeInTheDocument();
  });

  it('shows an error message when the network is unreachable', async () => {
    // fetch rejects (offline, DNS, CORS) rather than resolving with an error status.
    jest.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('shows a busy, disabled button while the request is in flight', async () => {
    const response = Promise.withResolvers<Response>();
    jest.mocked(fetch).mockReturnValue(response.promise);
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    const button = screen.getByRole('button', { name: 'Please wait' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    response.resolve(new Response(null, { status: 200 }));
    expect(await screen.findByTestId(TID.contactSuccess)).toBeVisible();
  });

  // Regression test (rule 10): name the bug, prove it stays fixed.
  it('sends one request when the button is double-clicked', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    render(<ContactForm />);

    await fillValidForm();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByTestId(TID.contactSuccess)).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
