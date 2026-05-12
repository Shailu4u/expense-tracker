// Indian SMS transaction parsers.
//
// Designed against a corpus of ~3,500 real bank/UPI/wallet SMS to balance
// recall (catch real transactions) with precision (reject OTPs, statements,
// marketing, scheduled-debit pre-notifications, etc.).
//
// Strategy:
//   1. Hard reject filter — kill obviously non-transactional messages even
//      if they mention an amount (OTPs are the largest false-positive class).
//   2. Service-level overrides — refunds from Swiggy/Flipkart/Zomato/Amazon.
//   3. Bank-specific shape parsers — match the actual SMS layout per bank.
//   4. Strict generic fallback — only fires if a rupee marker AND a
//      transactional keyword are both present.

export interface ParsedTransaction {
  amountPaise: number;
  kind: 'expense' | 'income';
  merchant: string | null;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'wallet';
  bankName: string;
  accountTail: string | null;
  occurredAt: string | null;
}

// Anchored amount: rupee marker must precede the digits, so account-suffix
// runs like "XX797" never get mistaken for the transacted amount. Supports
// Indian-style lakh grouping (1,00,000) and Western grouping (15,000.00).
const RUPEE_AMOUNT =
  /(?:Rs\.?|INR|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;

const ACCT_TAIL = /(?:a\/c|ac|acct|account)[^0-9]*(?:x{1,4}|\*{1,4})?(\d{3,6})/i;
const CARD_TAIL =
  /(?:card|crd)[^0-9]*(?:ending|no|x{1,4}|\*{1,4})?[^0-9]*(\d{4})/i;

function parseAmountStr(raw: string | undefined): number | null {
  if (raw == null) return null;
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function extractAmountPaise(body: string): number | null {
  const m = RUPEE_AMOUNT.exec(body);
  if (!m?.[1]) return null;
  return parseAmountStr(m[1]);
}

// =====================================================================
// Reject filter — messages that look transactional but aren't.
// =====================================================================

function isNonTransactional(body: string): boolean {
  // OTPs — the largest false-positive class. Many contain "txn of INR X
  // at MERCHANT" which trivially trips a naive parser.
  if (/\bOTP\b/i.test(body) || /One[- ]Time Password/i.test(body)) {
    if (
      /\bdo not (?:disclose|share)\b/i.test(body) ||
      /\bnever share\b/i.test(body) ||
      /\bvalid (?:till|for)\b/i.test(body) ||
      /\bbank never asks\b/i.test(body) ||
      /\bis (?:your |the )?OTP\b/i.test(body) ||
      /\bis One[- ]Time Password\b/i.test(body) ||
      /OTPs are SECRET/i.test(body)
    ) {
      return true;
    }
  }

  // Statements, dues, payment reminders
  if (/statement is sent/i.test(body)) return true;
  if (/pay (?:total|minimum) due/i.test(body)) return true;
  if (/total due of/i.test(body) && /due by/i.test(body)) return true;
  if (/minimum due/i.test(body) && /due by/i.test(body)) return true;
  if (/payment is due/i.test(body)) return true;

  // Pre-debit / scheduled notifications — the actual debit arrives separately
  if (/scheduled for (?:debit|auto-?debit)/i.test(body)) return true;
  if (/will be (?:auto-?debited|processed for ACH debit)/i.test(body)) return true;
  if (/is being processed for ACH debit/i.test(body)) return true;
  if (/INSTALLMENT of RS\.?\s*[0-9,.]+\s+NACH scheduled/i.test(body)) return true;

  // Policy/membership expiry reminders
  if (/(?:policy|premium|membership).*(?:will expire|expires on)/i.test(body)) {
    return true;
  }

  // Failed / declined / reversed
  if (/\b(?:failed|declined|cancelled|reversed|could not be processed|unsuccessful|denied)\b/i.test(body)) {
    return true;
  }

  // Marketing / offers
  if (
    /\b(?:pre-approved|offer of|missed call|EMI starting|interest from|interest @|rate of interest|apply now|click here.*apply)\b/i.test(body)
  ) {
    return true;
  }

  // Service availability alerts
  if (/(?:services? )?unavailable from/i.test(body)) return true;
  if (/click for alternative channels/i.test(body)) return true;

  // CC bill payment received notification — would double-count when the
  // corresponding bank-side debit also arrives.
  if (/payment of .*has been received on your .*credit card/i.test(body)) return true;

  // EPF passbook balance pings
  if (/passbook balance/i.test(body)) return true;

  // Account onboarding
  if (/account no .*is activated/i.test(body)) return true;

  // Mutual fund purchase confirmations — the matching bank debit lands
  // separately, so counting both would double up.
  if (/purchase in folio/i.test(body)) return true;
  if (/NAV of Rs/i.test(body)) return true;

  // Account balance pings without movement
  if (/^\s*Avl(?:\.|ailable)? bal/i.test(body)) return true;

  return false;
}

// =====================================================================
// Helpers
// =====================================================================

function cleanMerchant(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim().replace(/\s+/g, ' ');
  return trimmed.length === 0 ? null : trimmed;
}

// Many UPI debits expose opaque per-QR VPAs (paytmqr281005...@paytm,
// Q887835110@ybl). Normalise them so similar transactions group together.
function normalizeVpa(vpa: string | undefined | null): string {
  if (!vpa) return '';
  const v = vpa.trim();
  if (/^paytmqr.*@paytm$/i.test(v)) return 'Paytm Merchant';
  if (/^paytmqr.*@ptys$/i.test(v)) return 'Paytm Merchant';
  if (/^Q\d+@(?:ybl|ibl|axl)$/i.test(v)) return 'PhonePe / UPI Merchant';
  if (/^BHARATPE\.[A-Za-z0-9]+@unitype$/i.test(v)) return 'BharatPe Merchant';
  if (/@apl$/i.test(v)) return 'Amazon Pay Merchant';
  return v;
}

function pickMerchantFallback(body: string): string | null {
  const at = /(?:\bat\s+|\bto\s+)([A-Z][A-Z0-9 &._\-/]{2,40}?)(?:\s+on\b|\s+for\b|\s+via\b|\s+ref\b|\.|$)/i.exec(body);
  if (at?.[1]) return cleanMerchant(at[1]);
  const vpa = /([A-Za-z0-9._-]+@[A-Za-z]{2,12})/.exec(body);
  if (vpa?.[1]) return normalizeVpa(vpa[1]);
  return null;
}

function pickAccountTail(body: string): string | null {
  return ACCT_TAIL.exec(body)?.[1] ?? CARD_TAIL.exec(body)?.[1] ?? null;
}

type Parsed = Omit<ParsedTransaction, 'bankName'>;

// =====================================================================
// HDFC Bank parsers
// =====================================================================

// "Txn Rs.820.00\nOn HDFC Bank Card 0810\nAt paytmqr...@paytm\nby UPI ..."
function parseHdfcCardUpi(body: string): Parsed | null {
  const m =
    /Txn\s+Rs\.?\s*([0-9,.]+)[\s\S]*?On HDFC Bank Card\s+(\d{4})[\s\S]*?At\s+([^\r\n]+?)\s*[\r\n]+\s*by UPI/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: normalizeVpa(m[3]),
    paymentMode: 'upi',
    accountTail: m[2] ?? null,
    occurredAt: null,
  };
}

// "UPDATE: INR 15,000.00 debited from HDFC Bank XX3572 on DATE. Info: ACH D- HDFC BANK LTD-..."
function parseHdfcAchDebit(body: string): Parsed | null {
  const m =
    /UPDATE:\s*INR\s*([0-9,.]+)\s+debited from HDFC Bank\s+(?:A\/c\s+)?(?:XX)?(\d{3,6})/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  const info = /Info:\s*ACH D-\s*([^-\n]+?)-\d/i.exec(body);
  return {
    amountPaise,
    kind: 'expense',
    merchant: cleanMerchant(info?.[1]),
    paymentMode: 'bank_transfer',
    accountTail: m[2] ?? null,
    occurredAt: null,
  };
}

// "PAYMENT ALERT! INR 15000.00 deducted from HDFC Bank A/C No 3572 towards HDFCLTD UMRN: ..."
function parseHdfcPaymentAlert(body: string): Parsed | null {
  const m =
    /PAYMENT ALERT!?\s*INR\s*([0-9,.]+)\s+deducted from HDFC Bank A\/C No\s*(\d{3,6})\s+towards\s+([\s\S]+?)(?:\s*UMRN|\s*$)/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: cleanMerchant(m[3]),
    paymentMode: 'bank_transfer',
    accountTail: m[2] ?? null,
    occurredAt: null,
  };
}

