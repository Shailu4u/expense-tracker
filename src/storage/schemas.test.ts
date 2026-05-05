import { TransactionInputSchema, CategoryInputSchema, BudgetInputSchema } from './schemas';

describe('zod schemas', () => {
  test('TransactionInput accepts valid input and rejects negatives', () => {
    expect(() =>
      TransactionInputSchema.parse({
        kind: 'expense',
        amountPaise: 12345,
        occurredAt: new Date().toISOString(),
        categoryId: 'cat-1',
        paymentMode: 'upi',
      }),
    ).not.toThrow();

    expect(() =>
      TransactionInputSchema.parse({
        kind: 'expense',
        amountPaise: -1,
        occurredAt: new Date().toISOString(),
        categoryId: 'cat-1',
        paymentMode: 'upi',
      }),
    ).toThrow();
  });

  test('CategoryInput requires hex color', () => {
    expect(() =>
      CategoryInputSchema.parse({ name: 'X', icon: 'star', color: 'red', kind: 'expense' }),
    ).toThrow();
    expect(() =>
      CategoryInputSchema.parse({ name: 'X', icon: 'star', color: '#abcdef', kind: 'expense' }),
    ).not.toThrow();
  });

  test('Budget input accepts overall and category scopes', () => {
    expect(() =>
      BudgetInputSchema.parse({
        scope: 'overall',
        period: 'monthly',
        amountPaise: 1000000,
        rollover: false,
        startsOn: '2026-05-01T00:00:00.000Z',
      }),
    ).not.toThrow();
    expect(() =>
      BudgetInputSchema.parse({
        scope: 'category',
        categoryId: 'cat-1',
        period: 'monthly',
        amountPaise: 100000,
        rollover: true,
        startsOn: '2026-05-01T00:00:00.000Z',
      }),
    ).not.toThrow();
  });
});
