import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/storage/db';
import { newId } from '@/utils/id';
import { nowISO } from '@/utils/date';
import {
  TransactionInputSchema,
  TransactionUpdateSchema,
  type TransactionInput,
  type TransactionUpdate,
} from '@/storage/schemas';
import type { PaymentMode, TransactionKind, TransactionSource } from '@/types';

export interface TransactionRow {
  id: string;
  kind: TransactionKind;
  amountPaise: number;
  occurredAt: string;
  categoryId: string;
  paymentMode: PaymentMode;
  merchant: string | null;
  notes: string | null;
  source: TransactionSource;
  recurringId: string | null;
  smsRef: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface DbTransactionRow {
  id: string;
  kind: TransactionKind;
  amount_paise: number;
  occurred_at: string;
  category_id: string;
  payment_mode: PaymentMode;
  merchant: string | null;
  notes: string | null;
  source: TransactionSource;
  recurring_id: string | null;
  sms_ref: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToModel(r: DbTransactionRow): TransactionRow {
  return {
    id: r.id,
    kind: r.kind,
    amountPaise: r.amount_paise,
    occurredAt: r.occurred_at,
    categoryId: r.category_id,
    paymentMode: r.payment_mode,
    merchant: r.merchant,
    notes: r.notes,
    source: r.source,
    recurringId: r.recurring_id,
    smsRef: r.sms_ref,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

export async function create(input: TransactionInput): Promise<TransactionRow> {
  const data = TransactionInputSchema.parse(input);
  const db = await getDb();
  const id = newId();
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO transactions
       (id, kind, amount_paise, occurred_at, category_id, payment_mode,
        merchant, notes, source, recurring_id, sms_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.kind,
      data.amountPaise,
      data.occurredAt,
      data.categoryId,
      data.paymentMode,
      data.merchant ?? null,
      data.notes ?? null,
      data.source,
      data.recurringId ?? null,
      data.smsRef ?? null,
      now,
      now,
    ],
  );
  const row = await findById(id);
  if (!row) throw new Error('create: failed to read back row');
  return row;
}

export async function findById(id: string): Promise<TransactionRow | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<DbTransactionRow>(
    'SELECT * FROM transactions WHERE id = ?',
    [id],
  );
  return r ? rowToModel(r) : null;
}

interface ListByMonthOpts {
  start: string; // ISO inclusive
  end: string; // ISO inclusive
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
  categoryId?: string;
  paymentMode?: PaymentMode;
  kind?: TransactionKind;
  search?: string;
}

export async function listInRange(opts: ListByMonthOpts): Promise<TransactionRow[]> {
  const db = await getDb();
  const where: string[] = ['occurred_at >= ?', 'occurred_at <= ?'];
  const args: (string | number)[] = [opts.start, opts.end];
  if (!opts.includeDeleted) where.push('deleted_at IS NULL');
  if (opts.categoryId) {
    where.push('category_id = ?');
    args.push(opts.categoryId);
  }
  if (opts.paymentMode) {
    where.push('payment_mode = ?');
    args.push(opts.paymentMode);
  }
  if (opts.kind) {
    where.push('kind = ?');
    args.push(opts.kind);
  }
  if (opts.search?.trim()) {
    where.push('(merchant LIKE ? OR notes LIKE ?)');
    const q = `%${opts.search.trim()}%`;
    args.push(q, q);
  }
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  args.push(limit, offset);
  const rows = await db.getAllAsync<DbTransactionRow>(
    `SELECT * FROM transactions
     WHERE ${where.join(' AND ')}
     ORDER BY occurred_at DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    args,
  );
  return rows.map(rowToModel);
}

export async function update(id: string, patch: TransactionUpdate): Promise<TransactionRow> {
  const data = TransactionUpdateSchema.parse(patch);
  const db = await getDb();
  // Capture pre-update state so we can propagate using the old merchant value.
  const before = await findById(id);
  if (!before) throw new Error('update: row missing');

  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const map: Record<string, string> = {
    kind: 'kind',
    amountPaise: 'amount_paise',
    occurredAt: 'occurred_at',
    categoryId: 'category_id',
    paymentMode: 'payment_mode',
    merchant: 'merchant',
    notes: 'notes',
    source: 'source',
    recurringId: 'recurring_id',
    smsRef: 'sms_ref',
  };
  for (const [k, col] of Object.entries(map)) {
    const v = (data as Record<string, unknown>)[k];
    if (v !== undefined) {
      sets.push(`${col} = ?`);
      args.push(v as string | number | null);
    }
  }
  const now = nowISO();
  sets.push('updated_at = ?');
  args.push(now);
  args.push(id);

  const oldMerchant = before.merchant?.trim() ?? null;
  const categoryChanged = data.categoryId !== undefined && data.categoryId !== before.categoryId;
  const merchantChanged =
    data.merchant !== undefined && (data.merchant ?? null) !== (before.merchant ?? null);

  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`, args);

    // Propagate the category to every other live transaction with the same
    // merchant + kind. Case-insensitive so "ZOMATO" and "Zomato" align.
    if (categoryChanged && oldMerchant) {
      await db.runAsync(
        `UPDATE transactions
         SET category_id = ?, updated_at = ?
         WHERE LOWER(merchant) = LOWER(?)
           AND kind = ?
           AND id != ?
           AND deleted_at IS NULL`,
        [data.categoryId!, now, oldMerchant, before.kind, id],
      );

      // Remember the user's preference so future SMS auto-imports for this
      // merchant default to this category instead of "Other".
      await db.runAsync(
        `INSERT INTO merchant_rules (id, merchant_pattern, category_id, hits)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(merchant_pattern) DO UPDATE SET
           category_id = excluded.category_id,
           hits = merchant_rules.hits + 1`,
        [newId(), oldMerchant.toLowerCase(), data.categoryId!],
      );
    }

    // Propagate a merchant rename across every transaction that shared the
    // old name, regardless of kind — they all become consistent.
    if (merchantChanged && oldMerchant) {
      await db.runAsync(
        `UPDATE transactions
         SET merchant = ?, updated_at = ?
         WHERE LOWER(merchant) = LOWER(?)
           AND id != ?
           AND deleted_at IS NULL`,
        [data.merchant ?? null, now, oldMerchant, id],
      );
    }
  });

