import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '@/storage/db';
import * as TransactionRepo from '@/features/transactions/repository';
import { paiseToRupees } from '@/utils/money';

const BACKUP_VERSION = 1;

interface BackupShape {
  rupeesafe_backup_version: number;
  exportedAt: string;
  data: {
    categories: unknown[];
    transactions: unknown[];
    transaction_tags: unknown[];
    tags: unknown[];
    budgets: unknown[];
    recurring: unknown[];
    recurring_runs: unknown[];
    receipts: unknown[];
    merchant_rules: unknown[];
    sms_messages: unknown[];
    sms_parsed: unknown[];
    app_settings: unknown[];
  };
}

async function dumpTable(table: string): Promise<unknown[]> {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM ${table}`);
}

export async function exportBackup(): Promise<string> {
  const data = {
    categories: await dumpTable('categories'),
    transactions: await dumpTable('transactions'),
    transaction_tags: await dumpTable('transaction_tags'),
    tags: await dumpTable('tags'),
    budgets: await dumpTable('budgets'),
    recurring: await dumpTable('recurring'),
    recurring_runs: await dumpTable('recurring_runs'),
    receipts: await dumpTable('receipts'),
    merchant_rules: await dumpTable('merchant_rules'),
    sms_messages: await dumpTable('sms_messages'),
    sms_parsed: await dumpTable('sms_parsed'),
    app_settings: await dumpTable('app_settings'),
  };
  const payload: BackupShape = {
    rupeesafe_backup_version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };

  const fileName = `rupeesafe-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const path = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'application/json' });
  }
  return path;
}

interface RestoreResult {
  ok: boolean;
  reason?: string;
  rows?: number;
}

export async function pickAndRestore(): Promise<RestoreResult> {
  const r = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (r.canceled || !r.assets?.[0]) return { ok: false, reason: 'cancelled' };
  const text = await FileSystem.readAsStringAsync(r.assets[0].uri);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'Invalid JSON' };
  }
  if (!isBackupShape(parsed)) return { ok: false, reason: 'Not a RupeeSafe backup' };
  if (parsed.rupeesafe_backup_version !== BACKUP_VERSION) {
    return { ok: false, reason: `Unsupported backup version ${parsed.rupeesafe_backup_version}` };
  }

  const db = await getDb();
  let count = 0;
  await db.withTransactionAsync(async () => {
    const tables: (keyof BackupShape['data'])[] = [
      'transaction_tags',
      'tags',
      'transactions',
      'categories',
      'budgets',
      'recurring_runs',
      'recurring',
      'receipts',
      'merchant_rules',
      'sms_parsed',
      'sms_messages',
      'app_settings',
    ];
    for (const t of tables) await db.execAsync(`DELETE FROM ${t}`);
    const insertOrder: (keyof BackupShape['data'])[] = [
      'categories',
      'transactions',
      'tags',
      'transaction_tags',
      'budgets',
      'recurring',
      'recurring_runs',
      'receipts',
      'merchant_rules',
      'sms_messages',
      'sms_parsed',
      'app_settings',
    ];
    for (const t of insertOrder) {
      const rows = (parsed as BackupShape).data[t] as Record<string, unknown>[];
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(',');
        const values = cols.map((c) => row[c] as string | number | null);
        await db.runAsync(
          `INSERT OR REPLACE INTO ${t} (${cols.join(',')}) VALUES (${placeholders})`,
          values,
        );
        count++;
      }
    }
  });
  return { ok: true, rows: count };
}

function isBackupShape(x: unknown): x is BackupShape {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r['rupeesafe_backup_version'] === 'number' &&
    typeof r['exportedAt'] === 'string' &&
    !!r['data'] &&
    typeof r['data'] === 'object'
  );
}

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportTransactionsCsv(start: string, end: string): Promise<string> {
  const rows = await TransactionRepo.listInRange({ start, end, limit: 100000 });
  const header = [
    'id',
    'occurredAt',
    'kind',
    'amount',
    'categoryId',
    'paymentMode',
    'merchant',
    'notes',
    'source',
  ];
  const lines = [header.join(',')];
  for (const t of rows) {
    lines.push(
      [
        t.id,
        t.occurredAt,
        t.kind,
        paiseToRupees(t.amountPaise).toFixed(2),
        t.categoryId,
        t.paymentMode,
        t.merchant ?? '',
        t.notes ?? '',
        t.source,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  const fileName = `rupeesafe-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  const path = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, lines.join('\n'));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv' });
  }
  return path;
}
