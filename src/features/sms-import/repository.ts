import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { getDb } from '@/storage/db';
import { newId } from '@/utils/id';
import { parseSms, type ParsedTransaction } from './parsers';
import * as TransactionRepo from '@/features/transactions/repository';
import * as SmsServiceIos from '@/services/sms.ios';
// On Android, the runtime resolver picks sms.android.ts via the platform-aware
// `Platform.select` below. We import the iOS variant for typing only — actual
// runtime is loaded lazily.

export interface SmsParsedRow {
  id: string;
  smsMessageId: string;
  parsed: ParsedTransaction;
  status: 'pending' | 'accepted' | 'rejected';
  acceptedTransactionId: string | null;
  receivedAt: string;
  sender: string;
  body: string;
}

async function loadSmsService(): Promise<typeof SmsServiceIos> {
  if (Platform.OS === 'android') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/services/sms.android') as unknown as typeof SmsServiceIos;
  }
  return SmsServiceIos;
}

export async function isPlatformSupported(): Promise<boolean> {
  const svc = await loadSmsService();
  return svc.isSupported;
}

export async function requestPermission(): Promise<boolean> {
  const svc = await loadSmsService();
  return svc.requestPermission();
}

async function hashSms(sender: string, body: string, receivedAt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${sender}::${body}::${receivedAt}`,
  );
}

export async function importSinceDays(days: number): Promise<{
  scanned: number;
  parsed: number;
  newRows: number;
}> {
  const svc = await loadSmsService();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = await svc.listRecent(since);
  const db = await getDb();
  let parsedCount = 0;
  let newRows = 0;

  for (const rec of records) {
    const dedupe = await hashSms(rec.sender, rec.body, rec.receivedAt);
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM sms_messages WHERE dedupe_hash = ?',
      [dedupe],
    );
    if (existing) continue;

    const smsId = newId();
    await db.runAsync(
      `INSERT INTO sms_messages (id, sender, body, received_at, dedupe_hash, imported_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [smsId, rec.sender, rec.body, rec.receivedAt, dedupe, new Date().toISOString()],
    );

    const parsed = parseSms(rec.sender, rec.body);
    if (parsed) {
      parsedCount++;
      newRows++;
      await db.runAsync(
        `INSERT INTO sms_parsed (id, sms_message_id, parsed_json, status, created_at)
         VALUES (?, ?, ?, 'pending', ?)`,
        [newId(), smsId, JSON.stringify(parsed), new Date().toISOString()],
      );
    }
  }

  return { scanned: records.length, parsed: parsedCount, newRows };
}

export async function listPending(): Promise<SmsParsedRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    sms_message_id: string;
    parsed_json: string;
    status: 'pending' | 'accepted' | 'rejected';
    accepted_transaction_id: string | null;
    sender: string;
    body: string;
    received_at: string;
  }>(
    `SELECT p.id, p.sms_message_id, p.parsed_json, p.status, p.accepted_transaction_id,
            m.sender, m.body, m.received_at
     FROM sms_parsed p
     JOIN sms_messages m ON m.id = p.sms_message_id
     WHERE p.status = 'pending'
     ORDER BY m.received_at DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    smsMessageId: r.sms_message_id,
    parsed: JSON.parse(r.parsed_json) as ParsedTransaction,
    status: r.status,
    acceptedTransactionId: r.accepted_transaction_id,
    receivedAt: r.received_at,
    sender: r.sender,
    body: r.body,
  }));
}

export async function accept(parsedId: string, categoryId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    sms_message_id: string;
    parsed_json: string;
  }>('SELECT id, sms_message_id, parsed_json FROM sms_parsed WHERE id = ?', [parsedId]);
  if (!row) throw new Error('parsed row missing');
  const parsed = JSON.parse(row.parsed_json) as ParsedTransaction;

  const txn = await TransactionRepo.create({
    kind: parsed.kind,
    amountPaise: parsed.amountPaise,
    occurredAt: parsed.occurredAt ?? new Date().toISOString(),
    categoryId,
    paymentMode: parsed.paymentMode,
    merchant: parsed.merchant,
    notes: null,
    source: 'sms',
  });
  await db.runAsync(
    "UPDATE sms_parsed SET status = 'accepted', accepted_transaction_id = ? WHERE id = ?",
    [txn.id, parsedId],
  );
}

export async function reject(parsedId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE sms_parsed SET status = 'rejected' WHERE id = ?", [parsedId]);
}
