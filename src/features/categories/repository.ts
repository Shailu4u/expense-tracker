import { getDb } from '@/storage/db';
import { newId } from '@/utils/id';
import { CategoryInputSchema, type CategoryInput } from '@/storage/schemas';
import type { CategoryKind } from '@/types';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  parentId: string | null;
  isSystem: boolean;
  sortOrder: number;
  hiddenAt: string | null;
}

interface DbCategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  parent_id: string | null;
  is_system: number;
  sort_order: number;
  hidden_at: string | null;
}

function rowToModel(r: DbCategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    kind: r.kind,
    parentId: r.parent_id,
    isSystem: r.is_system === 1,
    sortOrder: r.sort_order,
    hiddenAt: r.hidden_at,
  };
}

export async function listAll(opts?: { includeHidden?: boolean }): Promise<Category[]> {
  const db = await getDb();
  const where = opts?.includeHidden ? '' : 'WHERE hidden_at IS NULL';
  const rows = await db.getAllAsync<DbCategoryRow>(
    `SELECT * FROM categories ${where} ORDER BY sort_order ASC, name ASC`,
  );
  return rows.map(rowToModel);
}

export async function listForKind(kind: 'expense' | 'income'): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DbCategoryRow>(
    `SELECT * FROM categories
     WHERE hidden_at IS NULL AND (kind = ? OR kind = 'both')
     ORDER BY sort_order ASC, name ASC`,
    [kind],
  );
  return rows.map(rowToModel);
}

export async function findById(id: string): Promise<Category | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<DbCategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
  return r ? rowToModel(r) : null;
}

export async function create(input: CategoryInput): Promise<Category> {
  const data = CategoryInputSchema.parse(input);
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, kind, parent_id, is_system, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, data.name, data.icon, data.color, data.kind, data.parentId ?? null, data.sortOrder],
  );
  const cat = await findById(id);
  if (!cat) throw new Error('create: category missing');
  return cat;
}

export async function update(id: string, patch: Partial<CategoryInput>): Promise<Category> {
  const data = CategoryInputSchema.partial().parse(patch);
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const map: Record<string, string> = {
    name: 'name',
    icon: 'icon',
    color: 'color',
    kind: 'kind',
    parentId: 'parent_id',
    sortOrder: 'sort_order',
  };
  for (const [k, col] of Object.entries(map)) {
    const v = (data as Record<string, unknown>)[k];
    if (v !== undefined) {
      sets.push(`${col} = ?`);
      args.push(v as string | number | null);
    }
  }
  if (sets.length === 0) {
    const cur = await findById(id);
    if (!cur) throw new Error('update: not found');
    return cur;
  }
  args.push(id);
  await db.runAsync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, args);
  const cat = await findById(id);
  if (!cat) throw new Error('update: missing');
  return cat;
}

export async function hide(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET hidden_at = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}

export async function unhide(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET hidden_at = NULL WHERE id = ?', [id]);
}

// Merge `fromId` into `intoId`: re-points all transactions/budgets/recurring,
// then deletes the source category. Atomic.
export async function merge(fromId: string, intoId: string): Promise<void> {
  if (fromId === intoId) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [
      intoId,
      fromId,
    ]);
    await db.runAsync('UPDATE recurring SET category_id = ? WHERE category_id = ?', [
      intoId,
      fromId,
    ]);
    await db.runAsync('UPDATE budgets SET category_id = ? WHERE category_id = ?', [
      intoId,
      fromId,
    ]);
    await db.runAsync('UPDATE merchant_rules SET category_id = ? WHERE category_id = ?', [
      intoId,
      fromId,
    ]);
    // Cannot delete a system category from this path.
    await db.runAsync('DELETE FROM categories WHERE id = ? AND is_system = 0', [fromId]);
    // If it was a system category, hide it instead so analytics don't show it.
    await db.runAsync(
      'UPDATE categories SET hidden_at = ? WHERE id = ? AND is_system = 1',
      [new Date().toISOString(), fromId],
    );
  });
}

export async function reorder(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [i, orderedIds[i]!]);
    }
  });
}
