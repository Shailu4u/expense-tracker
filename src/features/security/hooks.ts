import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Settings from '@/features/settings/repository';
import { useLockStore } from './lockStore';
import { enableScreenCaptureBlock, disableScreenCaptureBlock } from '@/services/security';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: Settings.get,
    staleTime: 0,
  });
}

// Initialise lock store + AppState binding from persisted settings.
export function useInitLock() {
  const { data } = useSettings();
  const setConfigured = useLockStore((s) => s.setConfigured);
  const bindAppState = useLockStore((s) => s.bindAppState);
  const lock = useLockStore((s) => s.lock);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!data) return;
    const configured = data.lockKind !== 'none';
    setConfigured(configured, data.lockGraceSeconds);
    if (configured && !bootstrapped) {
      // Lock on app cold start.
      lock();
      void enableScreenCaptureBlock();
    } else if (!configured) {
      void disableScreenCaptureBlock();
    }
    setBootstrapped(true);
  }, [data, bootstrapped, lock, setConfigured]);

  useEffect(() => bindAppState(), [bindAppState]);

  return { ready: !!data, settings: data };
}
