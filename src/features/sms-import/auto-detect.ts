import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as SmsRepo from './repository';

export function useSmsAutoDetect() {
  const qc = useQueryClient();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let cancelled = false;
    let smsUnsub: (() => void) | null = null;

    async function silentScan() {
      try {
        const supported = await SmsRepo.isPlatformSupported();
        if (!supported || cancelled) return;
        const granted = await SmsRepo.checkPermission();
        if (!granted || cancelled) return;
        await SmsRepo.importSinceLast();
        if (cancelled) return;
        void qc.invalidateQueries({ queryKey: ['sms'] });
      } catch {
        // background scan — swallow errors silently
      }
    }

    function attachListener() {
      if (smsUnsub || cancelled) return;
      smsUnsub = SmsRepo.subscribeIncoming(async (rec) => {
        try {
          const { parsed } = await SmsRepo.ingestIncoming(rec);
          if (parsed) void qc.invalidateQueries({ queryKey: ['sms'] });
        } catch {
          // ignore individual ingest failures
        }
      });
    }

    async function bootstrap() {
      const granted = await SmsRepo.checkPermission();
      if (!granted || cancelled) return;
      attachListener();
    }

    void silentScan();
    void bootstrap();

    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void silentScan();
        void bootstrap();
      }
    });

    return () => {
      cancelled = true;
      appSub.remove();
      smsUnsub?.();
    };
  }, [qc]);
}