  const row = await findById(id);
  if (!row) throw new Error('update: row missing');
  return row;
}

export async function softDelete(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', [
    nowISO(),
    nowISO(),
    id,
  ]);
}

export async function restore(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET deleted_at = NULL, updated_at = ? WHERE id = ?', [
    nowISO(),
    id,
  ]);
}

export async function sumByMonth(
  start: string,
  end: string,
  kind: TransactionKind = 'expense',
): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount_paise), 0) AS total
     FROM transactions
     WHERE deleted_at IS NULL AND kind = ? AND occurred_at >= ? AND occurred_at <= ?`,
    [kind, start, end],
  );
  return r?.total ?? 0;
}

export async function sumByCategory(
  start: string,
  end: string,
): Promise<{ categoryId: string; totalPaise: number; count: number }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category_id: string; total: number; count: number }>(
    `SELECT category_id, SUM(amount_paise) AS total, COUNT(*) AS count
     FROM transactions
     WHERE deleted_at IS NULL AND kind = 'expense'
       AND occurred_at >= ? AND occurred_at <= ?
     GROUP BY category_id
     ORDER BY total DESC`,
    [start, end],
  );
  return rows.map((r) => ({ categoryId: r.category_id, totalPaise: r.total, count: r.count }));
}

export async function recentMerchants(limit = 10): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ merchant: string }>(
    `SELECT merchant FROM transactions
     WHERE deleted_at IS NULL AND merchant IS NOT NULL AND TRIM(merchant) <> ''
     GROUP BY merchant
     ORDER BY MAX(occurred_at) DESC
     LIMIT ?`,
    [limit],
  );
  return rows.map((r) => r.merchant);
}

export async function topMerchants(
  start: string,
  end: string,
  limit = 10,
): Promise<{ merchant: string; totalPaise: number; count: number }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ merchant: string; total: number; count: number }>(
    `SELECT merchant, SUM(amount_paise) AS total, COUNT(*) AS count
     FROM transactions
     WHERE deleted_at IS NULL AND kind='expense' AND merchant IS NOT NULL AND TRIM(merchant) <> ''
       AND occurred_at >= ? AND occurred_at <= ?
     GROUP BY merchant
     ORDER BY total DESC
     LIMIT ?`,
    [start, end, limit],
  );
  return rows.map((r) => ({ merchant: r.merchant, totalPaise: r.total, count: r.count }));
}

export async function monthlyTotals(
  monthsBack = 6,
): Promise<{ month: string; expensePaise: number; incomePaise: number }[]> {
  const db = await getDb();
  // strftime('%Y-%m', occurred_at) groups by month using ISO date string prefix.
  const rows = await db.getAllAsync<{ month: string; expense: number; income: number }>(
    `SELECT strftime('%Y-%m', occurred_at) AS month,
            SUM(CASE WHEN kind='expense' THEN amount_paise ELSE 0 END) AS expense,
            SUM(CASE WHEN kind='income' THEN amount_paise ELSE 0 END) AS income
     FROM transactions
     WHERE deleted_at IS NULL
       AND occurred_at >= date('now', ?)
     GROUP BY month
     ORDER BY month ASC`,
    [`-${monthsBack} months`],
  );
  return rows.map((r) => ({
    month: r.month,
    expensePaise: r.expense ?? 0,
    incomePaise: r.income ?? 0,
  }));
}

// Test/dev only: hard delete all rows.
export async function _truncateForTests(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM transactions');
}
