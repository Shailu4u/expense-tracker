export const PAYMENT_MODES = ['cash', 'upi', 'card', 'bank_transfer', 'wallet', 'other'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank',
  wallet: 'Wallet',
  other: 'Other',
};

export type TransactionKind = 'expense' | 'income';
export type TransactionSource = 'manual' | 'sms' | 'recurring';
export type CategoryKind = 'expense' | 'income' | 'both';
