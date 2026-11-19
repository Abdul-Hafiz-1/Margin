import { describe, it, expect } from 'vitest';
import { redactSensitiveData, restoreRedactions } from './redactor';

describe('On-device Redactor Service', () => {
  it('redacts Indian phone numbers completely', () => {
    const raw = 'Please contact officer Rajesh immediately at +91 98765 43210 or 9123456789.';
    const res = redactSensitiveData(raw);

    expect(res.redactedText).not.toContain('98765 43210');
    expect(res.redactedText).not.toContain('9123456789');
    expect(res.counts.phones).toBe(2);
    expect(res.redactedText).toContain('[PHONE_1]');
    expect(res.redactedText).toContain('[PHONE_2]');
  });

  it('redacts Aadhaar numbers (4-4-4 formatted)', () => {
    const raw = 'Your parcel is blocked under Aadhaar 5432 9876 1234. Connect urgently.';
    const res = redactSensitiveData(raw);

    expect(res.redactedText).not.toContain('5432 9876 1234');
    expect(res.counts.aadhaar).toBe(1);
    expect(res.redactedText).toContain('[AADHAAR_1]');
  });

  it('redacts Indian PAN card numbers', () => {
    const raw = 'Income tax penalty pending for PAN ABCDE1234F. Pay now.';
    const res = redactSensitiveData(raw);

    expect(res.redactedText).not.toContain('ABCDE1234F');
    expect(res.counts.pan).toBe(1);
    expect(res.redactedText).toContain('[PAN_1]');
  });

  it('redacts Credit/Debit card numbers', () => {
    const raw = 'Debit card 4111 2222 3333 4444 has been compromised. Verify immediately.';
    const res = redactSensitiveData(raw);

    expect(res.redactedText).not.toContain('4111 2222 3333 4444');
    expect(res.counts.cards).toBe(1);
    expect(res.redactedText).toContain('[CARD_1]');
  });

  it('redacts Bank Account numbers with labels', () => {
    const raw = 'Dear customer, Account No. 987654321012 has pending KYC verification.';
    const res = redactSensitiveData(raw);

    expect(res.redactedText).not.toContain('987654321012');
    expect(res.counts.accounts).toBe(1);
    expect(res.redactedText).toContain('[ACCOUNT_1]');
  });

  it('redacts UPI IDs without corrupting surrounding text', () => {
    const raw = 'Send Rs 5000 to user.kumar@okhdfcbank or emergency99@paytm to claim prize.';
    const res = redactSensitiveData(raw);

    expect(res.redactedText).not.toContain('user.kumar@okhdfcbank');
    expect(res.redactedText).not.toContain('emergency99@paytm');
    expect(res.counts.upiIds).toBe(2);
  });

  it('redacts email addresses', () => {
    const raw = 'Reply to cyber.desk.helpdesk@gmail.com with your OTP to reverse the charge.';
    const res = redactSensitiveData(raw);

    expect(res.redactedText).not.toContain('cyber.desk.helpdesk@gmail.com');
    expect(res.counts.emails).toBe(1);
    expect(res.redactedText).toContain('[EMAIL_1]');
  });

  it('redacts URL query parameters while keeping suspicious host and path intact', () => {
    const raw = 'Click http://verify-portal.in/login?session=abc9988&mobile=9876543210 to claim refund.';
    const res = redactSensitiveData(raw);

    // Host and path must stay for domain inspection
    expect(res.redactedText).toContain('http://verify-portal.in/login');
    // Query string must be redacted
    expect(res.redactedText).not.toContain('?session=abc9988&mobile=9876543210');
    expect(res.redactedText).toContain('[URL_QUERY_1]');
  });

  it('guarantees no raw private identifiers survive in a multi-leak message', () => {
    const complexMsg = `Dear Rahul Sharma,
Your Account 987654321012 and card 5555 4444 3333 2222 are suspended.
Verify Aadhaar 9988 7766 5544 and PAN ABCDE9988Z at https://sbi-fake-kyc.org/auth?user_id=89234.
Contact officer on +91 9988776655 or email desk@phish.com or pay fee to claim@upi.`;

    const res = redactSensitiveData(complexMsg);

    // Proves absolute safety: no sensitive details survive
    expect(res.redactedText).not.toContain('Rahul Sharma');
    expect(res.redactedText).not.toContain('987654321012');
    expect(res.redactedText).not.toContain('5555 4444 3333 2222');
    expect(res.redactedText).not.toContain('9988 7766 5544');
    expect(res.redactedText).not.toContain('ABCDE9988Z');
    expect(res.redactedText).not.toContain('?user_id=89234');
    expect(res.redactedText).not.toContain('9988776655');
    expect(res.redactedText).not.toContain('desk@phish.com');
    expect(res.redactedText).not.toContain('claim@upi');
  });

  it('restores placeholders accurately into output explanations', () => {
    const raw = 'Call +91 98765 43210 urgently.';
    const res = redactSensitiveData(raw);

    const modelExplanation = 'Do not call [PHONE_1] as it is an unverified scam contact.';
    const restored = restoreRedactions(modelExplanation, res.placeholderMap);

    expect(restored).toBe('Do not call +91 98765 43210 as it is an unverified scam contact.');
  });
});
