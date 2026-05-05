import { getDb } from '@/storage/db';
import { newId } from '@/utils/id';
import { BudgetInputSchema, type BudgetInput } from '@/storage/schemas';

export interface Budget {
  id: string;
  scope: 'overall' | 'category';
  categoryId: string | null;
  period: 'monthly';
  amountPaise: number;
  rollover: boolean;
  startsOn: string;
}

interface DbBudgetRow {
  id: string;
  scope: 'overall' | 'category';
  category_id: string | null;
  period: 'monthly';
  amount_paise: number;
  rollover: number;
  starts_on: string;
}

function rowToModel(r: DbBudgetRow): Budget {
  return {
    id: r.id,
    scope: r.scope,
    categoryId: r.category_id,
    period: r.period,
    amountPaise: r.amount_paise,
    rollover: r.rollover === 1,
    startsOn: r.starts_on,
  };
}

export async function listForMonth(monthStartIso: string): Promise<Budget[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DbBudgetRow>(
    'SELECT * FROM budgets WHERE starts_on = ?',
    [monthStartIso],
  );
  return rows.map(rowToModel);
}

export async function upsert(input: BudgetInput): Promise<Budget> {
  const data = BudgetInputSchema.parse(input);
  const db = await getDb();
  // Unique indices ensure uniqueness per (starts_on) and (starts_on, category_id).
  const existing = await db.getFirstAsync<DbBudgetRow>(
    data.scope === 'overall'
      ? "SELECT * FROM budgets WHERE scope='overall' AND starts_on = ?"
      : "SELECT * FROM budgets WHERE scope='category' AND starts_on = ? AND category_id = ?",
    data.scope === 'overall' ? [data.startsOn] : [data.startsOn, data.categoryId ?? ''],
  );
  if (existing) {
    await db.runAsync(
      'UPDATE budgets SET amount_paise = ?, rollover = ? WHERE id = ?',
      [data.amountPaise, data.rollover ? 1 : 0, existing.id],
    );
    const r = await db.getFirstAsync<DbBudgetRow>('SELECT * FROM budgets WHERE id = ?', [
      existing.id,
    ]);
    return rowToModel(r!);
  }
  const id = newId();
  await db.runAsync(
    `INSERT INTO budgets (id, scope, category_id, period, amount_paise, rollover, starts_on)
     VALUES (?, ?, ?, 'monthly', ?, ?, ?)`,
    [
      id,
      data.scope,
      data.categoryId ?? null,
      data.amountPaise,
      data.rollover ? 1 : 0,
      data.startsOn,
    ],
  );
  const r = await db.getFirstAsync<DbBudgetRow>('SELECT * FROM budgets WHERE id = ?', [id]);
  return rowToModel(r!);
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}
