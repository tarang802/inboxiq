import { useCallback, useEffect, useState } from 'react';
import { getSenderSummary } from '../lib/senders';
import type { SenderSummary } from '../lib/types';

export function useSenderSummary() {
  const [summary, setSummary] = useState<SenderSummary | null>(null);

  const reload = useCallback(async () => {
    try {
      setSummary(await getSenderSummary());
    } catch (err) {
      // the cards are a nice-to-have, the table shows the real error
      console.error(err);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { summary, reload };
}
