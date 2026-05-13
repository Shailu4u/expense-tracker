import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { newId } from '@/utils/id';

const RECEIPTS_DIR = 'receipts';

export type ReceiptResult =
  | { kind: 'ok'; uri: string; width: number; height: number; bytes: number }
  | { kind: 'cancelled' }
  | { kind: 'permission-denied'; source: 'pick' | 'camera' };

async function ensureDir(): Promise<string> {
  const root = `${FileSystem.documentDirectory}${RECEIPTS_DIR}/`;
  const info = await FileSystem.getInfoAsync(root);
  if (!info.exists) await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  return root;
}

export async function pickAndStore(transactionId: string): Promise<ReceiptResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { kind: 'permission-denied', source: 'pick' };

  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  });
  if (r.canceled || !r.assets?.[0]) return { kind: 'cancelled' };
  return await storeFromUri(transactionId, r.assets[0].uri);
}

export async function captureAndStore(transactionId: string): Promise<ReceiptResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { kind: 'permission-denied', source: 'camera' };
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (r.canceled || !r.assets?.[0]) return { kind: 'cancelled' };
  return await storeFromUri(transactionId, r.assets[0].uri);
}

async function storeFromUri(transactionId: string, uri: string): Promise<ReceiptResult> {
  const root = await ensureDir();
  const txnDir = `${root}${transactionId}/`;
  const info = await FileSystem.getInfoAsync(txnDir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(txnDir, { intermediates: true });

  // SDK 54 class-based API. The legacy `manipulateAsync` is deprecated.
  const ctx = ImageManipulator.manipulate(uri);
  const rendered = await ctx.resize({ width: 1600 }).renderAsync();
  const manipulated = await rendered.saveAsync({
    compress: 0.7,
    format: SaveFormat.JPEG,
  });

  const fileName = `${newId()}.jpg`;
  const finalUri = `${txnDir}${fileName}`;
  await FileSystem.copyAsync({ from: manipulated.uri, to: finalUri });
  const fileInfo = await FileSystem.getInfoAsync(finalUri);
  return {
    kind: 'ok',
    uri: finalUri,
    width: manipulated.width,
    height: manipulated.height,
    bytes: 'size' in fileInfo && typeof fileInfo.size === 'number' ? fileInfo.size : 0,
  };
}

export async function deleteFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
