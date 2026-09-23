'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

/**
 * Keeps `?q=` in the URL in step with what the user types, once they pause.
 * Behaviours worth unit testing: the debounce, which other params survive, Escape to clear,
 * and not navigating when nothing changed. The router is the only thing mocked.
 */
export function SearchBox({ delayMs = 300 }: { delayMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const debounced = useDebouncedValue(query.trim(), delayMs);

  useEffect(() => {
    if (debounced === (searchParams.get('q') ?? '')) return;

    const params = new URLSearchParams(searchParams);
    if (debounced) params.set('q', debounced);
    else params.delete('q');
    params.delete('page'); // a new search starts on page 1

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [debounced, pathname, router, searchParams]);

  return (
    <div role="search">
      <label htmlFor="site-search">Search products</label>
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setQuery('');
        }}
      />
    </div>
  );
}
