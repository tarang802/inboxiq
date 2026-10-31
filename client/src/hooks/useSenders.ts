import { useCallback, useEffect, useState } from 'react';
import { listSenders, updateSenderStatus, type SenderParams } from '../lib/senders';
import type { SenderPage, SenderStatus } from '../lib/types';

const SEARCH_DELAY_MS = 300;

export const DEFAULT_PARAMS: SenderParams = {
  q: '',
  sort: 'clutter',
  order: 'desc',
  page: 1,
  pageSize: 25,
};

export function useSenders() {
  const [params, setParams] = useState<SenderParams>(DEFAULT_PARAMS);
  const [query, setQuery] = useState(params);
  const [data, setData] = useState<SenderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // wait for typing to pause before searching; other changes apply right away
  useEffect(() => {
    if (params.q === query.q) {
      setQuery(params);
      return;
    }
    const timer = setTimeout(() => setQuery(params), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [params, query.q]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    listSenders(query, controller.signal)
      .then((page) => {
        setData(page);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'could not load senders');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, version]);

  // any filter change goes back to page 1
  const update = useCallback((patch: Partial<SenderParams>) => {
    setParams((prev) => ({ ...prev, page: 1, ...patch }));
  }, []);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const setStatus = useCallback(
    async (id: string, status: Exclude<SenderStatus, 'UNSUBSCRIBED'>) => {
      const sender = await updateSenderStatus(id, status);
      setData(
        (prev) => prev && { ...prev, senders: prev.senders.map((s) => (s.id === id ? sender : s)) },
      );
    },
    [],
  );

  return { params, update, data, loading, error, reload, setStatus };
}
