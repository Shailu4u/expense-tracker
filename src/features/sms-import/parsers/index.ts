// Pure-TS SMS parsers for major Indian banks and UPI apps.
// Each parser returns a normalized result or null. Easy to fixture-test.

export interface ParsedTransaction {
  amountPaise: number;
  kind: 'expense' | 'income';
  merchant: string | null;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'wallet';
  bankName: string;
  accountTail: string | null;
  occurredAt: string | null; // ISO if found in body
}

const RUPEE = /(?:Rs\.?|INR|₹)\s?/i;
const AMOUNT = /([0-9]{1,3}(?:[,0-9]{0,12})(?:\.[0-9]{1,2})?)/;
const ACCT_TAIL = /(?:a\/c|ac|acct|account)[^0-9]*(?:x{1,4}|\*{1,4})?(\d{3,6})/i;
const CARD_TAIL = /(?:card|crd)[^0-9]*(?:ending|no|x{1,4}|\*{1,4})?[^0-9]*(\d{4})/i;

function parseAmount(s: string): number | null {
  const cleaned = s.replace(/,/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function pickMerchant(body: string): string | null {
  // Common patterns: "to MERCHANT", "at MERCHANT", "VPA merchant@upi"
  const at = /(?:\bat\s+|\bto\s+)([A-Z][A-Z0-9 &._\-/]{2,40}?)(?:\s+on\b|\s+for\b|\s+via\b|\s+ref\b|\.|$)/i.exec(body);
  if (at?.[1]) return at[1].trim();
  const vpa = /([A-Za-z0-9._-]+@[A-Za-z]{2,12})/.exec(body);
  if (vpa?.[1]) return vpa[1];
  return null;
}

function pickAccountTail(body: string): string | null {
  return ACCT_TAIL.exec(body)?.[1] ?? CARD_TAIL.exec(body)?.[1] ?? null;
}

interface BankParser {
  bankName: string;
  senders: RegExp[];
  parse: (body: string) => Omit<ParsedTransaction, 'bankName'> | null;
}

function genericDebit(body: string, mode: ParsedTransaction['paymentMode']): Omit<ParsedTransaction, 'bankName'> | null {
  const amt = AMOUNT.exec(body)?.[1];
  if (!amt) return null;
  const amountPaise = parseAmount(amt);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: pickMerchant(body),
    paymentMode: mode,
    accountTail: pickAccountTail(body),
    occurredAt: null,
  };
}

function genericCredit(body: string, mode: ParsedTransaction['paymentMode']): Omit<ParsedTransaction, 'bankName'> | null {
  const amt = AMOUNT.exec(body)?.[1];
  if (!amt) return null;
  const amountPaise = parseAmount(amt);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'income',
    merchant: pickMerchant(body),
    paymentMode: mode,
    accountTail: pickAccountTail(body),
    occurredAt: null,
  };
}

const PARSERS: BankParser[] = [
  {
    bankName: 'HDFC',
    senders: [/HDFC/i, /HDFCBK/i, /HDFCBN/i],
    parse: (body) => {
      const debit = /(?:debited|paid|spent|sent|withdrawn)/i.test(body);
      const credit = /(?:credited|received|deposited)/i.test(body);
      if (!debit && !credit) return null;
      const mode: ParsedTransaction['paymentMode'] = /UPI/i.test(body) ? 'upi' : /card/i.test(body) ? 'card' : 'bank_transfer';
      return debit ? genericDebit(body, mode) : genericCredit(body, mode);
    },
  },
  {
    bankName: 'SBI',
    senders: [/SBI/i, /SBIBNK/i, /SBIINB/i, /SBIPSG/i, /SBIUPI/i],
    parse: (body) => {
      const debit = /(?:debited|withdrawn|paid|spent)/i.test(body);
      const credit = /(?:credited|received)/i.test(body);
      if (!debit && !credit) return null;
      const mode: ParsedTransaction['paymentMode'] = /UPI/i.test(body) ? 'upi' : /card/i.test(body) ? 'card' : 'bank_transfer';
      return debit ? genericDebit(body, mode) : genericCredit(body, mode);
    },
  },
  {
    bankName: 'ICICI',
    senders: [/ICICI/i, /ICICIB/i, /ICICIT/i, /ICICIBN/i],
    parse: (body) => {
      const debit = /(?:debited|paid|spent|sent)/i.test(body);
      const credit = /(?:credited|received)/i.test(body);
      if (!debit && !credit) return null;
      const mode: ParsedTransaction['paymentMode'] = /UPI/i.test(body) ? 'upi' : /card/i.test(body) ? 'card' : 'bank_transfer';
      return debit ? genericDebit(body, mode) : genericCredit(body, mode);
    },
  },
  {
    bankName: 'Axis',
    senders: [/AXIS/i, /AXISBK/i, /AXISBN/i],
    parse: (body) => {
      const debit = /(?:debited|paid|spent|sent)/i.test(body);
      const credit = /(?:credited|received)/i.test(body);
      if (!debit && !credit) return null;
      const mode: ParsedTransaction['paymentMode'] = /UPI/i.test(body) ? 'upi' : /card/i.test(body) ? 'card' : 'bank_transfer';
      return debit ? genericDebit(body, mode) : genericCredit(body, mode);
    },
  },
  {
    bankName: 'Kotak',
    senders: [/KOTAK/i, /KOTAKB/i, /KOTAKM/i],
    parse: (body) => {
      const debit = /(?:debited|paid|spent|sent)/i.test(body);
      const credit = /(?:credited|received)/i.test(body);
      if (!debit && !credit) return null;
      const mode: ParsedTransaction['paymentMode'] = /UPI/i.test(body) ? 'upi' : /card/i.test(body) ? 'card' : 'bank_transfer';
      return debit ? genericDebit(body, mode) : genericCredit(body, mode);
    },
  },
  {
    bankName: 'GooglePay',
    senders: [/GPAY/i, /GOOGLEPAY/i],
    parse: (body) => genericDebit(body, 'upi'),
  },
  {
    bankName: 'PhonePe',
    senders: [/PHONEPE/i, /PHNPAY/i],
    parse: (body) => genericDebit(body, 'upi'),
  },
  {
    bankName: 'Paytm',
    senders: [/PAYTM/i, /PAYTMB/i],
    parse: (body) => {
      const debit = /(?:debited|paid|spent)/i.test(body);
      const credit = /(?:credited|received)/i.test(body);
      const mode: ParsedTransaction['paymentMode'] = /wallet/i.test(body) ? 'wallet' : 'upi';
      if (debit) return genericDebit(body, mode);
      if (credit) return genericCredit(body, mode);
      return null;
    },
  },
  {
    bankName: 'BHIM',
    senders: [/BHIM/i, /NPCI/i],
    parse: (body) => genericDebit(body, 'upi'),
  },
];

export function parseSms(sender: string, body: string): ParsedTransaction | null {
  if (!RUPEE.test(body)) return null;
  for (const p of PARSERS) {
    if (p.senders.some((re) => re.test(sender))) {
      const r = p.parse(body);
      if (r) return { ...r, bankName: p.bankName };
    }
  }
  return null;
}
