import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockRouter, mockUrl } from '@/test/navigation';
import { SearchBox } from './search-box';

describe('SearchBox', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  /** With fake timers, userEvent must be told how to move time or it waits forever. */
  function setup() {
    return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  }

  it('updates the URL once the user stops typing', async () => {
    mockUrl('/products');
    const user = setup();
    render(<SearchBox delayMs={300} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'boots');
    expect(mockRouter.replace).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(300));
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/products?q=boots');
  });

  it('keeps other filters and goes back to page 1', async () => {
    mockUrl('/products?q=shoes&sort=price&page=3');
    const user = setup();
    render(<SearchBox />);
    const searchbox = screen.getByRole('searchbox', { name: 'Search products' });
    expect(searchbox).toHaveValue('shoes');

    await user.clear(searchbox);
    await user.type(searchbox, 'boots');
    act(() => jest.advanceTimersByTime(300));

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/products?q=boots&sort=price');
  });

  it('clears the search when Escape is pressed', async () => {
    mockUrl('/products?q=shoes');
    const user = setup();
    render(<SearchBox />);
    const searchbox = screen.getByRole('searchbox', { name: 'Search products' });

    await user.click(searchbox);
    await user.keyboard('{Escape}');
    act(() => jest.advanceTimersByTime(300));

    expect(searchbox).toHaveValue('');
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/products');
  });

  it('does not navigate when only surrounding whitespace changed', async () => {
    mockUrl('/products?q=shoes');
    const user = setup();
    render(<SearchBox />);

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '  ');
    act(() => jest.advanceTimersByTime(300));

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
