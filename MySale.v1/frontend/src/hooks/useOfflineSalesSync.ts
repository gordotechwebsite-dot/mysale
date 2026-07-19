import { useEffect, useState } from 'react';
import { getPendingCount, syncPendingSales, PENDING_CHANGED_EVENT } from '../offline/sales';

interface OfflineSalesSync {
  pendingCount: number;
  syncing: boolean;
}

const SYNC_INTERVAL_MS = 30000;

export const useOfflineSalesSync = (): OfflineSalesSync => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const refreshCount = async () => {
      const count = await getPendingCount();
      if (!cancelled) setPendingCount(count);
    };

    const runSync = async () => {
      if (cancelled) return;
      const count = await getPendingCount();
      if (cancelled) return;
      setPendingCount(count);
      if (count === 0 || !navigator.onLine) return;
      setSyncing(true);
      try {
        await syncPendingSales();
      } finally {
        if (!cancelled) {
          setSyncing(false);
          await refreshCount();
        }
      }
    };

    refreshCount();
    runSync();

    const interval = window.setInterval(runSync, SYNC_INTERVAL_MS);
    window.addEventListener('online', runSync);
    window.addEventListener(PENDING_CHANGED_EVENT, refreshCount);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('online', runSync);
      window.removeEventListener(PENDING_CHANGED_EVENT, refreshCount);
    };
  }, []);

  return { pendingCount, syncing };
};
