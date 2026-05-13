import type { SQLiteDatabase } from 'expo-sqlite';
import { migration001 } from './001_init';
import { seedDefaults } from './002_seed';
import { fixSmsSchema } from './003_sms_schema';
import { fixReceiptsSchema } from './004_fix_receipts_schema';

interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS: Migration[] = [migration001, seedDefaults, fixSmsSchema, fixReceiptsSchema];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version ASC',
  );
  const appliedSet = new Set(applied.map((r) => r.version));

  for (const m of MIGRATIONS) {
    if (appliedSet.has(m.version)) continue;
    await db.withTransactionAsync(async () => {
      await m.up(db);
      await db.runAsync(
        'INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)',
        [m.version, m.name, new Date().toISOString()],
      );
    });
  }
}

export async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ v: number }>(
    'SELECT COALESCE(MAX(version), 0) AS v FROM _migrations',
  );
  return row?.v ?? 0;
}