// "IMPS INR 10,000.00\nsent from HDFC Bank A/c XX3572 on DATE\nTo A/c xxxxxxx8924\nRef-..."
function parseHdfcImpsSent(body: string): Parsed | null {
  const m =
    /IMPS\s+INR\s*([0-9,.]+)[\s\S]*?sent from HDFC Bank A\/c\s+(?:XX)?(\d{3,6})/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: null,
    paymentMode: 'bank_transfer',
    accountTail: m[2] ?? null,
    occurredAt: null,
  };
}

// "Received!\nINR 4,881.00 in HDFC Bank A/c xx3572\nOn DATE\nFor IMPS -CARE HEALTH INSURANC- ..."
function parseHdfcReceived(body: string): Parsed | null {
  const m =
    /Received!\s*INR\s*([0-9,.]+)\s+in HDFC Bank A\/c\s+(?:xx)?(\d{3,6})/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  const sender = /For\s+(?:IMPS|NEFT|RTGS)?\s*-\s*([^-\n]+?)\s*-/i.exec(body);
  return {
    amountPaise,
    kind: 'income',
    merchant: cleanMerchant(sender?.[1]),
    paymentMode: 'bank_transfer',
    accountTail: m[2] ?? null,
    occurredAt: null,
  };
}

// "Update! INR 2,40,568.00 deposited in HDFC Bank A/c XX3572 on DATE for NEFT Cr-CODE-SENDER-..."
function parseHdfcDeposited(body: string): Parsed | null {
  const m =
    /Update!\s*INR\s*([0-9,.]+)\s+deposited in HDFC Bank A\/c\s+(?:XX)?(\d{3,6})/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  const sender = /(?:NEFT|RTGS|IMPS)\s+Cr-(?:[A-Z0-9]+-)?([^-\n]+?)-/i.exec(body);
  return {
    amountPaise,
    kind: 'income',
    merchant: cleanMerchant(sender?.[1]),
    paymentMode: 'bank_transfer',
    accountTail: m[2] ?? null,
    occurredAt: null,
  };
}

