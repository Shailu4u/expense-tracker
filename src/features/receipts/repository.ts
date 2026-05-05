import { getDb } from '@/storage/db';
import { newId } from '@/utils/id';
import * as ReceiptsService from '@/services/receipts';

export interface Receipt {
  id: string;
  transactionId: string;
  fileUri: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string;
}

interface DbRow {
  id: string;
  transaction_id: string;
  file_uri: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  created_at: string;
}

function toModel(r: DbRow): Receipt {
  return {
    id: r.id,
    transactionId: r.transaction_id,
    fileUri: r.file_uri,
    width: r.width,
    height: r.height,
    bytes: r.bytes,
    createdAt: r.created_at,
  };
}

export async function listForTransaction(txnId: string): Promise<Receipt[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DbRow>(
    'SELECT * FROM receipts WHERE transaction_id = ? ORDER BY created_at DESC',
    [txnId],
  );
  return rows.map(toModel);
}

export async function listAll(): Promise<Receipt[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DbRow>('SELECT * FROM receipts ORDER BY created_at DESC');
  return rows.map(toModel);
}

export async function attach(
  transactionId: string,
  source: 'pick' | 'camera',
): Promise<Receipt | null> {
  const stored =
    source === 'pick'
      ? await ReceiptsService.pickAndStore(transactionId)
      : await ReceiptsService.captureAndStore(transactionId);
  if (!stored) return null;

  const db = await getDb();
  const id = newId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO receipts (id, transaction_id, file_uri, width, height, bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, transactionId, stored.uri, stored.width, stored.height, stored.bytes, createdAt],
  );
  return {
    id,
    transactionId,
    fileUri: stored.uri,
    width: stored.width,
    height: stored.height,
    bytes: stored.bytes,
    createdAt,
  };
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<DbRow>('SELECT * FROM receipts WHERE id = ?', [id]);
  if (!row) return;
  await ReceiptsService.deleteFile(row.file_uri);
  await db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
}
