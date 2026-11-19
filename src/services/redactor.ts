import type { RedactionResult } from '../types';

/**
 * On-device deterministic redactor.
 * Guarantees that private identifiers (phones, bank accounts, cards, Aadhaar, PAN, UPI IDs,
 * emails, URL query strings, and customer names) are replaced with typed tokens
 * BEFORE any text leaves the device.
 */
export function redactSensitiveData(input: string): RedactionResult {
  let redacted = input;
  const placeholderMap: Record<string, string> = {};

  let phoneCount = 0;
  let accountCount = 0;
  let cardCount = 0;
  let aadhaarCount = 0;
  let panCount = 0;
  let upiCount = 0;
  let emailCount = 0;
  let nameCount = 0;
  let urlQueryCount = 0;

  // 1. Redact Email Addresses first (so @ is not confused with UPI)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  redacted = redacted.replace(emailRegex, (match) => {
    emailCount++;
    const placeholder = `[EMAIL_${emailCount}]`;
    placeholderMap[placeholder] = match;
    return placeholder;
  });

  // 2. Redact UPI IDs (e.g., name@okhdfcbank, payment@paytm, user@upi)
  const upiRegex = /\b[A-Za-z0-9._-]+@(okaxis|okhdfcbank|oksbi|okicici|paytm|ybl|ibl|axl|upi|apl|federal|idbi|barodampay|postbank|kotak|indus|airtel|[a-z]{3,})\b/gi;
  redacted = redacted.replace(upiRegex, (match) => {
    upiCount++;
    const placeholder = `[UPI_ID_${upiCount}]`;
    placeholderMap[placeholder] = match;
    return placeholder;
  });

  // 3. Redact URL Query Strings (preserves domain & path for scam detection, redacts tokens/parameters)
  const urlWithQueryRegex = /(https?:\/\/[^\s/?#]+[^\s?#]*)(\?[^\s#]+)/gi;
  redacted = redacted.replace(urlWithQueryRegex, (_, baseUrl, queryString) => {
    urlQueryCount++;
    const placeholder = `[URL_QUERY_${urlQueryCount}]`;
    placeholderMap[placeholder] = queryString;
    return `${baseUrl}${placeholder}`;
  });

  // 4. Redact Credit / Debit Card Numbers (13 to 19 digits formatted or raw)
  const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  redacted = redacted.replace(cardRegex, (match) => {
    cardCount++;
    const placeholder = `[CARD_${cardCount}]`;
    placeholderMap[placeholder] = match;
    return placeholder;
  });

  // 5. Redact Aadhaar Numbers (12 digits, often 4-4-4)
  const aadhaarRegex = /\b\d{4}[-\s]\d{4}[-\s]\d{4}\b/g;
  redacted = redacted.replace(aadhaarRegex, (match) => {
    aadhaarCount++;
    const placeholder = `[AADHAAR_${aadhaarCount}]`;
    placeholderMap[placeholder] = match;
    return placeholder;
  });

  // 6. Redact Indian PAN Card Numbers (5 uppercase letters, 4 digits, 1 uppercase letter)
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  redacted = redacted.replace(panRegex, (match) => {
    panCount++;
    const placeholder = `[PAN_${panCount}]`;
    placeholderMap[placeholder] = match;
    return placeholder;
  });

  // 7. Redact Bank Account Numbers (preceded by A/C, Account, Acct, No, Number)
  const accountRegex = /(?:a\/?c|account|acct|acc)(?:\s*(?:no\.?|num(?:ber)?\.?|#))?[\s.:#-]*(\b\d{9,18}\b)/gi;
  redacted = redacted.replace(accountRegex, (fullMatch, digits) => {
    accountCount++;
    const placeholder = `[ACCOUNT_${accountCount}]`;
    placeholderMap[placeholder] = digits;
    return fullMatch.replace(digits, placeholder);
  });

  // 8. Redact Phone Numbers (Indian 10-digit formats with optional +91/0, international prefixes)
  const phoneRegex = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|\b(?:\+?1[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}\b/g;
  redacted = redacted.replace(phoneRegex, (match) => {
    phoneCount++;
    const placeholder = `[PHONE_${phoneCount}]`;
    placeholderMap[placeholder] = match;
    return placeholder;
  });

  // 9. Redact Personal Names following common prefixes
  const nameSalutationRegex = /(?:Dear|Hello|Hi|Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Shri|Smt\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  redacted = redacted.replace(nameSalutationRegex, (fullMatch, name) => {
    nameCount++;
    const placeholder = `[NAME_${nameCount}]`;
    placeholderMap[placeholder] = name;
    return fullMatch.replace(name, placeholder);
  });

  const total =
    phoneCount +
    accountCount +
    cardCount +
    aadhaarCount +
    panCount +
    upiCount +
    emailCount +
    nameCount +
    urlQueryCount;

  return {
    redactedText: redacted,
    placeholderMap,
    counts: {
      phones: phoneCount,
      accounts: accountCount,
      cards: cardCount,
      aadhaar: aadhaarCount,
      pan: panCount,
      upiIds: upiCount,
      emails: emailCount,
      names: nameCount,
      urlQueries: urlQueryCount,
      total,
    },
  };
}

/**
 * Restores redacted placeholders in a response with the user's original data locally.
 */
export function restoreRedactions(text: string, placeholderMap: Record<string, string>): string {
  let restored = text;
  for (const [placeholder, original] of Object.entries(placeholderMap)) {
    // Replace all occurrences of the placeholder safely
    restored = restored.split(placeholder).join(original);
  }
  return restored;
}
