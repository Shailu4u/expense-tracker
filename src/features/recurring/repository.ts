import { getDb } from '@/storage/db';
import { newId } from '@/utils/id';
import { addMonths, addWeeks, parseISO, formatISO, startOfDay } from 'date-fns';
import * as TransactionRepo from '@/features/transactions/repository';
import type { PaymentMode, TransactionKind } from '@/types';

export interface Recurring {
  id: string;
  kind: TransactionKind;
  amountPaise: number;
  categoryId: string;
  paymentMode: PaymentMode;
  cadence: 'monthly' | 'weekly' | 'custom';
  dayOfMonth: number | null;
  nextDue: string;
  reminderMinutesBefore: number | null;
  paused: boolean;
  templateMeta: { merchant?: string; notes?: string } | null;
}

export interface RecurringRun {
  id: string;
  recurringId: string;
  dueOn: string;
  status: 'pending' | 'paid' | 'skipped';
  transactionId: string | null;
}

interface DbRow {
  id: string;
  kind: TransactionKind;
  amount_paise: number;
  category_id: string;
  payment_mode: PaymentMode;
  cadence: 'monthly' | 'weekly' | 'custom';
  day_of_month: number | null;
  next_due: string;
  reminder_minutes_before: number | null;
  paused: number;
  template_meta: string | null;
}

function toModel(r: DbRow): Recurring {
  return {
    id: r.id,
    kind: r.kind,
    amountPaise: r.amount_paise,
    categoryId: r.category_id,
    paymentMode: r.payment_mode,
    cadence: r.cadence,
    dayOfMonth: r.day_of_month,
    nextDue: r.next_due,
    reminderMinutesBefore: r.reminder_minutes_before,
    paused: r.paused === 1,
    templateMeta: r.template_meta ? (JSON.parse(r.template_meta) as Recurring['templateMeta']) : null,
  };
}

export async function listAll(): Promise<Recurring[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DbRow>('SELECT * FROM recurring ORDER BY next_due ASC');
  return rows.map(toModel);
}

export async function findById(id: string): Promise<Recurring | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<DbRow>('SELECT * FROM recurring WHERE id = ?', [id]);
  return r ? toModel(r) : null;
}

export interface RecurringInput {
  kind: TransactionKind;
  amountPaise: number;
  categoryId: string;
  paymentMode: PaymentMode;
  cadence: 'monthly' | 'weekly' | 'custom';
  dayOfMonth?: number | null;
  nextDue: string;
  reminderMinutesBefore?: number | null;
  paused?: boolean;
  templateMeta?: { merchant?: string; notes?: string } | null;
}

export async function create(input: RecurringInput): Promise<Recurring> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO recurring
      (id, kind, amount_paise, category_id, payment_mode, cadence,
       day_of_month, next_due, reminder_minutes_before, paused, template_meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.kind,
      input.amountPaise,
      input.categoryId,
      input.paymentMode,
      input.cadence,
      input.dayOfMonth ?? null,
      input.nextDue,
      input.reminderMinutesBefore ?? null,
      input.paused ? 1 : 0,
      input.templateMeta ? JSON.stringify(input.templateMeta) : null,
    ],
  );
  const row = await findById(id);
  if (!row) throw new Error('create: missing');
  return row;
}

export async function update(id: string, patch: Partial<RecurringInput>): Promise<Recurring> {
  const db = await getDb();
  const map: Record<string, [string, (v: unknown) => string | number | null]> = {
    kind: ['kind', (v) => v as string],
    amountPaise: ['amount_paise', (v) => v as number],
    categoryId: ['category_id', (v) => v as string],
    paymentMode: ['payment_mode', (v) => v as string],
    cadence: ['cadence', (v) => v as string],
    dayOfMonth: ['day_of_month', (v) => (v as number | null) ?? null],
    nextDue: ['next_due', (v) => v as string],
    reminderMinutesBefore: ['reminder_minutes_before', (v) => (v as number | null) ?? null],
    paused: ['paused', (v) => (v ? 1 : 0)],
    templateMeta: ['template_meta', (v) => (v ? JSON.stringify(v) : null)],
  };
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [k, [col, conv]] of Object.entries(map)) {
    const v = (patch as Record<string, unknown>)[k];
    if (v !== undefined) {
      sets.push(`${col} = ?`);
      args.push(conv(v));
    }
  }
  if (sets.length === 0) {
    const cur = await findById(id);
    if (!cur) throw new Error('update: not found');
    return cur;
  }
  args.push(id);
  await db.runAsync(`UPDATE recurring SET ${sets.join(', ')} WHERE id = ?`, args);
  const row = await findById(id);
  if (!row) throw new Error('update: not found');
  return row;
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring WHERE id = ?', [id]);
}

export async function listDueRuns(): Promise<RecurringRun[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RecurringRun & { recurring_id: string; due_on: string; transaction_id: string | null }>(
    `SELECT id, recurring_id, due_on, status, transaction_id
     FROM recurring_runs
     WHERE status = 'pending'
     ORDER BY due_on ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    recurringId: r.recurring_id,
    dueOn: r.due_on,
    status: r.status,
    transactionId: r.transaction_id,
  }));
}

// On app open: for each active recurring, materialize a `pending` run for every
// next_due that's <= today, then advance next_due. Idempotent via the unique
// index on (recurring_id, due_on).
export async function sweepDue(): Promise<void> {
  const db = await getDb();
  const today = startOfDay(new Date());
  const all = await listAll();
  for (const r of all) {
    if (r.paused) continue;
    let next = parseISO(r.nextDue);
    while (next <= today) {
      const dueIso = formatISO(next, { representation: 'complete' });
      try {
        await db.runAsync(
          `INSERT INTO recurring_runs (id, recurring_id, due_on, status)
           VALUES (?, ?, ?, 'pending')`,
          [newId(), r.id, dueIso],
        );
      } catch {
        // unique constraint - already materialized
      }
      next = advance(next, r.cadence);
    }
    if (next.toISOString() !== r.nextDue) {
      await db.runAsync('UPDATE recurring SET next_due = ? WHERE id = ?', [
        next.toISOString(),
        r.id,
      ]);
    }
  }
}

function advance(d: Date, cadence: 'monthly' | 'weekly' | 'custom'): Date {
  if (cadence === 'weekly') return addWeeks(d, 1);
  return addMonths(d, 1);
}

export async function markPaid(runId: string): Promise<void> {
  const db = await getDb();
  const run = await db.getFirstAsync<{
    id: string;
    recurring_id: string;
    due_on: string;
    status: string;
  }>('SELECT * FROM recurring_runs WHERE id = ?', [runId]);
  if (!run) throw new Error('run not found');
  const recurring = await findById(run.recurring_id);
  if (!recurring) throw new Error('recurring missing');

  const txn = await TransactionRepo.create({
    kind: recurring.kind,
    amountPaise: recurring.amountPaise,
    occurredAt: new Date().toISOString(),
    categoryId: recurring.categoryId,
    paymentMode: recurring.paymentMode,
    merchant: recurring.templateMeta?.merchant ?? null,
    notes: recurring.templateMeta?.notes ?? null,
    source: 'recurring',
    recurringId: recurring.id,
  });

  await db.runAsync(
    "UPDATE recurring_runs SET status = 'paid', transaction_id = ? WHERE id = ?",
    [txn.id, runId],
  );
}

export async function skip(runId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE recurring_runs SET status = 'skipped' WHERE id = ?", [runId]);
}
