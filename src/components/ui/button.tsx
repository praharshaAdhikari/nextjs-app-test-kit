import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
};

/**
 * Every shared component spreads `...rest` onto its root element. That is what makes
 * `<Button data-testid={TID.x} aria-label="...">` actually reach the DOM, for tests and
 * for assistive technology alike. A wrapper that swallows props is a wrapper nobody can test.
 */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      data-variant={variant}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? 'Please wait' : children}
    </button>
  );
}
