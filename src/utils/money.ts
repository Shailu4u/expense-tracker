// Money is stored as integer paise in SQLite. Never store rupees as floats.

const PAISE_PER_RUPEE = 100;

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error('rupeesToPaise: not a finite number');
  }
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

export function formatINR(paise: number, opts?: { showZeroPaise?: boolean }): string {
  const rupees = paiseToRupees(paise);
  if (opts?.showZeroPaise) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rupees);
  }
  return inrFormatter.format(rupees);
}

// Parse user-entered "1,234.50" / "1234" / "₹1,234" / "1.5K"-light forms (no K/M).
export function parseINR(input: string): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[₹,\s]/g, '').trim();
  if (cleaned === '') return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return rupeesToPaise(num);
}
