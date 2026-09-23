/**
 * Infrastructure boundary: the real implementation calls the email provider's SDK.
 * Code under test imports this module and tests replace it with jest.mock('@/examples/lib/mailer').
 */
export type Email = { to: string; replyTo: string; subject: string; text: string };

export const sendEmail: (email: Email) => Promise<void> = async () => {
  throw new Error('Mailer not configured: call your email provider here.');
};
