import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense','income','both')),
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden_at TEXT
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  occurred_at TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash','upi','card','bank_transfer','wallet')),
  merchant TEXT,
  notes TEXT,
  source TEXT NOT NULL CHECK (source IN ('manual','sms','recurring')) DEFAULT 'manual',
  recurring_id TEXT,
  sms_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at);
CREATE INDEX idx_transactions_category ON transactions(category_id, occurred_at);
CREATE INDEX idx_transactions_merchant ON transactions(merchant);
CREATE INDEX idx_transactions_deleted ON transactions(deleted_at);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE transaction_tags (
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('overall','category')),
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('monthly')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  rollover INTEGER NOT NULL DEFAULT 0,
  starts_on TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_budgets_overall ON budgets(starts_on) WHERE scope = 'overall';
CREATE UNIQUE INDEX idx_budgets_category ON budgets(starts_on, category_id) WHERE scope = 'category';

CREATE TABLE recurring (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash','upi','card','bank_transfer','wallet')),
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly','weekly','custom')),
  day_of_month INTEGER,
  next_due TEXT NOT NULL,
  reminder_minutes_before INTEGER,
  paused INTEGER NOT NULL DEFAULT 0,
  template_meta TEXT
);

CREATE TABLE recurring_runs (
  id TEXT PRIMARY KEY,
  recurring_id TEXT NOT NULL REFERENCES recurring(id) ON DELETE CASCADE,
  due_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','paid','skipped')) DEFAULT 'pending',
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX idx_recurring_runs_due ON recurring_runs(recurring_id, due_on);

CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  captured_at TEXT NOT NULL
);
CREATE INDEX idx_receipts_txn ON receipts(transaction_id);

CREATE TABLE merchant_rules (
  id TEXT PRIMARY KEY,
  merchant_pattern TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  hits INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE sms_messages (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at TEXT NOT NULL,
  parsed_status TEXT NOT NULL CHECK (parsed_status IN ('pending','parsed','rejected','imported')) DEFAULT 'pending',
  parser_id TEXT,
  hash_unique TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_sms_status ON sms_messages(parsed_status);

CREATE TABLE sms_parsed (
  sms_id TEXT PRIMARY KEY REFERENCES sms_messages(id) ON DELETE CASCADE,
  amount_paise INTEGER,
  kind TEXT CHECK (kind IN ('expense','income')),
  payment_mode TEXT,
  merchant TEXT,
  account_tail TEXT,
  balance_paise INTEGER,
  confidence REAL,
  suggested_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  month_start_day INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'INR',
  lock_kind TEXT NOT NULL DEFAULT 'none' CHECK (lock_kind IN ('none','pin','biometric','pin_or_biometric')),
  lock_grace_seconds INTEGER NOT NULL DEFAULT 60,
  theme TEXT NOT NULL DEFAULT 'light',
  sms_import_enabled INTEGER NOT NULL DEFAULT 0,
  onboarded_at TEXT
);
INSERT INTO app_settings (id) VALUES (1);

CREATE TABLE backup_manifest (
  id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  file_path TEXT NOT NULL,
  row_counts TEXT NOT NULL
);
`;

export const migration001 = {
  version: 1,
  name: 'init',
  async up(db: SQLiteDatabase) {
    await db.execAsync(SQL);
  },
};
