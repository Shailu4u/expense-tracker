import * as Crypto from 'expo-crypto';

export function newId(): string {
  // Prefer Expo's UUID API when available.
  if (typeof (Crypto as { randomUUID?: () => string }).randomUUID === 'function') {
    return (Crypto as { randomUUID: () => string }).randomUUID();
  }

  // Web fallback for environments where Expo API is unavailable.
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // Last-resort RFC4122 v4 formatting from random bytes.
  const bytes = Crypto.getRandomBytes(16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