function parseHdfc(body: string): Parsed | null {
  return (
    parseHdfcCardUpi(body) ??
    parseHdfcAchDebit(body) ??
    parseHdfcPaymentAlert(body) ??
    parseHdfcImpsSent(body) ??
    parseHdfcReceived(body) ??
    parseHdfcDeposited(body)
  );
}

// =====================================================================
// ICICI Bank parsers
// =====================================================================

// "ICICI Bank Acct XX797 debited for Rs 106.54 on DD-MMM-YY; MERCHANT credited. UPI:..."
function parseIciciUpiDebit(body: string): Parsed | null {
  const m =
    /ICICI Bank Acct\s+(?:XX)?(\d{3,6})\s+debited for Rs\s*([0-9,.]+)\s+on\s+[\d\-A-Za-z]+;\s*([^.]+?)\s+credited/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[2]);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: cleanMerchant(m[3]),
    paymentMode: 'upi',
    accountTail: m[1] ?? null,
    occurredAt: null,
  };
}

// "Rs 1.00 debited from ICICI Bank Savings Account XX797 on DATE towards MERCHANT for Mandate AutoPay ..."
function parseIciciMandate(body: string): Parsed | null {
  const m =
    /Rs\s*([0-9,.]+)\s+debited from ICICI Bank(?:\s+Savings)?\s+Account\s+(?:XX)?(\d{3,6})[\s\S]+?towards\s+([^.\n]+?)\s+for\s+Mandate/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: cleanMerchant(m[3]),
    paymentMode: 'bank_transfer',
    accountTail: m[2] ?? null,
    occurredAt: null,
  };
}

// "Rs.1,250.00 spent on ICICI Bank Card XX1234 at AMAZON on DATE"
function parseIciciCardSpend(body: string): Parsed | null {
  const m =
    /Rs\.?\s*([0-9,.]+)\s+spent (?:on|using) ICICI Bank (?:Credit\s+)?Card\s+(?:XX)?(\d{3,6})\s+at\s+([^.]+?)\s+on/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: cleanMerchant(m[3]),
    paymentMode: 'card',
    accountTail: m[2] ?? null,
    occurredAt: null,
  };
}

function parseIcici(body: string): Parsed | null {
  return parseIciciUpiDebit(body) ?? parseIciciMandate(body) ?? parseIciciCardSpend(body);
}

// =====================================================================
// Axis Bank parsers (incl. FASTag)
// =====================================================================

