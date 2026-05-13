import type { SQLiteDatabase } from 'expo-sqlite';

export const fixReceiptsSchema = {
  version: 4,
  name: '004_fix_receipts_schema',
  async up(db: SQLiteDatabase) {
    await db.execAsync(`
      DROP TABLE IF EXISTS receipts;
      CREATE TABLE receipts (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        file_uri TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        bytes INTEGER,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_receipts_txn ON receipts(transaction_id);
    `);
  },
};
