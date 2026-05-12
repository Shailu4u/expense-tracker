import { PermissionsAndroid } from 'react-native';
import type { SmsRecord } from './types';

export const isSupported = true;

// We import lazily so that the JS bundle still works in environments where
// the native module isn't linked yet (e.g. Expo Go). When the module is
// missing we surface a clear error to the user instead of crashing.
type SmsAndroidModule = {
  list: (
    filter: string,
    fail: (e: unknown) => void,
    success: (count: number, smsListJson: string) => void,
  ) => void;
};

function loadModule(): SmsAndroidModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-get-sms-android') as
      | SmsAndroidModule
      | { default: SmsAndroidModule };
    return 'list' in mod ? mod : (mod as { default: SmsAndroidModule }).default ?? null;
  } catch {
    return null;
  }
}

type IncomingSms = { originatingAddress: string; body: string; timestamp: number };
type SmsListenerSubscription = { remove: () => void };
type SmsListenerModule = {
  addListener: (handler: (m: IncomingSms) => void) => SmsListenerSubscription;
};

function loadListener(): SmsListenerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-android-sms-listener') as
      | SmsListenerModule
      | { default: SmsListenerModule };
    return 'addListener' in mod
      ? mod
      : (mod as { default: SmsListenerModule }).default ?? null;
  } catch {
    return null;
  }
}

export async function checkPermission(): Promise<boolean> {
  const READ = 'android.permission.READ_SMS' as Parameters<typeof PermissionsAndroid.check>[0];
  return PermissionsAndroid.check(READ);
}

export async function requestPermission(): Promise<boolean> {
  const READ = 'android.permission.READ_SMS' as Parameters<
    typeof PermissionsAndroid.requestMultiple
  >[0][number];
  const RECV = 'android.permission.RECEIVE_SMS' as Parameters<
    typeof PermissionsAndroid.requestMultiple
  >[0][number];
  const granted = await PermissionsAndroid.requestMultiple([READ, RECV]);
  return (
    granted[READ] === PermissionsAndroid.RESULTS.GRANTED &&
    granted[RECV] === PermissionsAndroid.RESULTS.GRANTED
  );
}

export function subscribeIncoming(handler: (rec: SmsRecord) => void): () => void {
  const mod = loadListener();
  if (!mod) return () => {};
  const sub = mod.addListener((m) => {
    handler({
      id: String(m.timestamp),
      sender: m.originatingAddress ?? '',
      body: m.body ?? '',
      receivedAt: new Date(m.timestamp).toISOString(),
    });
  });
  return () => sub.remove();
}

export async function listRecent(sinceMs: number): Promise<SmsRecord[]> {
  const mod = loadModule();
  if (!mod) throw new Error('SMS native module not available. Build a Dev Client.');
  return new Promise((resolve, reject) => {
    const filter = JSON.stringify({
      box: 'inbox',
      minDate: sinceMs,
      indexFrom: 0,
      maxCount: 200,
    });
    mod.list(
      filter,
      (e) => reject(new Error(typeof e === 'string' ? e : 'SMS read failed')),
      (_count, json) => {
        try {
          const arr = JSON.parse(json) as Array<{
            _id: number | string;
            address: string;
            body: string;
            date: number;
          }>;
          const records: SmsRecord[] = arr.map((m) => ({
            id: String(m._id),
            sender: m.address ?? '',
            body: m.body ?? '',
            receivedAt: new Date(m.date).toISOString(),
          }));
          resolve(records);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('SMS parse failed'));
        }
      },
    );
  });
}
