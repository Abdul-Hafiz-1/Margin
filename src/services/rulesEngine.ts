import type { Verdict, ScamType, PipelineStage } from '../types';

export interface RuleMatch {
  ruleId: string;
  category: ScamType;
  severity: 'high' | 'medium' | 'low';
  weight: number;
  reason: string;
  matchedText: string;
  actionStep: string;
}

export interface RuleEvaluationResult {
  verdict: Verdict;
  confidence: number;
  scamType: ScamType;
  reasons: string[];
  actionSteps: string[];
  stageDecided: PipelineStage;
  languageDetected: string;
  matches: RuleMatch[];
}

// Detection for language scripts
export function detectLanguage(text: string): 'en' | 'hi' | 'kn' {
  // Devanagari Unicode range: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }
  // Kannada Unicode range: \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn';
  }
  // Transliterated Kannada keywords
  if (/\b(nimma|beku|aagide|maadi|sigide|tumba|illa|dina|duggu|namaste|hogi|banni)\b/i.test(text)) {
    return 'kn';
  }
  // Transliterated Hindi keywords
  if (/\b(aapka|aapke|karein|kijiye|hoga|kat|diya|jayega|turant|sampark|bhejein|paisa|inaam)\b/i.test(text)) {
    return 'hi';
  }
  return 'en';
}

/**
 * Deterministic Rules Engine (Stage 0).
 * Runs 100% on-device, offline, with zero external network or AI calls.
 */
