# Project Completion Report: Wary — Hybrid-AI Scam & Data-Leak Shield

> **Hackathon:** #BuildHybridAI 2026 (Firebase AI Logic Hybrid Inference)  
> **Submission Deadline:** November 30, 2026, 2:00 PM PST  
> **License:** Apache-2.0  
> **Production Live URL:** [https://waryapp.web.app](https://waryapp.web.app)  
> **Firebase Project:** `waryapp` (Project ID: `waryapp`, Project Number: `411348456286`)  
> **Date:** November 19, 2026  

---

## 1. Executive Summary

**Wary** is a privacy-first, hybrid-AI progressive web application (PWA) designed to protect citizens, families, and elders—specifically in regions heavily targeted by mobile cyber-fraud such as India—against financial scams, social engineering, identity theft, and accidental data leaks.

### Core Promise
> *"A second pair of eyes that never reads your messages out loud."*

Wary operates on an **on-device first, private-by-default** model. Rather than transmitting raw personal messages, bank alerts, or credentials to remote AI servers, Wary evaluates content on-device first, and guarantees that any cloud escalation occurs **strictly on client-side redacted text**.

---

## 2. Technical Stack & Dependencies

- **Frontend Core:** Vite 8 + React 19 + TypeScript 7
- **Styling & Design System:** Tailwind CSS v4, Lucide React icons, mobile-first accessible architecture (WCAG AAA contrast, `prefers-reduced-motion` compliance)
- **Firebase JS SDK (v13.4.0):**
  - `firebase/app`: Modular app initialization
  - `firebase/ai`: `getAI`, `getGenerativeModel`, `GoogleAIBackend`, `InferenceMode` (`PREFER_ON_DEVICE` & `ONLY_IN_CLOUD`), and user-gesture `initializeDeviceModel`
  - `firebase/app-check`: `initializeAppCheck`, `ReCaptchaV3Provider`, `CustomProvider`, with debug token support
  - `firebase/remote-config`: `getRemoteConfig`, `fetchAndActivate`, `getValue` for runtime dynamic tuning
  - `firebase/firestore`: Cloud Firestore for Family Circle alerts with strict security rules
  - `firebase/auth`: Google Sign-In with demo-user profile switching for multi-user testing
  - `firebase/hosting`: PWA hosting with HTTP cache-control headers and service worker rewrites
- **Storage & Client-Side Engines:**
  - `idb`: IndexedDB wrapper for the local cryptographic Privacy Ledger
  - `tesseract.js`: Dynamically imported client-side OCR for screenshot scanning (100% on-device)
  - `vite-plugin-pwa`: Workbox service worker generation, offline caching, and Web Manifest
- **Testing & Quality Assurance:**
  - `vitest`: Unit tests and 61-sample evaluation benchmark (`/eval`)
  - `oxlint`: High-performance static code analysis

---

## 3. What Was Built: Architecture & Features

### 3.1 Three-Stage Hybrid Pipeline
Wary implements a 3-stage single-turn hybrid inference pipeline:

```
[User Input: Pasted SMS or Dropped Screenshot]
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ Stage 0: Deterministic Rules Engine                   │
│ • Runs 100% on-device with zero AI and offline.       │
│ • Scans for OTP theft, UPI PIN tricks, digital arrest, │
│   fake KYC links, urgency threats, utility power cuts. │
└───────────────────────┬────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
[High Confidence Match]     [General or Borderline Text]
         │                             │
         │                             ▼
         │          ┌────────────────────────────────────────┐
         │          │ Stage 1: Firebase AI Logic On-Device   │
         │          │ • Gemini Nano (PREFER_ON_DEVICE).      │
         │          │ • User gesture download init.          │
         │          │ • Structured JSON output. Zero bytes   │
         │          │   leave the device.                    │
         │          └──────────────────┬─────────────────────┘
         │                             │
         │           ┌─────────────────┴─────────────────┐
         │           ▼                                   ▼
         │   [Confidence >= Threshold]          [Confidence < Threshold /
         │           │                           Model Unavailable / User Tap]
         │           │                                   │
         │           │                                   ▼
         │           │          ┌────────────────────────────────────────────┐
         │           │          │ Stage 2: Redacted Cloud Fallback           │
         │           │          │ • Client-side Redactor strips all phones,  │
         │           │          │   accounts, cards, IDs, emails, & names.   │
         │           │          │ • Outbound payload logged in Privacy Ledger│
         │           │          │ • Cloud model evaluates redacted text.     │
         │           │          │ • Local un-redaction restores user tokens. │
         │           │          └───────────────────────┬────────────────────┘
         │           │                                  │
         ▼           ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Verdict Card: Safe / Suspicious / Likely Scam                              │
│ • Confidence gauge, scam category, quoted risky phrases, action steps.     │
│ • "A second opinion, not a guarantee."                                     │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Client-Side Redactor (`src/services/redactor.ts`)
The on-device redactor runs *before* any text leaves the device, replacing sensitive tokens with typed placeholders:
- Phone numbers (`+91...`, 10-digit mobile formats) $\rightarrow$ `[PHONE_1]`
- Bank accounts & card numbers $\rightarrow$ `[ACCOUNT_1]`, `[CARD_1]`
- National identity IDs (Aadhaar 12-digit, PAN alphanumeric) $\rightarrow$ `[AADHAAR_1]`, `[PAN_1]`
- UPI VPAs & payment handles $\rightarrow$ `[UPI_ID_1]`
- Email addresses $\rightarrow$ `[EMAIL_1]`
- URL query strings (preserving malicious domains/paths for scam detection while wiping tracking tokens) $\rightarrow$ `[URL_QUERY_1]`
- Personal names $\rightarrow$ `[NAME_1]`
- `restoreRedactions`: Restores placeholders locally into the final verdict explanation.

### 3.3 Signature Feature: The Privacy Ledger (`src/services/privacyLedger.ts`)
- Stored exclusively in the user's browser IndexedDB (`wary_privacy_ledger`).
- Logs every scan: timestamp, pipeline stage, exact outbound byte size, redacted tokens count, and exact redacted payload.
- Zero outbound bytes recorded for Stage 0 (Rules) and Stage 1 (On-Device AI).
- Complete user sovereignty: View logs, inspect exact outbound strings, export to JSON or CSV, or permanently delete all records with one click.
- **Zero raw text is ever stored on any server or in Firestore.**

### 3.4 Family Circle Realtime Protection (`src/services/familyCircle.ts`)
- Allows users to create a circle or join via a 6-character invite code (e.g., `SHAR99`).
- If an elder or family member opts in and receives a "Likely scam" verdict, a real-time alert is broadcast to all circle members via Firestore snapshot listeners.
- **Strict Privacy Guarantee:** Only the scam category (e.g. `electricity_disconnection`), severity, sender display name, and timestamp are transmitted.
- **Firestore Security Rules Enforcement (`firestore.rules`):**
  - Rejects any document containing `content`, `message`, `text`, `raw`, `redacted`, `phone`, or `account`.
  - Accessible only by authenticated circle members.

### 3.5 Remote Config & Dynamic In-App Tuning (`src/services/remoteConfigService.ts`)
- Parameters fetched and activated via Firebase Remote Config:
  - `pattern_pack_version`: Tracks active fraud pattern release (e.g., `2026.11.20-base`).
  - `escalation_confidence_threshold`: Configurable confidence bar (default: `0.85`) triggering Stage 2 cloud escalation.
  - `prompt_version`: Versioned model system prompt.
  - `local_only_mode`: Kill switch that completely blocks all cloud calls.
  - `banner_message`: Broadcast advisory banner.
  - `extra_keywords`: Dynamic emerging scam phrases.
- Includes in-app simulation controls in the Settings modal so judges and testers can immediately test threshold changes, kill-switch toggling, and rule pack updates without waiting for console deployment.
- Resilient in-app defaults ensure full functionality even if network fetch fails.

### 3.6 Check Screen & Sample Gallery (`src/components/CheckScreen.tsx`)
- Drag-and-drop screenshot dropzone powered by client-side OCR (`tesseract.js` dynamically loaded to keep bundle size lightweight).
- Text paste input with character count and `Ctrl+Enter` shortcut.
- 12 realistic quick-test samples (8 scams + 4 legitimate messages across English, Hindi, and Kannada) allowing instant 10-second verification.

### 3.7 Multilingual Support (`src/data/i18n.ts`)
- Native translation strings for **English**, **Hindi (हिंदी)**, and **Kannada (ಕನ್ನಡ)**.
- Script and transliteration recognition for Indic languages.

---

## 4. Evaluation Harness & Quality Verification

### 4.1 Evaluation Dataset (`src/eval/dataset.ts`)
An automated test suite evaluated 61 synthetic, labeled benchmark cases:
- **26 Scam Cases:** OTP theft, fake KYC, digital arrest, courier/customs duty, YouTube task job offers, lucky draw lotteries, UPI collect requests, electricity disconnection threats, crypto/stock trading fraud, and impersonation.
- **25 Legitimate Cases:** Bank debit transaction SMS, legitimate net-banking OTP notices with non-disclosure warnings, doorstep delivery PIN alerts, utility payment receipts, flight/train tickets, doctor appointments, and government advisories.
- **10 Tricky Borderline Cases:** Payment reminders with official links, school fee notices, broadband expiries, job interviews, and friend money requests.

### 4.2 Benchmark Results (`npm test`)

```
========================================================================================
                      WARY HYBRID-AI EVALUATION RESULTS HARNESS
========================================================================================
Dataset Breakdown:
  • Total Evaluated Samples:     61 (English, Hindi, Kannada)
  • Synthetic Scam Messages:     26
  • Legitimate Daily Messages:   25
  • Tricky Borderline Cases:     10

Performance Metrics:
  ┌───────────────────────┬──────────────┬────────────────────────┬────────────────────┐
  │ Pipeline Mode         │ Accuracy     │ False Positive Rate    │ Target Threshold   │
  ├───────────────────────┼──────────────┼────────────────────────┼────────────────────┤
  │ Stage 0 (Rules Only)  │       100.0% │                   0.0% │ < 5.0%             │
  │ Hybrid Pipeline       │       100.0% │                   0.0% │ < 5.0%             │
  └───────────────────────┴──────────────┴────────────────────────┴────────────────────┘

Decision Stages Breakdown:
  • Stage 0 (Deterministic Rules):    61 (100% of benchmark resolved locally)
  • Stage 1 (On-Device AI):          0 (Ready on Chrome Desktop with model download)
  • Stage 2 (Redacted Cloud Fallback):0 (Activated on escalation or user second opinion)
========================================================================================
```

- **Accuracy:** 100.0%
- **False Positive Rate:** 0.0% (Zero legitimate messages misclassified as scams)
- **Unit Test Coverage:** 24 passing tests (10 redactor tests, 13 rules engine tests, 1 evaluation test).
- **Linter Status:** `oxlint` reported 0 errors and 0 warnings.

---

## 5. Live Firebase Deployment Details

- **Hosting URL:** [https://waryapp.web.app](https://waryapp.web.app)
- **Firebase Project Console:** [https://console.firebase.google.com/project/waryapp/overview](https://console.firebase.google.com/project/waryapp/overview)
- **App ID:** `1:411348456286:web:92b228f879bc785e5375cf`
- **Security Rules:** Deployed to Cloud Firestore (`firestore.rules`).
- **PWA Manifest & Service Worker:** Verified returning `HTTP 200` with standalone installation support.

---

## 6. Repository Structure & Key Files

```
Wary/
├── .env.example                      # Documented environment variables template
├── .env.local                        # Local project configuration (gitignored)
├── .firebaserc                       # Firebase project configuration (points to waryapp)
├── .gitignore                        # Git ignore rules (protects credentials & cache)
├── firebase.json                     # Firebase Hosting & Firestore rules configuration
├── firestore.rules                   # Schema security rules (forbids content in alerts)
├── index.html                        # PWA entry HTML with meta headers & manifest link
├── package.json                      # Scripts, dependencies, and metadata
├── public/
│   ├── favicon.svg                   # Shield & eye brand SVG icon
│   ├── wary-icon-192.png             # 192x192 PWA maskable icon
│   └── wary-icon-512.png             # 512x512 PWA maskable icon
├── src/
│   ├── App.tsx                       # Main application shell & state orchestration
│   ├── components/
│   │   ├── CheckScreen.tsx           # Text input, dropzone, and 12-sample gallery
│   │   ├── FamilyCircleModal.tsx     # Family Circle auth, code joining, & live alerts
│   │   ├── Header.tsx                # Brand, language, model pill, & offline toggle
│   │   ├── ModelStatusBanner.tsx     # AI engine routing status & user download trigger
│   │   ├── PrivacyLedgerModal.tsx    # IndexedDB audit viewer, inspection, & export
│   │   ├── SettingsModal.tsx         # Remote Config tuner, kill switch, & App Check
│   │   └── VerdictCard.tsx           # High-contrast verdict, reasons, & action steps
│   ├── data/
│   │   ├── i18n.ts                   # English, Hindi, and Kannada translation strings
│   │   └── samples.ts                # 12 interactive quick-test samples
│   ├── eval/
│   │   ├── dataset.ts                # 61 labeled synthetic test samples
│   │   └── eval.test.ts              # Automated evaluation benchmark harness
│   ├── services/
│   │   ├── familyCircle.ts           # Circle creation, joining, & metadata-only alerts
│   │   ├── firebaseConfig.ts         # Firebase App, AI, Auth, Firestore, & App Check
│   │   ├── hybridAI.ts               # 3-stage hybrid inference pipeline
│   │   ├── ocrService.ts             # On-device Tesseract.js image text extraction
│   │   ├── privacyLedger.ts          # IndexedDB cryptographic ledger & export
│   │   ├── redactor.ts               # On-device regex redactor & local restorer
│   │   ├── redactor.test.ts          # Unit tests proving sensitive tokens are stripped
│   │   ├── remoteConfigService.ts    # Remote Config listener & in-app simulation
│   │   ├── rulesEngine.ts            # Stage 0 deterministic pattern matcher
│   │   └── rulesEngine.test.ts       # Unit tests for rules detection & safe guards
│   └── types/
│       └── index.ts                  # Shared TypeScript interfaces & types
├── LICENSE                           # Apache-2.0 License
├── README.md                         # Comprehensive project documentation
└── report.md                         # This completion report
```

---

## 7. Acceptance Criteria Verification Checklist

- [x] `npm run build`, `lint`, and `tests` pass without errors.
- [x] Pasting each sample returns a sensible verdict; legitimate samples are not flagged as scams (0.0% FPR).
- [x] Stage 0 works with the model unavailable and with network disconnected ("Simulate Offline" mode).
- [x] Redactor tests pass; the Privacy Ledger shows the exact redacted payload for cloud calls.
- [x] Cloud fallback works gracefully on non-Chrome browsers.
- [x] Family Circle alert appears for a second signed-in user, with zero message content in Firestore.
- [x] Changing Remote Config values changes behavior in real time without redeployment.
- [x] Lighthouse PWA and accessibility requirements satisfied (manifest, icons, service worker, AAA contrast).
- [x] `/eval` results are documented in `README.md`.
- [x] Deployed to Firebase Hosting (`https://waryapp.web.app`) and verified operational.

---

*Report prepared by Wary Development Team for #BuildHybridAI 2026 Hackathon.*
