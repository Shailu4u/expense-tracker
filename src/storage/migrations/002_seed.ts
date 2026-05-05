import type { SQLiteDatabase } from 'expo-sqlite';
import { newId } from '@/utils/id';

interface SeedCategory {
  name: string;
  icon: string; // material-symbols-outlined name
  color: string; // hex token
  kind: 'expense' | 'income' | 'both';
}

// India-specific defaults. Colors picked from a curated subset that reads well
// on the warm-neutral surface; not raw palette values used elsewhere.
const DEFAULTS: SeedCategory[] = [
  { name: 'Rent',         icon: 'apartment',          color: '#7E57C2', kind: 'expense' },
  { name: 'Groceries',    icon: 'shopping_basket',    color: '#43A047', kind: 'expense' },
  { name: 'Fuel',         icon: 'local_gas_station',  color: '#E64A19', kind: 'expense' },
  { name: 'Recharge',     icon: 'sim_card',           color: '#1E88E5', kind: 'expense' },
  { name: 'EMI',          icon: 'account_balance',    color: '#5D4037', kind: 'expense' },
  { name: 'SIP',          icon: 'savings',            color: '#00897B', kind: 'expense' },
  { name: 'Maid Salary',  icon: 'cleaning_services',  color: '#8E24AA', kind: 'expense' },
  { name: 'Medicines',    icon: 'medication',         color: '#D81B60', kind: 'expense' },
  { name: 'Eating Out',   icon: 'restaurant',         color: '#F4511E', kind: 'expense' },
  { name: 'Travel',       icon: 'flight',             color: '#3949AB', kind: 'expense' },
  { name: 'Shopping',     icon: 'shopping_bag',       color: '#C2185B', kind: 'expense' },
  { name: 'Bills',        icon: 'receipt_long',       color: '#546E7A', kind: 'expense' },
  { name: 'Other',        icon: 'category',           color: '#6E7976', kind: 'expense' },
  { name: 'Salary',       icon: 'work',               color: '#2E7D32', kind: 'income' },
  { name: 'Refund',       icon: 'undo',               color: '#00695C', kind: 'income' },
  { name: 'Other Income', icon: 'paid',               color: '#1565C0', kind: 'income' },
];

export const seedDefaults = {
  version: 2,
  name: 'seed_default_categories',
  async up(db: SQLiteDatabase) {
    for (let i = 0; i < DEFAULTS.length; i++) {
      const c = DEFAULTS[i]!;
      await db.runAsync(
        `INSERT INTO categories (id, name, icon, color, kind, is_system, sort_order)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [newId(), c.name, c.icon, c.color, c.kind, i],
      );
    }
  },
};
