import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { getDb } from '@/storage/db';
import { newId } from '@/utils/id';
import { parseSms, type ParsedTransaction } from './parsers';
import * as TransactionRepo from '@/features/transactions/repository';
import * as SmsServiceIos from '@/services/sms.ios';
import type { SmsRecord } from '@/services/types';
// On Android, the runtime resolver picks sms.android.ts via the platform-aware
// `Platform.select` below. We import the iOS variant for typing only — actual
// runtime is loaded lazily.

export interface SmsParsedRow {
  id: string;
  smsMessageId: string;
  parsed: ParsedTransaction;
  status: 'pending' | 'accepted' | 'rejected';
  acceptedTransactionId: string | null;
  txnCategoryId: string | null;
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

export async function checkPermission(): Promise<boolean> {
  const svc = await loadSmsService();
  return svc.checkPermission();
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

type Db = Awaited<ReturnType<typeof getDb>>;

async function findDefaultCategoryId(
  kind: 'expense' | 'income',
  merchant: string | null,
  db: Db,
): Promise<string | null> {
  // 1. Learned rule: if the user has previously categorised this merchant,
  //    reuse it. Keeps SMS auto-imports aligned with the user's choices.
  if (merchant && merchant.trim()) {
    const rule = await db.getFirstAsync<{ id: string; kind: string }>(
      `SELECT c.id, c.kind FROM merchant_rules r
       JOIN categories c ON c.id = r.category_id AND c.hidden_at IS NULL
       WHERE r.merchant_pattern = ? LIMIT 1`,
      [merchant.trim().toLowerCase()],
    );
    if (rule && (rule.kind === kind || rule.kind === 'both')) return rule.id;
  }

  const targetName = kind === 'income' ? 'Other Income' : 'Other';
  const exact = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = ? AND hidden_at IS NULL LIMIT 1',
    [targetName],
  );
  if (exact) return exact.id;
  // Fallback: any visible category matching the kind.
  const fallback = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM categories
     WHERE hidden_at IS NULL AND (kind = ? OR kind = 'both')
     ORDER BY sort_order ASC LIMIT 1`,
    [kind],
  );
  return fallback?.id ?? null;
}

async function ingestRecord(
  rec: SmsRecord,
  db: Db,
): Promise<{ isNew: boolean; parsed: boolean }> {
  const dedupe = await hashSms(rec.sender, rec.body, rec.receivedAt);
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM sms_messages WHERE dedupe_hash = ?',
    [dedupe],
  );
  if (existing) return { isNew: false, parsed: false };

  const smsId = newId();
  await db.runAsync(
    `INSERT INTO sms_messages (id, sender, body, received_at, dedupe_hash, imported_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [smsId, rec.sender, rec.body, rec.receivedAt, dedupe, new Date().toISOString()],
  );

  const parsed = parseSms(rec.sender, rec.body);
  if (!parsed) return { isNew: true, parsed: false };

  // Auto-create the transaction with the default "Other" category. The user
  // can change the category or reject from the SMS Import screen — until then
  // the transaction is already live in the activity list.
  const defaultCategoryId = await findDefaultCategoryId(parsed.kind, parsed.merchant, db);
  let txnId: string | null = null;
  if (defaultCategoryId) {
    const txn = await TransactionRepo.create({
      kind: parsed.kind,
      amountPaise: parsed.amountPaise,
      occurredAt: parsed.occurredAt ?? new Date().toISOString(),
      categoryId: defaultCategoryId,
      paymentMode: parsed.paymentMode,
      merchant: parsed.merchant,
      notes: null,
      source: 'sms',
    });
    txnId = txn.id;
  }

  await db.runAsync(
    `INSERT INTO sms_parsed (id, sms_message_id, parsed_json, status, accepted_transaction_id, created_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
    [newId(), smsId, JSON.stringify(parsed), txnId, new Date().toISOString()],
  );
  return { isNew: true, parsed: true };
}

async function importSinceMs(sinceMs: number): Promise<{
  scanned: number;
  parsed: number;
  newRows: number;
}> {
  const svc = await loadSmsService();
  const records = await svc.listRecent(sinceMs);
  const db = await getDb();
  let parsedCount = 0;
  let newRows = 0;

  for (const rec of records) {
    const r = await ingestRecord(rec, db);
    if (r.isNew) newRows++;
    if (r.parsed) parsedCount++;
  }

  return { scanned: records.length, parsed: parsedCount, newRows };
}

export async function importSinceDays(days: number) {
  return importSinceMs(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getLastReceivedAtMs(): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ max_at: string | null }>(
    'SELECT MAX(received_at) AS max_at FROM sms_messages',
  );
  if (!row?.max_at) return null;
  const t = new Date(row.max_at).getTime();
  return Number.isFinite(t) ? t : null;
}

// Imports SMS received since the last one we've already ingested. The window
// expands automatically the longer the app is closed. A 1-hour buffer guards
// against clock skew between the SMS provider and the device clock; dedupe
// hashes protect against re-imports inside that buffer. When no SMS has been
// imported yet, falls back to `defaultDays`.
export async function importSinceLast(defaultDays = 30): Promise<{
  scanned: number;
  parsed: number;
  newRows: number;
  windowDays: number;
}> {
  const lastMs = await getLastReceivedAtMs();
  const now = Date.now();
  const BUFFER_MS = 60 * 60 * 1000;
  const sinceMs = lastMs !== null ? lastMs - BUFFER_MS : now - defaultDays * 24 * 60 * 60 * 1000;
  const result = await importSinceMs(sinceMs);
  return {
    ...result,
    windowDays: Math.max(1, Math.ceil((now - sinceMs) / (24 * 60 * 60 * 1000))),
  };
}

export async function ingestIncoming(
  rec: SmsRecord,
): Promise<{ isNew: boolean; parsed: boolean }> {
  const db = await getDb();
  return ingestRecord(rec, db);
}

export function subscribeIncoming(handler: (rec: SmsRecord) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  void loadSmsService().then((svc) => {
    if (cancelled) return;
    unsubscribe = svc.subscribeIncoming(handler);
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function listPending(): Promise<SmsParsedRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    sms_message_id: string;
    parsed_json: string;
    status: 'pending' | 'accepted' | 'rejected';
    accepted_transaction_id: string | null;
    txn_category_id: string | null;
    sender: string;
    body: string;
    received_at: string;
  }>(
    `SELECT p.id, p.sms_message_id, p.parsed_json, p.status, p.accepted_transaction_id,
            t.category_id AS txn_category_id,
            m.sender, m.body, m.received_at
     FROM sms_parsed p
     JOIN sms_messages m ON m.id = p.sms_message_id
     LEFT JOIN transactions t ON t.id = p.accepted_transaction_id AND t.deleted_at IS NULL
     WHERE p.status = 'pending'
     ORDER BY m.received_at DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    smsMessageId: r.sms_message_id,
    parsed: JSON.parse(r.parsed_json) as ParsedTransaction,
    status: r.status,
    acceptedTransactionId: r.accepted_transaction_id,
    txnCategoryId: r.txn_category_id,
    receivedAt: r.received_at,
    sender: r.sender,
    body: r.body,
  }));
}

