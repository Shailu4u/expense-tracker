// iOS no-op. SMS read is Android-only.
import type { SmsRecord } from './types';

export const isSupported = false;

export async function checkPermission(): Promise<boolean> {
  return false;
}

export async function requestPermission(): Promise<boolean> {
  return false;
}

export async function listRecent(_sinceMs: number): Promise<SmsRecord[]> {
  return [];
}

export function subscribeIncoming(_handler: (rec: SmsRecord) => void): () => void {
  return () => {};
}
