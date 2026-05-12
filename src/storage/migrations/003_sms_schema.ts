import type { SQLiteDatabase } from 'expo-sqlite';

export const fixSmsSchema = {
  version: 3,
  name: 'fix_sms_schema',
  async up(db: SQLiteDatabase) {
    await db.execAsync(`
      DROP TABLE IF EXISTS sms_parsed;
      DROP TABLE IF EXISTS sms_messages;

      CREATE TABLE sms_messages (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        body TEXT NOT NULL,
        received_at TEXT NOT NULL,
        dedupe_hash TEXT NOT NULL UNIQUE,
        imported_at TEXT NOT NULL
      );
      CREATE INDEX idx_sms_messages_received ON sms_messages(received_at);

      CREATE TABLE sms_parsed (
        id TEXT PRIMARY KEY,
        sms_message_id TEXT NOT NULL REFERENCES sms_messages(id) ON DELETE CASCADE,
        parsed_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending','accepted','rejected')) DEFAULT 'pending',
        accepted_transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_sms_parsed_status ON sms_parsed(status);
    `);
  },
};
