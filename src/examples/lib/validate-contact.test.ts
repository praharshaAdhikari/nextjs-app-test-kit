import { validateContact, type ContactInput } from './validate-contact';

const valid: ContactInput = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'I would like a quote for a new website.',
};

describe('validateContact', () => {
  it('accepts valid input', () => {
    expect(validateContact(valid)).toStrictEqual({});
  });

  // Table tests keep each rule visible on one line. Add a row when a bug is found.
  it.each<[string, Partial<ContactInput>, keyof ContactInput]>([
    ['empty name', { name: '' }, 'name'],
    ['one-character name', { name: 'A' }, 'name'],
    ['whitespace-only name', { name: '   ' }, 'name'],
    ['email without @', { email: 'ada.example.com' }, 'email'],
    ['email with spaces', { email: 'ada @example.com' }, 'email'],
    ['short message', { message: 'Hi' }, 'message'],
  ])('rejects %s', (_label, override, field) => {
    const errors = validateContact({ ...valid, ...override });
    expect(errors[field]).toBeTruthy();
    expect(Object.keys(errors)).toStrictEqual([field]);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(validateContact({ ...valid, email: '  ada@example.com  ' })).toStrictEqual({});
  });
});
