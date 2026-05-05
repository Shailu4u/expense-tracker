import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuth from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

const SALT_KEY = 'rupeesafe.lock.salt.v1';
const PIN_HASH_KEY = 'rupeesafe.lock.pinhash.v1';

async function getOrCreateSalt(): Promise<string> {
  const existing = await SecureStore.getItemAsync(SALT_KEY);
  if (existing) return existing;
  const random = await Crypto.getRandomBytesAsync(16);
  const hex = Array.from(random)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(SALT_KEY, hex);
  return hex;
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}::${pin}`);
}

export async function setPin(pin: string): Promise<void> {
  if (!/^[0-9]{4,8}$/.test(pin)) throw new Error('PIN must be 4–8 digits');
  const salt = await getOrCreateSalt();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!stored) return false;
  const salt = await getOrCreateSalt();
  const hash = await hashPin(pin, salt);
  return hash === stored;
}

export async function hasPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return !!stored;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
}

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  types: string[];
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const has = await LocalAuth.hasHardwareAsync();
  const enrolled = await LocalAuth.isEnrolledAsync();
  const types = await LocalAuth.supportedAuthenticationTypesAsync();
  const map: Record<number, string> = {
    [LocalAuth.AuthenticationType.FINGERPRINT]: 'fingerprint',
    [LocalAuth.AuthenticationType.FACIAL_RECOGNITION]: 'face',
    [LocalAuth.AuthenticationType.IRIS]: 'iris',
  };
  return {
    available: has,
    enrolled,
    types: types.map((t) => map[t] ?? 'other'),
  };
}

export async function authenticateBiometric(): Promise<boolean> {
  const r = await LocalAuth.authenticateAsync({
    promptMessage: 'Unlock RupeeSafe',
    cancelLabel: 'Use PIN',
    disableDeviceFallback: true,
  });
  return r.success;
}

export async function enableScreenCaptureBlock(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await ScreenCapture.preventScreenCaptureAsync();
    } catch {
      // best effort; not fatal
    }
  }
}

export async function disableScreenCaptureBlock(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await ScreenCapture.allowScreenCaptureAsync();
    } catch {
      // best effort
    }
  }
}
