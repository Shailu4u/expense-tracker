import { parseSms } from '../index';

describe('parseSms', () => {
  // ----------------------------------------------------------------
  // HDFC Bank
  // ----------------------------------------------------------------

  describe('HDFC', () => {
    it('parses card UPI debit (multi-line Paytm QR)', () => {
      const r = parseSms(
        'AD-HDFCBK-S',
        'Txn Rs.820.00\nOn HDFC Bank Card 0810\nAt paytmqr281005050101vkwtq8xwzfxr@paytm \nby UPI 130806062273\nOn 03-08\nNot You?\nCall 18002586161/SMS BLOCK CC 0810 to 7308080808',
      );
      expect(r?.amountPaise).toBe(82000);
      expect(r?.kind).toBe('expense');
      expect(r?.paymentMode).toBe('upi');
      expect(r?.bankName).toBe('HDFC');
      expect(r?.accountTail).toBe('0810');
      expect(r?.merchant).toBe('Paytm Merchant'); // VPA normalised
    });

    it('parses card UPI debit (PhonePe Q-handle)', () => {
      const r = parseSms(
        'VM-HDFCBK-S',
        'Txn Rs.80.00\nOn HDFC Bank Card 0810\nAt Q465583214@ybl \nby UPI 693317521002\nOn 07-08',
      );
      expect(r?.amountPaise).toBe(8000);
      expect(r?.merchant).toBe('PhonePe / UPI Merchant');
    });

    it('parses ACH/auto debit (UPDATE prefix)', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        'UPDATE: INR 15,374.00 debited from HDFC Bank XX3572 on 10-AUG-25. Info: ACH D- HDFC BANK LTD-430519497. Avl bal:INR 3,85,509.38',
      );
      expect(r?.amountPaise).toBe(1537400);
      expect(r?.kind).toBe('expense');
      expect(r?.accountTail).toBe('3572');
      expect(r?.merchant).toBe('HDFC BANK LTD');
      expect(r?.paymentMode).toBe('bank_transfer');
    });

    it('parses PAYMENT ALERT (NACH UMRN)', () => {
      const r = parseSms(
        'AD-HDFCBK-S',
        'PAYMENT ALERT! \nINR 15000.00 deducted from HDFC Bank A/C No 3572 towards HDFCLTD UMRN: HDFC2019066000000318',
      );
      expect(r?.amountPaise).toBe(1500000);
      expect(r?.kind).toBe('expense');
      expect(r?.merchant).toBe('HDFCLTD');
    });

    it('parses IMPS sent', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        'IMPS INR 10,000.00\nsent from HDFC Bank A/c XX3572 on 04-08-25\nTo A/c xxxxxxx8924\nRef-521613326458',
      );
      expect(r?.amountPaise).toBe(1000000);
      expect(r?.kind).toBe('expense');
      expect(r?.accountTail).toBe('3572');
    });

    it('parses Received! incoming IMPS as income', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        'Received!\nINR 4,881.00 in HDFC Bank A/c xx3572\nOn 26-08-25\nFor IMPS -CARE HEALTH INSURANC- 523818098609\nAvl bal INR 3,56,440.38',
      );
      expect(r?.amountPaise).toBe(488100);
      expect(r?.kind).toBe('income');
      expect(r?.merchant).toBe('CARE HEALTH INSURANC');
    });

    it('parses NEFT deposit as income (Indian lakh comma)', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        'Update! INR 2,40,568.00 deposited in HDFC Bank A/c XX3572 on 28-AUG-25 for NEFT Cr-BOFA0MM6205-F5 NETWORKS INNOVATION PVT LTD-KUMAR PALLIKONDA-BOFAN52025082809981357.Avl bal INR 5,97,008.38',
      );
      expect(r?.amountPaise).toBe(24056800);
      expect(r?.kind).toBe('income');
      expect(r?.merchant).toBe('F5 NETWORKS INNOVATION PVT LTD');
    });

    it('rejects OTP for txn (looks like real txn but is OTP)', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        'OTP is 713970 for txn of INR 436.82 at ZOMATO on HDFC Bank card ending 0810. Valid till  10:18. Do not share OTP for security reasons',
      );
      expect(r).toBeNull();
    });

    it('rejects OTP for transfer', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        '376812 is your OTP to transfer Rs.10000 from HDFC Bank A/c XX3572 to XX8924.\nRef No.XX2996\nNEVER share OTP\nNot you?Call 18002586161',
      );
      expect(r).toBeNull();
    });

    it('rejects loan installment pre-notification', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        'HDFC Bank Loan Ac no. xxx077 - INSTALLMENT of RS.15374 NACH scheduled for debit on 10-sep-25 from Bank Ac no 50xxx572. Please maintain sufficient funds.',
      );
      expect(r).toBeNull();
    });

    it('rejects service unavailability alert', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        'Alert!\nHDFC Bank Customer Care (Phone Banking IVR, Email, Social media), WhatsApp & SMS Banking unavailable from 22-Aug-25 11:00 pm IST to 23-Aug-25 6:00 am IST',
      );
      expect(r).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // ICICI Bank
  // ----------------------------------------------------------------

  describe('ICICI', () => {
    it('parses UPI debit with merchant after semicolon', () => {
      const r = parseSms(
        'AX-ICICIT-S',
        'ICICI Bank Acct XX797 debited for Rs 2002.36 on 07-Aug-25; MyGate credited. UPI:558516728992. Call 18002662 for dispute. SMS BLOCK 797 to 9215676766.',
      );
      expect(r?.amountPaise).toBe(200236);
      expect(r?.kind).toBe('expense');
      expect(r?.merchant).toBe('MyGate');
      expect(r?.accountTail).toBe('797');
      expect(r?.paymentMode).toBe('upi');
    });

    it('uses rupee-anchored amount, not account-suffix digits (regression: XX797)', () => {
      const r = parseSms(
        'AX-ICICIT-S',
        'ICICI Bank Acct XX797 debited for Rs 84.00 on 12-May-26; BAJRANG SINGH credited. UPI:082748007589.',
      );
      expect(r?.amountPaise).toBe(8400);
      expect(r?.accountTail).toBe('797');
      expect(r?.merchant).toBe('BAJRANG SINGH');
    });

    it('parses Mandate/AutoPay debit', () => {
      const r = parseSms(
        'AX-ICICIT-S',
        'Rs 1.00 debited from ICICI Bank Savings Account XX797 on 21-Nov-25 towards OpenAI LLC for Mandate AutoPay Retrieval Ref No.956142859971',
      );
      expect(r?.amountPaise).toBe(100);
      expect(r?.merchant).toBe('OpenAI LLC');
      expect(r?.paymentMode).toBe('bank_transfer');
    });

    it('parses credit card spend', () => {
      const r = parseSms(
        'AD-ICICIB',
        'Rs.1,250.00 spent on ICICI Bank Card XX1234 at AMAZON on 03-Mar-25. Avl Lmt Rs.50,000',
      );
      expect(r?.amountPaise).toBe(125000);
      expect(r?.kind).toBe('expense');
      expect(r?.paymentMode).toBe('card');
      expect(r?.merchant).toBe('AMAZON');
    });

    it('rejects credit card statement', () => {
      const r = parseSms(
        'AX-ICICIT-S',
        'ICICI Bank Credit Card XX2001 Statement is sent to sh********st@gmail.com. Total of Rs 10,980.18 or minimum of Rs 550.00 is due by 05-JUN-25.',
      );
      expect(r).toBeNull();
    });

    it('rejects credit card due reminder', () => {
      const r = parseSms(
        'AD-ICICIT-S',
        'Pay Total Due of Rs 13,847.17 or Minimum Due Rs 7,540.00 by 05-Jan-26 for ICICI Bank Credit Card XX2001. Delayed/No payments are reported to Credit Bureaus.',
      );
      expect(r).toBeNull();
    });

    it('rejects CC payment received notification (avoids double-count)', () => {
      const r = parseSms(
        'AX-ICICIT-S',
        'Payment of Rs 33,918.85 has been received on your ICICI Bank Credit Card XX2001 through Bharat Bill Payment System on 02-SEP-25.',
      );
      expect(r).toBeNull();
    });

    it('rejects ICICI credit card OTP (with txn amount)', () => {
      const r = parseSms(
        'AD-ICICIO-T',
        '663431 is One-Time Password for INR 826.55 transaction towards AMAZON PAY  using ICICI Bank Credit Card XX2001. OTPs are SECRET. DO NOT disclose',
      );
      expect(r).toBeNull();
    });

    it('rejects ICICI net banking OTP', () => {
      const r = parseSms(
        'AD-ICICIO-S',
        'Dear Customer, 652276 is the OTP for your request initiated through ICICI Bank Internet Banking. OTPs are SECRET. DO NOT disclose it. Bank NEVER asks for OTP.',
      );
      expect(r).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // Axis Bank (FASTag)
  // ----------------------------------------------------------------

  describe('Axis FASTag', () => {
    it('parses FASTag toll debit with location as merchant', () => {
      const r = parseSms(
        'JK-AXISBK-S',
        'Alert! INR 70.00 debited from FASTag on 11-05-25, 19:27:10 IST at Medchal.\nVehicle TS08EF7303.\nAvl. Bal INR 808.00 - Axis Bank',
      );
      expect(r?.amountPaise).toBe(7000);
      expect(r?.kind).toBe('expense');
      expect(r?.merchant).toBe('Medchal');
      expect(r?.paymentMode).toBe('wallet');
    });

    it('parses FASTag recharge as expense', () => {
      const r = parseSms(
        'JK-AXISBK-S',
        'FASTag is successfully recharged with INR 500.00 on 11-05-25 19:13:21 IST. Current balance: INR 878.00. Not you? Call us on 18004198585 - Axis Bank',
      );
      expect(r?.amountPaise).toBe(50000);
      expect(r?.merchant).toBe('FASTag Recharge');
    });
  });

  // ----------------------------------------------------------------
  // SBI
  // ----------------------------------------------------------------

  describe('SBI', () => {
    it('parses SBI credit with Indian lakh format', () => {
      const r = parseSms(
        'AD-SBIBNK',
        'Rs 25,000.00 credited to your SBI A/c XX5678 on 01-FEB-25 from XYZ. Avl Bal: Rs 1,00,000.00',
      );
      expect(r?.amountPaise).toBe(2500000);
      expect(r?.kind).toBe('income');
      expect(r?.bankName).toBe('SBI');
    });
  });

  // ----------------------------------------------------------------
  // Federal Bank
  // ----------------------------------------------------------------

  describe('Federal Bank', () => {
    it('parses Federal Bank IMPS credit', () => {
      const r = parseSms(
        'JM-FEDBNK',
        'Rs.500000 credited to your A/c XX6529 via IMPS on 19AUG2024 14:49:40. (IMPS Ref no-423214395743) BAL-Rs.501063 -Federal Bank',
      );
      expect(r?.amountPaise).toBe(50000000);
      expect(r?.kind).toBe('income');
      expect(r?.accountTail).toBe('6529');
      expect(r?.bankName).toBe('Federal Bank');
    });
  });

  // ----------------------------------------------------------------
  // Pluxee
  // ----------------------------------------------------------------

  describe('Pluxee', () => {
    it('parses meal card spend with merchant location', () => {
      const r = parseSms(
        'JD-Pluxee-S',
        'Rs. 168.00 spent from Pluxee  Meal Card wallet, card no.xx2553 on 14-05-2025 12:44:15 at ZEPTO . Avl bal Rs.55704.35. Not you call 18002106919',
      );
      expect(r?.amountPaise).toBe(16800);
      expect(r?.merchant).toBe('ZEPTO');
      expect(r?.paymentMode).toBe('wallet');
      expect(r?.accountTail).toBe('2553');
    });

    it('parses meal allowance credit', () => {
      const r = parseSms(
        'JD-Pluxee-S',
        'Your Pluxee Card has been successfully credited with Rs.13200 towards  Meal Wallet on Thu Oct 23 2025 15:02:00. Your current Meal Wallet balance is Rs.68246.35.',
      );
      expect(r?.amountPaise).toBe(1320000);
      expect(r?.kind).toBe('income');
      expect(r?.merchant).toBe('Pluxee Meal Allowance');
    });
  });

  // ----------------------------------------------------------------
  // Paytm bill payment
  // ----------------------------------------------------------------

  describe('Paytm', () => {
    it('parses bill payment with payee', () => {
      const r = parseSms(
        'AD-PAYTMB',
        'Payment of Rs.739 is successfully completed from ICICI Bank - 6797 towards Tsspdcl Electricity Bill. https://m.p-y.tm/UPImandates :PPBL',
      );
      expect(r?.amountPaise).toBe(73900);
      expect(r?.merchant).toBe('Tsspdcl Electricity Bill');
      expect(r?.paymentMode).toBe('upi');
    });
  });

  // ----------------------------------------------------------------
  // UPI apps
  // ----------------------------------------------------------------

  describe('GPay / PhonePe / BHIM', () => {
    it('parses GPay debit', () => {
      const r = parseSms('JK-GPAY', 'You paid Rs.250 to merchant@oksbi via Google Pay');
      expect(r?.amountPaise).toBe(25000);
      expect(r?.paymentMode).toBe('upi');
      expect(r?.bankName).toBe('GooglePay');
    });
  });

  // ----------------------------------------------------------------
  // Refunds
  // ----------------------------------------------------------------

  describe('Refunds', () => {
    it('parses Swiggy refund as income', () => {
      const r = parseSms(
        'AX-SWIGGY',
        'Refund of Rs 131 has been initiated for your Swiggy order 169299667845. Updated balance should reflect in 4-7 days. http://swig.gy/refunds',
      );
      expect(r?.amountPaise).toBe(13100);
      expect(r?.kind).toBe('income');
      expect(r?.bankName).toBe('Swiggy');
      expect(r?.merchant).toBe('Swiggy Refund');
    });

    it('parses Flipkart refund processed (to card)', () => {
      const r = parseSms(
        'VM-FLPKRT',
        'Refund Processed: Refund of Rs. 463.0 for your Flipkart order of BabyGo Dungaree For Ba... is successfully processed to ICICI CREDIT card ending with 2001 and will be credited by Jul 05, 2023.',
      );
      expect(r?.amountPaise).toBe(46300);
      expect(r?.kind).toBe('income');
      expect(r?.bankName).toBe('Flipkart');
      expect(r?.accountTail).toBe('2001');
      expect(r?.paymentMode).toBe('card');
    });

    it('parses Zomato refund', () => {
      const r = parseSms(
        'JM-ZOMATO',
        'Refund of Rs. 221.28 for your Zomato order from B. Bicha Reddy Sweets has been initiated and will be credited by Jul 25, 2024.',
      );
      expect(r?.amountPaise).toBe(22128);
      expect(r?.kind).toBe('income');
      expect(r?.bankName).toBe('Zomato');
    });
  });

  // ----------------------------------------------------------------
  // Generic rejects (cross-cutting)
  // ----------------------------------------------------------------

  describe('Rejects', () => {
    it('rejects EPF passbook balance ping', () => {
      const r = parseSms(
        'BZ-EPFOHO',
        'Dear 100690968037,your passbook balance against APHYD17490610000010157 is Rs. 15,88,363/-. Contribution of Rs. 35,196/- for due month 012023 has been received.',
      );
      expect(r).toBeNull();
    });

    it('rejects marketing/loan offer', () => {
      const r = parseSms(
        'JX-HDBNLN',
        'HDFC bank offers on personal loan ,Rate of interest from 10.25%, 0 Fore closure Charges ,partial payment allowed, Contact Chandu 9642639942 HDBNLN',
      );
      expect(r).toBeNull();
    });

    it('rejects policy renewal reminder', () => {
      const r = parseSms(
        'VM-NIALTD',
        'Dear Customer, Your MOTOR Policy No. 31030031220100096911 will expire on 23/06/2023. You can renew the policy before 23/06/2023.',
      );
      expect(r).toBeNull();
    });

    it('rejects mutual fund purchase confirmation (avoids double-count with bank debit)', () => {
      const r = parseSms(
        'VD-TATAMF',
        'Purchase in folio 8354153/13 in Tata Small Cap Fund Dir Pl Gr for Rs.14,999.25 for 524.569 units at NAV of Rs.28.5935 dated 09-Jun-2023 is successful. -TATA MF',
      );
      expect(r).toBeNull();
    });

    it('rejects bare OTP message', () => {
      const r = parseSms(
        'JM-HDFCBK-S',
        'The OTP is 3416. This OTP is generated at 2025-08-28 20:04:43 and is valid for 10 minutes -HDFC Bank',
      );
      expect(r).toBeNull();
    });

    it('returns null for unknown sender with no rupee marker', () => {
      const r = parseSms('JK-RANDOM', 'See you tomorrow at 10');
      expect(r).toBeNull();
    });

    it('returns null for body without transactional keyword', () => {
      const r = parseSms('JK-RANDOM', 'Your balance is Rs 5000');
      expect(r).toBeNull();
    });
  });
});
