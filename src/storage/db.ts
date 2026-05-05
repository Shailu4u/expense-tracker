import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

const DB_NAME = 'rupeesafe.db';

let _db: SQLiteDatabase | null = null;
let _readyPromise: Promise<SQLiteDatabase> | null = null;

async function open(): Promise<SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error(
      'SQLite is unavailable on web in this Expo SDK setup. Run RupeeSafe on Android/iOS (Dev Client) or add a web storage adapter.'
    );
  }

  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  return db;
}

export function getDb(): Promise<SQLiteDatabase> {
  if (_db) return Promise.resolve(_db);
  if (!_readyPromise) {
    _readyPromise = open().then((db) => {
      _db = db;
      return db;
    });
  }
  return _readyPromise;
}

// Test/dev-only: close + null the cached handle so a subsequent getDb() reopens.
export async function _resetDbForTests(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
  _readyPromise = null;
}
