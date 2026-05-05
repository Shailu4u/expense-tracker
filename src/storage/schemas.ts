import { z } from 'zod';
import { PAYMENT_MODES } from '@/types';

export const TxnKind = z.enum(['expense', 'income']);
export const TxnSource = z.enum(['manual', 'sms', 'recurring']);
export const PaymentModeZ = z.enum(PAYMENT_MODES);
export const CategoryKindZ = z.enum(['expense', 'income', 'both']);

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid ISO date');

export const TransactionInputSchema = z.object({
  kind: TxnKind,
  amountPaise: z.number().int().nonnegative(),
  occurredAt: isoDate,
  categoryId: z.string().min(1),
  paymentMode: PaymentModeZ,
  merchant: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  source: TxnSource.default('manual'),
  recurringId: z.string().optional().nullable(),
  smsRef: z.string().optional().nullable(),
});
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export const TransactionUpdateSchema = TransactionInputSchema.partial();
export type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>;

export const CategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be #rrggbb'),
  kind: CategoryKindZ,
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

export const BudgetInputSchema = z.object({
  scope: z.enum(['overall', 'category']),
  categoryId: z.string().optional().nullable(),
  period: z.literal('monthly'),
  amountPaise: z.number().int().nonnegative(),
  rollover: z.boolean().default(false),
  startsOn: isoDate,
});
export type BudgetInput = z.infer<typeof BudgetInputSchema>;
