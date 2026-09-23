import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders its label and calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Place order</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and announces busy while loading', () => {
    render(<Button loading>Place order</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent('Please wait');
  });

  it('forwards native attributes such as data-testid and type to the real element', () => {
    render(
      <Button data-testid="any-id" type="submit">
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(screen.getByTestId('any-id')).toBe(button);
    expect(button).toHaveAttribute('type', 'submit');
  });
});