export interface SmsSource {
  sender: string;
  body: string;
  receivedAt: string;
}

// Returns the SMS that produced this transaction (if any). Used by the
// transaction view/edit screens to show the raw source for context.
export async function findByTransactionId(txnId: string): Promise<SmsSource | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    sender: string;
    body: string;
    received_at: string;
  }>(
    `SELECT m.sender, m.body, m.received_at
     FROM sms_parsed p
     JOIN sms_messages m ON m.id = p.sms_message_id
     WHERE p.accepted_transaction_id = ?
     LIMIT 1`,
    [txnId],
  );
  if (!row) return null;
  return { sender: row.sender, body: row.body, receivedAt: row.received_at };
}

// The SMS transaction is auto-created on ingest with the default category;
// changing the category from the review screen updates the live transaction.
export async function updateCategory(parsedId: string, categoryId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ accepted_transaction_id: string | null }>(
    'SELECT accepted_transaction_id FROM sms_parsed WHERE id = ?',
    [parsedId],
  );
  if (!row?.accepted_transaction_id) return;
  await TransactionRepo.update(row.accepted_transaction_id, { categoryId });
}

// Rejecting an auto-accepted SMS soft-deletes the linked transaction so it
// disappears from the activity list, and marks the SMS as rejected so it
// won't reappear in the review list.
export async function reject(parsedId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ accepted_transaction_id: string | null }>(
    'SELECT accepted_transaction_id FROM sms_parsed WHERE id = ?',
    [parsedId],
  );
  if (row?.accepted_transaction_id) {
    await TransactionRepo.softDelete(row.accepted_transaction_id);
  }
  await db.runAsync("UPDATE sms_parsed SET status = 'rejected' WHERE id = ?", [parsedId]);
}
