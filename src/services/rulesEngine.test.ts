import { describe, it, expect } from 'vitest';
import { evaluateRules } from './rulesEngine';

describe('Deterministic Rules Engine (Stage 0)', () => {
  it('flags scam OTP sharing demands as Likely scam', () => {
    const text = 'Dear user, your card is on hold. Please share your 6-digit OTP to unblock.';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.scamType).toBe('otp_fraud');
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('correctly marks legitimate bank OTP advisories as Safe', () => {
    const text = '123456 is your secret OTP for login to NetBanking. Valid for 5 mins. NEVER share this OTP with anyone.';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Safe');
    expect(res.scamType).toBe('none');
  });

  it('flags UPI collect requests asking to enter PIN to receive money', () => {
    const text = 'OLX buyer: enter UPI PIN to receive Rs 15000 in your account immediately.';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.scamType).toBe('upi_collect_request');
  });

  it('flags Digital Arrest and law enforcement intimidation', () => {
    const text = 'Notice from Mumbai Police cyber cell: Narcotics parcel seized. Connect on Skype video call or arrest warrant issued.';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.scamType).toBe('digital_arrest');
  });

  it('flags urgent Electricity disconnection scams', () => {
    const text = 'Dear consumer, your electricity power will be disconnected tonight at 9:30 PM. Immediately contact officer on 9876543210.';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.scamType).toBe('electricity_disconnection');
  });

  it('flags Fake KYC SMS with unverified portal links', () => {
    const text = 'Dear SBI customer, your YONO account will be blocked today due to pending KYC. Update at http://sbi-kyc-verify-portal.in';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.scamType).toBe('fake_kyc');
  });

  it('flags fake part-time job Telegram scams', () => {
    const text = 'Selected for YouTube like part-time job. Earn Rs 3000 to 8000 daily from home. Join Telegram @JobTask';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.scamType).toBe('job_offer');
  });

  it('flags KBC lucky draw and lottery scams', () => {
    const text = 'Congratulations! You have won 25 Lakhs in KBC Lucky Draw 2026. Send processing fee to claim your cheque.';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.scamType).toBe('lottery');
  });

  it('flags postal parcel customs fee scams', () => {
    const text = 'IndiaPost courier tracking #IN9821 held at customs for unpaid duty fee of Rs 499. Pay at http://bit.ly/parcel-clear';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.scamType).toBe('courier_customs');
  });

  it('marks legitimate bank debit notifications as Safe', () => {
    const text = 'A/C 1234 debited by Rs 450.00 on 19-Nov-26 at Grocery. Avail Bal INR 14,200. If not done by you, call 1800111109.';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Safe');
  });

  it('marks legitimate courier delivery notices as Safe', () => {
    const text = 'Your delivery associate Suresh is arriving today with package AMZ9832. Share delivery code 4821 upon arrival.';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Safe');
  });

  it('flags transliterated Kannada scam message', () => {
    const text = 'Nimma bank account block aagide. KYC update maadi ee link mele: http://bank-update-kyc.com';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.languageDetected).toBe('kn');
  });

  it('flags Hindi electricity disconnection message', () => {
    const text = 'आपका बिजली कनेक्शन आज रात काट दिया जाएगा। तुरंत संपर्क करें।';
    const res = evaluateRules(text);

    expect(res.verdict).toBe('Likely scam');
    expect(res.languageDetected).toBe('hi');
  });
});
