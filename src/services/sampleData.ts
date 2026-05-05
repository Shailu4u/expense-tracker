import { getDb } from '@/storage/db';
import * as TransactionRepo from '@/features/transactions/repository';
import * as CategoryRepo from '@/features/categories/repository';

const MERCHANTS = [
  ['BBMP', 'electricity'],
  ['BigBasket', 'groceries'],
  ['DMart', 'groceries'],
  ['Reliance Smart', 'groceries'],
  ['Indian Oil', 'fuel'],
  ['HP Petrol Pump', 'fuel'],
  ['Zomato', 'eating-out'],
  ['Swiggy', 'eating-out'],
  ['McDonalds', 'eating-out'],
  ['Domino\'s', 'eating-out'],
  ['Uber', 'travel'],
  ['Ola', 'travel'],
  ['IRCTC', 'travel'],
  ['Amazon', 'shopping'],
  ['Flipkart', 'shopping'],
  ['Myntra', 'shopping'],
  ['Apollo Pharmacy', 'medicines'],
  ['1mg', 'medicines'],
  ['Jio Recharge', 'recharge'],
  ['Airtel', 'recharge'],
  ['Netflix', 'bills'],
  ['Spotify', 'bills'],
  ['Landlord', 'rent'],
  ['HDFC EMI', 'emi'],
  ['SIP - HDFC MF', 'sip'],
  ['Maid', 'maid-salary'],
] as const;

const CATEGORY_NAME_BY_SLUG: Record<string, string> = {
  electricity: 'Bills',
  groceries: 'Groceries',
  fuel: 'Fuel',
  'eating-out': 'Eating Out',
  travel: 'Travel',
  shopping: 'Shopping',
  medicines: 'Medicines',
  recharge: 'Recharge',
  bills: 'Bills',
  rent: 'Rent',
  emi: 'EMI',
  sip: 'SIP',
  'maid-salary': 'Maid Salary',
};

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randAmount(min: number, max: number): number {
  const r = Math.floor(Math.random() * (max - min + 1)) + min;
  return r * 100; // paise
}

export async function insertSampleData(): Promise<{ inserted: number }> {
  const cats = await CategoryRepo.listAll();
  const byName = new Map(cats.map((c) => [c.name, c]));
  const salary = cats.find((c) => c.name === 'Salary');
  const refund = cats.find((c) => c.name === 'Refund');

  let inserted = 0;
  const now = new Date();

  // 200 expense rows over the last 90 days.
  for (let i = 0; i < 200; i++) {
    const [merchant, slug] = rand(MERCHANTS);
    const catName = CATEGORY_NAME_BY_SLUG[slug] ?? 'Other';
    const cat = byName.get(catName);
    if (!cat) continue;
    const daysAgo = Math.floor(Math.random() * 90);
    const occurredAt = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000 - Math.floor(Math.random() * 86400000));
    const amount = slug === 'rent' || slug === 'emi'
      ? randAmount(15000, 30000)
      : slug === 'sip'
        ? randAmount(2000, 10000)
        : slug === 'groceries'
          ? randAmount(300, 3500)
          : slug === 'fuel'
            ? randAmount(500, 4000)
            : slug === 'eating-out'
              ? randAmount(150, 1200)
              : slug === 'travel'
                ? randAmount(100, 1500)
                : randAmount(99, 2500);
    await TransactionRepo.create({
      kind: 'expense',
      amountPaise: amount,
      occurredAt: occurredAt.toISOString(),
      categoryId: cat.id,
      paymentMode: rand(['upi', 'card', 'cash', 'bank_transfer'] as const),
      merchant,
      notes: null,
      source: 'manual',
    });
    inserted++;
  }

  // A handful of incomes
  if (salary) {
    for (let m = 0; m < 3; m++) {
      const occurredAt = new Date(now.getFullYear(), now.getMonth() - m, 1, 9, 0, 0);
      await TransactionRepo.create({
        kind: 'income',
        amountPaise: randAmount(60000, 120000),
        occurredAt: occurredAt.toISOString(),
        categoryId: salary.id,
        paymentMode: 'bank_transfer',
        merchant: 'Acme Corp Payroll',
        notes: null,
        source: 'manual',
      });
      inserted++;
    }
  }
  if (refund) {
    await TransactionRepo.create({
      kind: 'income',
      amountPaise: randAmount(200, 1500),
      occurredAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
      categoryId: refund.id,
      paymentMode: 'upi',
      merchant: 'Amazon Refund',
      notes: null,
      source: 'manual',
    });
    inserted++;
  }

  return { inserted };
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const tables = [
      'transaction_tags',
      'tags',
      'transactions',
      'budgets',
      'recurring_runs',
      'recurring',
      'receipts',
      'merchant_rules',
      'sms_parsed',
      'sms_messages',
    ];
    for (const t of tables) await db.execAsync(`DELETE FROM ${t}`);
  });
}
