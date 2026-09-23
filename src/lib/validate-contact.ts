export type ContactInput = { name: string; email: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an empty object when the input is valid. */
export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  if (input.name.trim().length < 2) errors.name = 'Please enter your name.';
  if (!EMAIL.test(input.email.trim())) errors.email = 'Please enter a valid email address.';
  if (input.message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';
  return errors;
}
