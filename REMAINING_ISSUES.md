# MARGIN — Remaining Issues & Environmental Requirements (`REMAINING_ISSUES.md`)

**Date:** November 2026  
**Application:** MARGIN Continuity Platform

This document details verified operational boundaries, environment prerequisites, and external service configurations.

---

## 1. On-Device AI Gemini Nano Requirements

### Status: Verified Fallback (Graceful Degradation)
- **Constraint:** Real on-device inference via `InferenceMode.PREFER_ON_DEVICE` requires Chrome desktop (version 128+) with built-in Gemini Nano enabled:
  - `chrome://flags/#prompt-api-for-gemini-nano` set to **Enabled**.
  - `chrome://flags/#optimization-guide-on-device-model` set to **Enabled BypassPerfRequirement**.
  - Components downloaded under `chrome://components` (Optimization Guide On Device Model).
- **Behavior in other environments:**
  - In browsers lacking `window.ai` or Gemini Nano (such as Safari, Firefox, mobile browsers, or standard Edge), Margin detects this state and directs requests to Firebase AI Logic cloud inference (`gemini-2.5-flash`).
  - If network or App Check is unavailable, Margin engages its deterministic local parser.
  - **Verdict:** Fully functional with graceful degradation.

---

## 2. Firebase Authentication Console Configuration

### Status: Operational with Local Fallback
- **Observation:** During automated testing, calling `signInAnonymously()` returned `auth/admin-restricted-operation`. This occurs when the "Anonymous" sign-in provider is disabled in the Firebase Console under **Authentication > Sign-in method**.
- **Behavior in MARGIN:**
  - `authService.ts` catches this warning and initializes a local guest profile (`Guest Contributor`), allowing offline and local development to function without interruption.
  - Google Sign-In (`signInWithGoogle`) is available via the Settings modal for real authenticated sessions.
- **Action for Production Administrator:**
  - Enable "Anonymous" provider in Firebase Console under Authentication -> Sign-in method if anonymous guest accounts are desired.

---

## 3. Firebase App Check in CI / Headless Test Runners

### Status: Documented & Handled
- **Observation:** In headless Node.js environments (such as `vitest run`), reCAPTCHA v3 provider tokens cannot be minted by the browser environment, resulting in a `401 Unauthorized (AI/fetch-error)` from `firebasevertexai.googleapis.com`.
- **Behavior in MARGIN:**
  - Margin's AI Logic service intercepts this fetch error and falls back to deterministic context synthesis and Relay generation.
  - In live browsers on `https://waryapp.web.app`, App Check executes standard reCAPTCHA v3 token generation.

---

## 4. Real-Time Collaborative Space Sync

### Status: Implemented via Firestore Pull/Push
- **Current Architecture:** Margin persists state to IndexedDB with automatic cloud synchronization to Cloud Firestore whenever online.
- **Future Enhancement:** While space records are synchronized on save, true real-time multi-cursor collaboration via `onSnapshot` listeners across simultaneous editors in the same space can be added as a subsequent layer over the existing `marginRepository`.
