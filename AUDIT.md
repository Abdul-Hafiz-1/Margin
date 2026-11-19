# MARGIN — Comprehensive System & Security Audit (AUDIT.md)

**Audit Date:** November 2026  
**Target:** MARGIN Continuity Platform  
**Target URL:** [https://waryapp.web.app](https://waryapp.web.app)  
**Repository:** [https://github.com/Abdul-Hafiz-1/Margin](https://github.com/Abdul-Hafiz-1/Margin)  

---

## 1. Actual Application Architecture

The application is structured as a Vite + React 19 single-page application using TypeScript and Tailwind CSS v4.
- **Entry & Layout:** `index.html` mounts `src/main.tsx` -> `src/App.tsx`.
- **Navigation Shell:** `Navigation.tsx` provides desktop sidebar and mobile bottom navigation with tabs: `home`, `spaces`, `activity`, `search`.
- **Workspaces:** Clicking a space mounts `SpaceWorkspace.tsx`.
- **Modals:** `CaptureModal.tsx`, `RelayModal.tsx`, `ReEntryModal.tsx`, `SettingsModal.tsx`.
- **Data Layer:** `marginRepository.ts` wraps an IndexedDB database (`margin_continuity_db`) with object stores for `spaces`, `records`, `relationships`, `activity`, `relays`, `reEntries`, `aiLogs`, and `pendingSync`.
- **Cloud Layer:** `firebaseConfig.ts` initializes Firebase App, Auth, Firestore, and AI Logic (`@firebase/ai`).

---

## 2. Actual Firestore Data Schema

The actual application attempts to write flat root collections:
1. `/spaces/{spaceId}`: `{ id, name, description, ownerId, type, color, members, createdAt, updatedAt, stats }`
2. `/records/{recordId}`: `{ id, spaceId, type, title, content, status, author, createdAt, updatedAt, source, supportingRecordIds, tags, version, aiMetadata, history, syncStatus }`
3. `/relationships/{relId}`: `{ id, spaceId, sourceRecordId, targetRecordId, type, provenance, explanation, createdAt }`
4. `/relays/{relayId}`: `{ id, spaceId, createdAt, createdBy, objective, currentState, recentEvents, keyDecisions, verifiedObservations, unresolvedHypotheses, outstandingActions, suggestedNextSteps, selectedRecordIds, status, sharedWithUserIds, inferenceModeUsed }`

### Security Discrepancy & Vulnerability Found in `firestore.rules`:
The current `firestore.rules` uses:
```javascript
match /records/{recordId} {
  allow read, create, update: if isAuthenticated();
}
```
**CRITICAL FLAW:** This allows ANY authenticated user to read, create, or update ANY record in ANY space across the entire database, completely ignoring personal privacy boundaries, space ownership, and space membership. Personal records are NOT private in Firestore under these rules.

---

## 3. Actual Authentication Flow

- **Finding:** The application currently relies on a simulated user profile in React component state (`currentUser: { id: 'user-lead', name: 'Sarah Chen' }`).
- **Defect:** Real Firebase Authentication (`onAuthStateChanged`, `GoogleAuthProvider`, `signInWithPopup`, `signInAnonymously`, `signOut`) is NOT wired into `App.tsx` or `SettingsModal.tsx`.
- **Consequence:** 
  1. The browser is never authenticated with Firebase Auth (`auth.currentUser` is `null`).
  2. Because `auth.currentUser` is `null`, any direct Firestore call or queued sync fails with `permission-denied` under `firestore.rules`.
  3. All writes get permanently stuck in `pendingSync` in IndexedDB.
  4. Real multi-user collaboration and selective sharing cannot function until real Firebase Auth is integrated.

---

## 4. Actual Local Persistence & Sync Implementation

- **Finding:** IndexedDB (`idb`) is implemented and functional for local CRUD operations.
- **Defects Discovered:**
  1. **Sync Queue Reconnection Failure:** In `App.tsx`, `window.addEventListener('online', ...)` merely toggles `isOnline = true` but NEVER triggers `processPendingSyncQueue()`. When connectivity is restored, pending offline writes are never pushed.
  2. **Cache Cold-Start:** `reEntryCache` is initialized as empty and never populated from `getReEntry(spaceId)` on app mount, making Re-entry anchors unavailable on cold start until manually regenerated.
  3. **Node/SSR In-Memory Fallback:** The mock memory store in `marginRepository.ts` works well for Vitest tests, but does not index relationships by space accurately in all queries.

---

## 5. Actual Firebase AI Logic Implementation

- **Finding:** The SDK is imported from `firebase/ai` (`getAI`, `getGenerativeModel`, `InferenceMode`, `GoogleAIBackend`).
- **Defects Discovered:**
  1. **Top-Level Model Configuration Deprecation:** In `src/services/marginAI.ts`, `analyzeContextConnections` calls `getGenerativeModel(ai, { model: 'gemini-2.5-flash', ... })` without specifying `mode` or `inCloudParams`, causing `@firebase/ai` runtime deprecation warnings.
  2. **Inference Mode Assumption:** In `marginAI.ts`, line 75 previously guessed `mode = hardware.hasPromptAPI ? 'on_device' : 'in_cloud'`. 
     *SDK Inspection Reality:* `@firebase/ai` actually attaches `response.response.inferenceSource` (`'on_device'` or `'in_cloud'`) via `InferenceSource` directly to the response object! We must read `result.response.inferenceSource` to accurately report real verified inference.

---

## 6. Functional Requirements Audit (A through J)

| Area | Requirement | Current Status | Issues Discovered |
|---|---|---|---|
| **A. Auth** | Sign-up, Sign-in, Sign-out, Session persistence, Identity | **NOT FUNCTIONAL** | No Firebase Auth listeners; hardcoded user profile state. |
| **B. Spaces** | Create, Rename, Open, Switch, Archive, Private vs Shared | **PARTIALLY FUNCTIONAL** | Create and switch work; no Rename or Archive space buttons in UI; rules do not enforce private vs shared. |
| **C. Capture** | Text, Voice, AI Classification, Space Picker, Offline | **FUNCTIONAL** | Modal works, hotkey `C` works, voice dictation works where supported, offline queues. |
| **D. Living Context** | 5 Record types, Provenance, Version history, Relationships | **PARTIALLY FUNCTIONAL** | Displays 5 types, creates links; NO UI for editing existing records (version increment is unreachable from UI). |
| **E. Relay** | Grounded handoff briefing, Review/Edit, Markdown copy | **FUNCTIONAL** | Relay generator compiles grounded records, Markdown copy works, editing works. |
| **F. Re-entry** | Where left off, changes, unresolved items, next action | **PARTIALLY FUNCTIONAL** | Works when triggered, but cache is lost on reload because IndexedDB cache is not read on mount. |
| **G. Hybrid AI** | On-device check, Cloud fallback, Deterministic rule kernel | **FUNCTIONAL WITH FLAW** | Fallback works 100%, but inference mode was assumed instead of reading `response.response.inferenceSource`. |
| **H. Offline & Sync** | Offline reads/writes, Pending queue, Auto-reconnect sync | **PARTIALLY FUNCTIONAL** | Offline reads/writes work; Auto-sync on `online` event is missing. |
| **I. Activity & Search** | Real events timeline, Multi-criteria filter, Search | **FUNCTIONAL** | Timeline and search work across records and spaces. |
| **J. Settings** | Account switcher, AI audit table, Sync trigger, Offline toggle | **PARTIALLY FUNCTIONAL** | Audit table and simulated offline toggle work; Auth controls are mock only. |

---

## 7. Security Audit & Repair Plan

### Vulnerabilities:
1. `firestore.rules` currently allows any authenticated user to read all records across all spaces.
2. Space documents do not validate whether the user creating the space matches `request.auth.uid`.
3. Records do not validate whether the user writing the record is a member of the space.

### Correct Security Model Architecture:
- Users may read personal spaces only if `resource.data.ownerId == request.auth.uid`.
- Users may read shared spaces only if `request.auth.uid in resource.data.members.map(m => m.userId)` or `resource.data.ownerId == request.auth.uid`.
- Records, Relationships, and Relays must enforce that `request.auth.uid` is a member of the parent space (`get(/databases/$(database)/documents/spaces/$(spaceId))`).
- Viewers may not write or update records; only Owners and Editors.
