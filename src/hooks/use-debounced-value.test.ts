import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    // Time is a boundary: control it instead of waiting. jest.setup.ts restores real timers.
    jest.useFakeTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('shoes', 300));

    expect(result.current).toBe('shoes');
  });

  it('updates only after the value has been stable for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'sh' },
    });

    rerender({ value: 'shoes' });
    act(() => jest.advanceTimersByTime(299));
    expect(result.current).toBe('sh');

    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe('shoes');
  });

  it('restarts the delay on every change, so only the last value lands', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    });

    rerender({ value: 'b' });
    act(() => jest.advanceTimersByTime(200));
    rerender({ value: 'bo' });
    act(() => jest.advanceTimersByTime(200));

    expect(result.current).toBe('');
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe('bo');
  });
});