// "Alert! INR 70.00 debited from FASTag on DATE at LOCATION. Vehicle ..."
function parseAxisFastagDebit(body: string): Parsed | null {
  const m =
    /Alert!\s*INR\s*([0-9,.]+)\s+debited from FASTag[\s\S]*?at\s+([^.]+?)\.\s*Vehicle/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: cleanMerchant(m[2]),
    paymentMode: 'wallet',
    accountTail: null,
    occurredAt: null,
  };
}

// "FASTag is successfully recharged with INR 500.00 on DATE."
function parseAxisFastagRecharge(body: string): Parsed | null {
  const m = /FASTag is successfully recharged with INR\s*([0-9,.]+)/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;
  return {
    amountPaise,
    kind: 'expense',
    merchant: 'FASTag Recharge',
    paymentMode: 'bank_transfer',
    accountTail: null,
    occurredAt: null,
  };
}

function parseAxis(body: string): Parsed | null {
  return (
    parseAxisFastagDebit(body) ??
    parseAxisFastagRecharge(body) ??
    parseGeneric(body)
  );
}

// =====================================================================
// Federal Bank
// =====================================================================

// "Rs.500000 credited to your A/c XX6529 via IMPS on DATE. (IMPS Ref no-...) BAL-..."
function parseFedbnk(body: string): Parsed | null {
  const credit =
    /Rs\.?\s*([0-9,.]+)\s+credited to your A\/c\s+(?:XX)?(\d{3,6})\s+via\s+(?:IMPS|NEFT|RTGS)/i.exec(body);
  if (credit) {
    const amountPaise = parseAmountStr(credit[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'income',
      merchant: null,
      paymentMode: 'bank_transfer',
      accountTail: credit[2] ?? null,
      occurredAt: null,
    };
  }
  const debit =
    /Rs\.?\s*([0-9,.]+)\s+debited from your A\/c\s+(?:XX)?(\d{3,6})/i.exec(body);
  if (debit) {
    const amountPaise = parseAmountStr(debit[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'expense',
      merchant: null,
      paymentMode: 'bank_transfer',
      accountTail: debit[2] ?? null,
      occurredAt: null,
    };
  }
  return null;
}

// =====================================================================
// SBI
// =====================================================================

function parseSbi(body: string): Parsed | null {
  // "Rs 25,000.00 credited to your SBI A/c XX5678 on DATE from SENDER. Avl Bal: ..."
  const credit =
    /Rs\.?\s*([0-9,.]+)\s+credited to your SBI A\/c\s+(?:XX)?(\d{3,6})/i.exec(body);
  if (credit) {
    const amountPaise = parseAmountStr(credit[1]);
    if (amountPaise == null) return null;
    const from = /from\s+([A-Z0-9 .&_-]+?)(?:\.|\s+Avl|\s+REF|$)/i.exec(body);
    return {
      amountPaise,
      kind: 'income',
      merchant: cleanMerchant(from?.[1]),
      paymentMode: 'bank_transfer',
      accountTail: credit[2] ?? null,
      occurredAt: null,
    };
  }
  // "Rs.X debited from SBI A/c XXNNN on DATE"
  const debit =
    /Rs\.?\s*([0-9,.]+)\s+(?:has been )?debited from(?:\s+your)?\s+SBI A\/c\s+(?:XX)?(\d{3,6})/i.exec(body);
  if (debit) {
    const amountPaise = parseAmountStr(debit[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'expense',
      merchant: pickMerchantFallback(body),
      paymentMode: /UPI/i.test(body) ? 'upi' : 'bank_transfer',
      accountTail: debit[2] ?? null,
      occurredAt: null,
    };
  }
  return parseGeneric(body);
}

// =====================================================================
// Pluxee (meal card / wallet)
// =====================================================================

function parsePluxee(body: string): Parsed | null {
  // "Rs. 168.00 spent from Pluxee Meal Card wallet, card no.xx2553 on DATETIME at MERCHANT . Avl bal Rs.X"
  const spent =
    /Rs\.?\s*([0-9,.]+)\s+spent from Pluxee\s+Meal Card wallet,\s*card no\.?\s*(?:xx)?(\d{0,4})[\s\S]*?at\s+([^.]+?)\s*\./i.exec(body);
  if (spent) {
    const amountPaise = parseAmountStr(spent[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'expense',
      merchant: cleanMerchant(spent[3]),
      paymentMode: 'wallet',
      accountTail: spent[2] || null,
      occurredAt: null,
    };
  }
  // "Your Pluxee Card has been successfully credited with Rs.13200 towards Meal Wallet on DATE."
  const credit =
    /Pluxee Card has been successfully credited with Rs\.?\s*([0-9,.]+)/i.exec(body);
  if (credit) {
    const amountPaise = parseAmountStr(credit[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'income',
      merchant: 'Pluxee Meal Allowance',
      paymentMode: 'wallet',
      accountTail: null,
      occurredAt: null,
    };
  }
  return null;
}

// =====================================================================
// Paytm (bill pay / wallet)
// =====================================================================

function parsePaytm(body: string): Parsed | null {
  // "Payment of Rs.739 is successfully completed from ICICI Bank - 6797 towards Tsspdcl Electricity Bill"
  const bill =
    /Payment of Rs\.?\s*([0-9,.]+)\s+is successfully completed[\s\S]*?towards\s+([^.]+?)(?:\.|$)/i.exec(body);
  if (bill) {
    const amountPaise = parseAmountStr(bill[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'expense',
      merchant: cleanMerchant(bill[2]),
      paymentMode: 'upi',
      accountTail: null,
      occurredAt: null,
    };
  }
  // "You paid Rs.250 to merchant@upi via Paytm"
  const paid =
    /You paid Rs\.?\s*([0-9,.]+)\s+to\s+([A-Za-z0-9._@-]+)/i.exec(body);
  if (paid) {
    const amountPaise = parseAmountStr(paid[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'expense',
      merchant: normalizeVpa(paid[2]),
      paymentMode: /wallet/i.test(body) ? 'wallet' : 'upi',
      accountTail: null,
      occurredAt: null,
    };
  }
  return null;
}

// =====================================================================
// Refunds (merchant-initiated, multiple senders)
// =====================================================================

function parseRefund(body: string): Parsed | null {
  // Examples:
  //   "Refund of Rs 131 has been initiated for your Swiggy order ..."
  //   "Refund Processed: Refund of Rs. 463.0 for your Flipkart order of ... is successfully processed to ICICI CREDIT card ending with 2001 ..."
  //   "Refund of Rs. 221.28 for your Zomato order from B. Bicha Reddy Sweets has been initiated ..."
  const m = /Refund\s+(?:Processed:\s*Refund\s+)?of\s+Rs\.?\s*([0-9,.]+)\s+(?:has been|for your)/i.exec(body);
  if (!m) return null;
  const amountPaise = parseAmountStr(m[1]);
  if (amountPaise == null) return null;

  const service =
    /\b(Swiggy|Zomato|Flipkart|Amazon|PharmEasy|BigBasket|Myntra|Meesho|Uber|Ola)\b/i.exec(body);
  const cardTail = /card ending with\s+(\d{4})/i.exec(body);
  return {
    amountPaise,
    kind: 'income',
    merchant: service ? `${service[1]} Refund` : 'Refund',
    paymentMode: cardTail ? 'card' : 'bank_transfer',
    accountTail: cardTail?.[1] ?? null,
    occurredAt: null,
  };
}

// =====================================================================
// UPI app generic (GPay / PhonePe / BHIM)
// =====================================================================

function parseUpiApp(body: string): Parsed | null {
  // "You paid Rs.250 to merchant@oksbi via Google Pay"
  const paid =
    /(?:You paid|Paid)\s+Rs\.?\s*([0-9,.]+)\s+to\s+([A-Za-z0-9._@-]+)/i.exec(body);
  if (paid) {
    const amountPaise = parseAmountStr(paid[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'expense',
      merchant: normalizeVpa(paid[2]),
      paymentMode: 'upi',
      accountTail: null,
      occurredAt: null,
    };
  }
  // "You have received Rs.X from VPA via Google Pay/PhonePe"
  const received =
    /(?:You have received|Received)\s+Rs\.?\s*([0-9,.]+)\s+from\s+([A-Za-z0-9._@-]+)/i.exec(body);
  if (received) {
    const amountPaise = parseAmountStr(received[1]);
    if (amountPaise == null) return null;
    return {
      amountPaise,
      kind: 'income',
      merchant: normalizeVpa(received[2]),
      paymentMode: 'upi',
      accountTail: null,
      occurredAt: null,
    };
  }
  return parseGeneric(body);
}

// =====================================================================
// Strict generic fallback for unknown bank shapes
// =====================================================================

function parseGeneric(body: string): Parsed | null {
  const amountPaise = extractAmountPaise(body);
  if (amountPaise == null) return null;
  const debit = /\b(?:debited|paid|spent|sent|withdrawn|purchase[d]?|deducted)\b/i.test(body);
  const credit = /\b(?:credited|received|deposited|refund(?:ed)?)\b/i.test(body);
  if (!debit && !credit) return null;
  const mode: ParsedTransaction['paymentMode'] = /\bUPI\b/i.test(body)
    ? 'upi'
    : /\b(?:credit\s+card|debit\s+card|card\b)/i.test(body)
      ? 'card'
      : /\bwallet\b/i.test(body)
        ? 'wallet'
        : 'bank_transfer';
  return {
    amountPaise,
    kind: debit ? 'expense' : 'income',
    merchant: pickMerchantFallback(body),
    paymentMode: mode,
    accountTail: pickAccountTail(body),
    occurredAt: null,
  };
}

// =====================================================================
// Sender routing
// =====================================================================

interface BankRoute {
  bankName: string;
  senders: RegExp[];
  parse: (body: string) => Parsed | null;
}

const BANK_ROUTES: BankRoute[] = [
  { bankName: 'HDFC', senders: [/HDFCBK/i, /HDFCBN/i, /HDFCLD/i, /HDFCLTD/i], parse: parseHdfc },
  { bankName: 'ICICI', senders: [/ICICIB/i, /ICICIT/i, /ICICIO/i], parse: parseIcici },
  { bankName: 'Axis', senders: [/AXISBK/i, /AXISBN/i], parse: parseAxis },
  { bankName: 'Federal Bank', senders: [/FEDBNK/i], parse: parseFedbnk },
  { bankName: 'SBI', senders: [/SBIBNK/i, /SBIINB/i, /SBIPSG/i, /SBIUPI/i, /^SBI/i], parse: parseSbi },
  { bankName: 'Pluxee', senders: [/Pluxee/i, /SODEXO/i], parse: parsePluxee },
  { bankName: 'Paytm', senders: [/PAYTMB/i, /PAYTM\b/i], parse: parsePaytm },
  { bankName: 'GooglePay', senders: [/GPAY/i, /GOOGLEPAY/i], parse: parseUpiApp },
  { bankName: 'PhonePe', senders: [/PHONEPE/i, /PHNPAY/i, /PHPAY/i], parse: parseUpiApp },
  { bankName: 'BHIM', senders: [/BHIM/i, /NPCI/i], parse: parseUpiApp },
];

const REFUND_SENDERS = [/SWIGGY/i, /FLPKRT/i, /FLIPKRT/i, /ZOMATO/i, /AMAZON/i, /PHMESY/i, /BIGBKT/i, /MYNTRA/i, /MEESHO/i];

export function parseSms(sender: string, body: string): ParsedTransaction | null {
  if (!body || body.length > 5000) return null;
  if (isNonTransactional(body)) return null;

  // Refunds (income) — service merchants matter more than the bank for these.
  const isRefundContext =
    REFUND_SENDERS.some((re) => re.test(sender)) || /\bRefund of Rs/i.test(body);
  if (isRefundContext) {
    const r = parseRefund(body);
    if (r) {
      // Prefer the body's spelling (e.g. "Swiggy") over the sender's
      // uppercase short-code (e.g. "AX-SWIGGY") for a nicer display name.
      const svcRe = /\b(Swiggy|Zomato|Flipkart|Amazon|PharmEasy|BigBasket|Myntra|Meesho|Uber|Ola)\b/i;
      const bodyMatch = svcRe.exec(body);
      const senderMatch = bodyMatch ? null : svcRe.exec(sender);
      const raw = bodyMatch?.[1] ?? senderMatch?.[1];
      const titleCase = raw
        ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
        : 'Refund';
      return { ...r, bankName: titleCase };
    }
  }

  for (const route of BANK_ROUTES) {
    if (route.senders.some((re) => re.test(sender))) {
      const r = route.parse(body);
      if (r) return { ...r, bankName: route.bankName };
    }
  }

  // Strict fallback only if rupee marker is present.
  if (RUPEE_AMOUNT.test(body)) {
    const r = parseGeneric(body);
    if (r) return { ...r, bankName: 'Unknown' };
  }

  return null;
}
