import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { newId } from '@/utils/id';

const RECEIPTS_DIR = 'receipts';

async function ensureDir(): Promise<string> {
  const root = `${FileSystem.Paths.document.uri}${RECEIPTS_DIR}/`;
  const info = await FileSystem.getInfoAsync(root);
  if (!info.exists) await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  return root;
}

export async function pickAndStore(transactionId: string): Promise<{
  uri: string;
  width: number;
  height: number;
  bytes: number;
} | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.85,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  return await storeFromUri(transactionId, r.assets[0].uri);
}

export async function captureAndStore(transactionId: string): Promise<{
  uri: string;
  width: number;
  height: number;
  bytes: number;
} | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const r = await ImagePicker.launchCameraAsync({ quality: 0.85 });
  if (r.canceled || !r.assets?.[0]) return null;
  return await storeFromUri(transactionId, r.assets[0].uri);
}

async function storeFromUri(
  transactionId: string,
  uri: string,
): Promise<{ uri: string; width: number; height: number; bytes: number }> {
  const root = await ensureDir();
  const txnDir = `${root}${transactionId}/`;
  const info = await FileSystem.getInfoAsync(txnDir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(txnDir, { intermediates: true });

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  const fileName = `${newId()}.jpg`;
  const finalUri = `${txnDir}${fileName}`;
  await FileSystem.copyAsync({ from: manipulated.uri, to: finalUri });
  const fileInfo = await FileSystem.getInfoAsync(finalUri);
  return {
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
