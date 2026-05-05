import { parseSms } from '../index';

describe('parseSms', () => {
  it('parses HDFC debit', () => {
    const r = parseSms(
      'VK-HDFCBK',
      'Rs.499.00 has been debited from HDFC Bank a/c xx1234 to ZOMATO via UPI on 12-Jan-25. Avl bal Rs.5,000.00',
    );
    expect(r?.amountPaise).toBe(49900);
    expect(r?.kind).toBe('expense');
    expect(r?.paymentMode).toBe('upi');
    expect(r?.bankName).toBe('HDFC');
    expect(r?.accountTail).toBe('1234');
  });

  it('parses SBI credit', () => {
    const r = parseSms(
      'AD-SBIBNK',
      'Rs 25,000.00 credited to your SBI A/c XX5678 on 01-FEB-25 from XYZ. Avl Bal: Rs 1,00,000.00',
    );
    expect(r?.amountPaise).toBe(2500000);
    expect(r?.kind).toBe('income');
    expect(r?.bankName).toBe('SBI');
  });

  it('returns null for OTP messages', () => {
    expect(
      parseSms('AD-HDFCBK', 'Your OTP is 123456. Do not share with anyone. Valid for 5 mins.'),
    ).toBeNull();
  });

  it('returns null for unknown sender', () => {
    expect(
      parseSms('JK-RANDOM', 'You have spent Rs.100 at SOMEPLACE'),
    ).toBeNull();
  });

  it('parses ICICI card spend', () => {
    const r = parseSms(
      'AD-ICICIB',
      'Rs.1,250.00 spent on ICICI Bank Card XX1234 at AMAZON on 03-Mar-25. Avl Lmt Rs.50,000',
    );
    expect(r?.amountPaise).toBe(125000);
    expect(r?.kind).toBe('expense');
    expect(r?.paymentMode).toBe('card');
  });

  it('parses GPay UPI debit', () => {
    const r = parseSms('JK-GPAY', 'You paid Rs.250 to merchant@oksbi via Google Pay');
    expect(r?.amountPaise).toBe(25000);
    expect(r?.paymentMode).toBe('upi');
    expect(r?.bankName).toBe('GooglePay');
  });
});