export function evaluateRules(
  text: string,
  extraKeywords: string[] = []
): RuleEvaluationResult {
  const normalized = text.toLowerCase();
  const lang = detectLanguage(text);
  const matches: RuleMatch[] = [];

  // --- 1. LEGITIMATE GUARDS ---
  // If the message explicitly warns the user NOT to share OTP, that is a legitimate safety warning
  const hasOtpSafetyWarning =
    /\b(never|do not|don'?t)\s+(?:share|disclose|give|reveal)\s+(?:this\s+)?(?:otp|pin|password|code)\b/i.test(
      normalized
    ) ||
    /\b(kisi\s+ke\s+saath|kisi\s+ko\s+bhi)\s+otp\s+share\s+na\s+karein\b/i.test(normalized) ||
    /otp\s+annu\s+yarondigu\s+hanchikollabedi/i.test(normalized);

  const isBankTransactionAlert =
    /\b(?:debited\s+by|credited\s+with|avl\s+bal|avail\s+bal|spent\s+on\s+card|txn\s+of\s+rs)\b/i.test(
      normalized
    ) && !/\b(click\s+link|download\s+apk|update\s+kyc)\b/i.test(normalized);

  const isGovernmentFactCheck =
    /\b(pib\s+fact\s+check|factcheck\.pib\.gov\.in|beware\s+of\s+fake|cybercrime\.gov\.in)\b/i.test(
      normalized
    );

  const isLegitDeliveryOtp =
    /\b(delivery\s+code|delivery\s+associate|upon\s+arrival|at\s+doorstep|package\s+arriving\s+today)\b/i.test(
      normalized
    ) && !/\b(fee|charges|blocked|customs|penalty)\b/i.test(normalized);

  // --- 2. HIGH SEVERITY SCAM RULES ---

  // A. OTP / PIN Theft (asking user to give/share OTP or PIN)
  const otpTheftRegex =
    /\b(share|send|forward|tell|submit|provide|give)\s+(?:(?:me|us)\s+)?(?:your|the)?\s*(?:6-digit\s+)?(?:otp|one-time\s+password|cvv|secret\s+pin)\b/i.test(
      normalized
    ) ||
    /\b(otp\s+(?:bhejo|share\s+karein|batao|forward\s+karein))\b/i.test(normalized) ||
    /(?:otp|ओटीपी).*?(?:भेजें|भेजो|शेयर|bhejo|bhejein)/i.test(normalized) ||
    /\b(otp\s+annu\s+kalisibedi|share\s+maadi|helabeku)\b/i.test(normalized);

  if (otpTheftRegex && !hasOtpSafetyWarning) {
    const rawMatch = text.match(
      /(?:share|send|forward|tell|submit|provide|give)\s+(?:(?:me|us)\s+)?(?:your|the)?\s*(?:6-digit\s+)?(?:otp|one-time\s+password|cvv|secret\s+pin)|(?:otp|ओटीपी).*?(?:भेजें|भेजो|शेयर)/i
    );
    matches.push({
      ruleId: 'CRIT_OTP_THEFT',
      category: 'otp_fraud',
      severity: 'high',
      weight: 0.95,
      reason: 'Demands you to share or send your confidential OTP/PIN.',
      matchedText: rawMatch ? rawMatch[0] : 'share OTP',
      actionStep:
        'Never share OTP, PIN, or CVV with anyone. Banks and official agencies will never ask for your OTP.',
    });
  }

  // B. UPI PIN to Receive Money Scam
  const upiReceiveScam =
    /\b(enter\s+(?:your\s+)?upi\s+pin|enter\s+pin\s+to\s+receive|enter\s+pin\s+to\s+claim|accept\s+collect\s+request|approve\s+collect)\b/i.test(
      normalized
    ) ||
    /\b(paisa\s+paane\s+ke\s+liye\s+pin\s+daalein|pin\s+enter\s+karein\s+paisa\s+aayega)\b/i.test(
      normalized
    ) ||
    /(?:hana\s+padiyalu.*?pin|pin\s+enter\s+maadi.*?hana|pin\s+haaki)/i.test(normalized);

  if (upiReceiveScam) {
    const rawMatch = text.match(
      /(?:enter\s+(?:your\s+)?upi\s+pin|enter\s+pin\s+to\s+receive|accept\s+collect\s+request|hana\s+padiyalu.*?pin|pin\s+enter\s+maadi)/i
    );
    matches.push({
      ruleId: 'CRIT_UPI_COLLECT',
      category: 'upi_collect_request',
      severity: 'high',
      weight: 0.95,
      reason: 'Asks you to enter your UPI PIN or approve a collect request to receive funds.',
      matchedText: rawMatch ? rawMatch[0] : 'enter UPI PIN to receive',
      actionStep:
        'You NEVER need to enter your UPI PIN to receive money. Entering your PIN transfers funds OUT of your account.',
    });
  }

  // C. Digital Arrest / Law Enforcement Impersonation
  const digitalArrest =
    /\b(digital\s+arrest|mumbai\s+police|delhi\s+police|cbi\s+cyber|customs\s+narcotics|contraband|drugs\s+found|parcel\s+seized|arrest\s+warrant|skype\s+video\s+call|stay\s+on\s+call\s+under\s+arrest)\b/i.test(
      normalized
    ) ||
    /\b(police\s+complaint|drugs\s+sigide|parcel\s+nalli\s+drugs|video\s+call\s+maadi|arrest\s+aaguttiri)\b/i.test(
      normalized
    );

  if (digitalArrest && !isGovernmentFactCheck) {
    const rawMatch = text.match(
      /(?:digital\s+arrest|customs\s+narcotics|contraband|parcel\s+seized|arrest\s+warrant|skype\s+video\s+call|police\s+complaint)/i
    );
    matches.push({
      ruleId: 'CRIT_DIGITAL_ARREST',
      category: 'digital_arrest',
      severity: 'high',
      weight: 0.96,
      reason:
        'Threatens arrest, customs narcotics seizure, or demands an immediate video interrogation.',
      matchedText: rawMatch ? rawMatch[0] : 'customs/police alert',
      actionStep:
        'Law enforcement agencies and police never conduct trials, "digital arrests", or demand settlements over WhatsApp or Skype. Hang up and report to cybercrime.gov.in (1930).',
    });
  }

  // D. Electricity / Essential Utility Disconnection
  const electricityThreat =
    /(?:electricity|power|bijli|बिजली|ವಿದ್ಯುತ್|bescom|tneb|mseb|dhbvn|cesc)/i.test(normalized) &&
    /(?:disconnected|disconnect|काट\s+दिया|कट\s+जाएगा|kaat\s+diya|cut\s+off|tonight|bill\s+update|contact|संपर्क|officer)/i.test(
      normalized
    );

  if (electricityThreat) {
    const rawMatch = text.match(
      /(?:electricity|power|bijli|बिजली|ವಿದ್ಯುತ್|bescom).*?(?:disconnected|disconnect|काट\s+दिया|kaat\s+diya|cut\s+off|संपर्क)/i
    );
    matches.push({
      ruleId: 'CRIT_ELECTRICITY_DISCONNECT',
      category: 'electricity_disconnection',
      severity: 'high',
      weight: 0.94,
      reason: 'Claims urgent power disconnection tonight unless you contact an unofficial phone number.',
      matchedText: rawMatch ? rawMatch[0] : 'electricity disconnection',
      actionStep:
        'Electricity boards never send SMS from personal mobile numbers threatening immediate disconnection. Verify directly on your electricity provider official portal.',
    });
  }

  // E. Fake KYC / Account Suspension with Phishing Links
  const fakeKyc =
    /\b(yono|sbi|hdfc|icici|axis|pnb|kotak|bob|bank|खाता|ಖಾತೆ)\b/i.test(normalized) &&
    /\b(kyc|account\s+(?:will\s+be\s+)?block(?:ed)?|block\s+aagide|pan\s+card|verify|suspended|aadhaar\s+update)\b/i.test(
      normalized
    ) &&
    /\b(https?:\/\/|bit\.ly|tinyurl|is\.gd|apk|download|portal|click|link)\b/i.test(
      normalized
    );

  if (fakeKyc) {
    const rawMatch = text.match(
      /(?:account\s+(?:will\s+be\s+)?blocked|kyc\s+pending|pan\s+card\s+not\s+updated)/i
    );
    matches.push({
      ruleId: 'CRIT_FAKE_KYC',
      category: 'fake_kyc',
      severity: 'high',
      weight: 0.94,
      reason: 'Fabricates urgent bank account blockage due to pending KYC or PAN update.',
      matchedText: rawMatch ? rawMatch[0] : 'KYC pending / account blocked',
      actionStep:
        'Never click links in SMS claiming your bank account is blocked. Visit your bank branch or use official net-banking apps directly.',
    });
  }

  // F. Fake Job Offer / Telegram Task Scams
  const fakeJob =
    /\b(part-time\s+job|work\s+from\s+home|youtube\s+like|review\s+hotel|telegram\s+task|earn\s+rs\.?\s*\d{3,5}\s+daily|earn\s+daily|salary\s+per\s+day)\b/i.test(
      normalized
    );

  if (fakeJob) {
    const rawMatch = text.match(
      /(?:part-time\s+job|youtube\s+like|earn\s+rs\.?\s*\d{3,5}\s+daily|telegram\s+task)/i
    );
    matches.push({
      ruleId: 'CRIT_JOB_SCAM',
      category: 'job_offer',
      severity: 'high',
      weight: 0.92,
      reason: 'Promises unrealistic daily pay for simple tasks like liking videos or Telegram reviews.',
      matchedText: rawMatch ? rawMatch[0] : 'earn daily Rs 3000-8000',
      actionStep:
        'Legitimate companies never pay for liking videos or recruit via anonymous Telegram channels. Do not pay any "registration" or "recharge" fees.',
    });
  }

  // G. Lottery / Prize / Lucky Draw Scams
  const fakeLottery =
    /\b(lucky\s+draw|won\s+(?:rs\.?|inr)?\s*\d{1,3}\s*(?:lakhs?|crores?|millions?)|won\s+(?:\d+(?:st|nd|rd|th)\s+)?prize|won\s+lottery|mobile\s+lottery|claim\s+your\s+cheque|send\s+processing\s+fee|registration\s+fee)\b/i.test(
      normalized
    ) ||
    /(?:लकी\s+ड्रा|इनाम\s+मिला|लाख\s+का\s+इनाम|बधाई\s+हो.*?इनाम|lottery\s+geddiddiri)/i.test(normalized);

  if (fakeLottery) {
    const rawMatch = text.match(
      /(?:lucky\s+draw|won\s+(?:rs\.?|inr)?\s*\d{1,3}\s*(?:lakhs?|crores?)|won\s+(?:\d+(?:st|nd|rd|th)\s+)?prize|won\s+lottery|mobile\s+lottery|लकी\s+ड्रा|इनाम)/i
    );
    matches.push({
      ruleId: 'CRIT_LOTTERY_SCAM',
      category: 'lottery',
      severity: 'high',
      weight: 0.93,
      reason: 'Falsely claims you have won a lottery or lucky draw and asks for fees to release the prize.',
      matchedText: rawMatch ? rawMatch[0] : 'won lucky draw / lottery',
      actionStep:
        'You cannot win a lottery you never entered. Never pay advance processing fees or taxes to claim winnings.',
    });
  }

  // H. Investment & Stock Trading Fraud
  const fakeInvestment =
    /(?:guaranteed\s+\d+%\s+(?:monthly|daily|weekly)\s+returns|crypto\s+signals|deposit\s+minimum\s+rs|vip\s+stock\s+trading|trading\s+signals)/i.test(
      normalized
    );

  if (fakeInvestment) {
    const rawMatch = text.match(
      /(?:guaranteed\s+\d+%\s+(?:monthly|daily|weekly)\s+returns|deposit\s+minimum\s+rs|vip\s+stock\s+trading)/i
    );
    matches.push({
      ruleId: 'CRIT_INVESTMENT_SCAM',
      category: 'investment',
      severity: 'high',
      weight: 0.93,
      reason: 'Promises unrealistic guaranteed trading returns or asks to deposit funds for VIP investment tips.',
      matchedText: rawMatch ? rawMatch[0] : 'guaranteed returns',
      actionStep:
        'SEBI registered brokers never promise guaranteed returns or recruit via WhatsApp. Never transfer money to personal accounts for investment.',
    });
  }

  // I. Impersonation & Emergency Wire Scam
  const impersonationEmergency =
    /(?:stuck\s+at\s+airport|medical\s+emergency|urgent\s+(?:rs\.?|\d+)\s+needed).*?(?:send\s+to|transfer\s+to|gpay|phonepe|paytm|upi|payment\s+handle)/i.test(
      normalized
    );

  if (impersonationEmergency) {
    const rawMatch = text.match(
      /(?:stuck\s+at\s+airport|medical\s+emergency|urgent\s+(?:rs\.?|\d+)\s+needed)/i
    );
    matches.push({
      ruleId: 'CRIT_IMPERSONATION_SCAM',
      category: 'impersonation',
      severity: 'high',
      weight: 0.93,
      reason: 'Urgent distress message asking for quick UPI transfer claiming to be an emergency.',
      matchedText: rawMatch ? rawMatch[0] : 'emergency money request',
      actionStep:
        'Call your friend or relative directly on their known phone number to verify before sending any money.',
    });
  }

  // J. Loan & Phishing Portals
  const fakeLoan =
    /(?:pre-approved\s+(?:instant\s+)?loan|0%\s+interest\s+loan|instant\s+loan\s+without\s+cibil)/i.test(
      normalized
    ) && /(?:https?:\/\/|bit\.ly|tinyurl|\.club|\.xyz)/i.test(normalized);

  if (fakeLoan) {
    const rawMatch = text.match(/(?:pre-approved\s+(?:instant\s+)?loan|0%\s+interest)/i);
    matches.push({
      ruleId: 'CRIT_LOAN_SCAM',
      category: 'other',
      severity: 'high',
      weight: 0.92,
      reason: 'Unsolicited instant 0% loan offer linking to an unverified domain.',
      matchedText: rawMatch ? rawMatch[0] : '0% interest loan offer',
      actionStep: 'Do not click links for unsolicited loan offers or download unknown loan apps.',
    });
  }

  // H. Courier / Customs Fee Hold
  const courierScam =
    /\b(indiapost|fedex|dhl|bluedart|courier|parcel|shipment)\b/i.test(normalized) &&
    /\b(held\s+at\s+customs|unpaid\s+duty|address\s+incomplete|fee\s+of\s+rs\.?\s*\d{2,4}|delivery\s+failed|reschedule\s+at)\b/i.test(
      normalized
    ) &&
    /\b(https?:\/\/|bit\.ly|tinyurl|is\.gd|link)\b/i.test(normalized);

  if (courierScam) {
    const rawMatch = text.match(
      /(?:held\s+at\s+customs|unpaid\s+duty|address\s+incomplete|delivery\s+failed)/i
    );
    matches.push({
      ruleId: 'CRIT_COURIER_CUSTOMS',
      category: 'courier_customs',
      severity: 'high',
      weight: 0.91,
      reason: 'Claims an undelivered parcel or customs fee requires immediate payment through an unofficial link.',
      matchedText: rawMatch ? rawMatch[0] : 'held at customs / unpaid fee',
      actionStep:
        'Postal and courier services do not ask for card payments via random SMS links. Check status using your official tracking number on the official carrier site.',
    });
  }

  // I. Suspicious Lookalike URLs / Link Shorteners
  const lookalikeUrls =
    /\b(?:https?:\/\/)?([a-z0-9-]+\.(?:xyz|top|site|club|buzz|work|loan|tk|ml|ga|cf|gq|bar))\b/i.test(
      normalized
    ) ||
    /\b(?:https?:\/\/)?([a-z0-9-]+(?:-kyc|-update|-verify|-portal|-support|-sbi|-hdfc|-bank)\.[a-z]{2,})\b/i.test(
      normalized
    ) ||
    /\b(bit\.ly|tinyurl\.com|is\.gd|t\.co|rb\.gy)\/[a-z0-9_-]+\b/i.test(normalized);

  if (lookalikeUrls && !fakeKyc && !courierScam) {
    const rawMatch = text.match(
      /(?:https?:\/\/)?(?:[a-z0-9-]+\.(?:xyz|top|site|club|tk|ml)|(?:bit\.ly|tinyurl\.com|is\.gd|t\.co)\/[a-z0-9_-]+)/i
    );
    matches.push({
      ruleId: 'MED_SUSPICIOUS_LINK',
      category: 'other',
      severity: 'medium',
      weight: 0.72,
      reason: 'Contains an unverified URL shortener or suspicious domain extension commonly used in phishing.',
      matchedText: rawMatch ? rawMatch[0] : 'shortened/unusual link',
      actionStep:
        'Do not open links with unverified web addresses or URL shorteners from unknown senders.',
    });
  }

  // J. Dynamic Extra Keywords from Remote Config
  for (const kw of extraKeywords) {
    if (kw && kw.trim().length > 2 && normalized.includes(kw.toLowerCase().trim())) {
      matches.push({
        ruleId: 'REMOTE_KEYWORD_MATCH',
        category: 'other',
        severity: 'medium',
        weight: 0.7,
        reason: `Matches emerging scam indicator: "${kw.trim()}".`,
        matchedText: kw.trim(),
        actionStep: 'Exercise caution and verify the source before proceeding.',
      });
      break;
    }
  }

  // --- 3. SYNTHESIZE VERDICT ---

  // Handle legitimate guards: if strong legitimate indicators and no high severity scam matches
  if (
    matches.length === 0 ||
    (hasOtpSafetyWarning && matches.every((m) => m.severity !== 'high')) ||
    (isBankTransactionAlert && matches.length === 0) ||
    (isGovernmentFactCheck && matches.length === 0) ||
    (isLegitDeliveryOtp && matches.length === 0)
  ) {
    const safeReasons = [];
    if (hasOtpSafetyWarning) {
      safeReasons.push('Contains standard official security advice not to share credentials.');
    }
    if (isBankTransactionAlert) {
      safeReasons.push('Standard bank account transaction notification with official dispute contact.');
    }
    if (isLegitDeliveryOtp) {
      safeReasons.push('Standard doorstep delivery code instruction with no fee or link demanded.');
    }
    if (isGovernmentFactCheck) {
      safeReasons.push('Official fact-check or security bulletin advisory.');
    }
    if (safeReasons.length === 0) {
      safeReasons.push('No known scam indicators, phishing patterns, or urgency threats detected.');
    }

    return {
      verdict: 'Safe',
      confidence: 0.92,
      scamType: 'none',
      reasons: safeReasons,
      actionSteps: [
        'Normal message. As a general rule, never share your password, OTP, or UPI PIN with unverified contacts.',
      ],
      stageDecided: 'stage0_rules',
      languageDetected: lang,
      matches: [],
    };
  }

  const highSeverityMatches = matches.filter((m) => m.severity === 'high');

  if (highSeverityMatches.length > 0) {
    const primary = highSeverityMatches[0];
    const maxConfidence = Math.max(...highSeverityMatches.map((m) => m.weight));

    return {
      verdict: 'Likely scam',
      confidence: maxConfidence,
      scamType: primary.category,
      reasons: matches.map((m) => `${m.reason} (Quote: "${m.matchedText}")`).slice(0, 3),
      actionSteps: Array.from(new Set(matches.map((m) => m.actionStep))).slice(0, 3),
      stageDecided: 'stage0_rules',
      languageDetected: lang,
      matches,
    };
  }

  // Moderate severity
  const primary = matches[0];
  return {
    verdict: 'Suspicious',
    confidence: primary.weight,
    scamType: primary.category,
    reasons: matches.map((m) => `${m.reason} (Quote: "${m.matchedText}")`).slice(0, 3),
    actionSteps: Array.from(new Set(matches.map((m) => m.actionStep))).slice(0, 3),
    stageDecided: 'stage0_rules',
    languageDetected: lang,
    matches,
  };
}
