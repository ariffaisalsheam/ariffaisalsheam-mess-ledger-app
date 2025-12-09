# Architecture Overview

This project is a Next.js (App Router) PWA backed by Firebase services. It focuses on mess/hostel meal tracking, expense/deposit approvals, notifications, and reporting.

## Key pieces

- **Firebase bootstrap**: `src/lib/firebase.ts` reads `NEXT_PUBLIC_FIREBASE_*` env vars to initialize Auth, Firestore, Storage, and Messaging (messaging only in the browser).
- **Domain services**: `src/services/messService.ts` centralizes all Firestore reads/writes and business logic:
  - User profile upsert, avatar updates, and FCM token storage.
  - Mess lifecycle: create mess with defaults, join via invite code, rename, transfer manager, remove member, delete mess.
  - Member data helpers and realtime listeners (members, pending counts).
  - Pending queues for deposits/expenses with approve/reject flows that adjust balances and summary totals.
  - Meal tracking (per-day documents, guest meals, cut-off defaults) and mess-wide history.
  - Reporting with cached monthly summaries (`monthlyReports` collection) and cache invalidation.
  - Notification creation utilities used by approval and guest-meal flows.
- **UI helpers & hooks**:
  - PWA install experience (`use-pwa-install`, `PwaInstallProvider`, `InstallPromptBanner`, install buttons).
  - `NotificationHandler` requests permission, registers FCM tokens, and surfaces foreground toasts.
  - `useFirestorePagination` for paginated Firestore lists; `useIsMobile` for responsive logic.
  - `Analytics` wires Firebase Analytics on route changes.
- **Cloud Functions**: `functions/src/index.ts` listens to `messes/{messId}/notifications/{notificationId}` and sends web push notifications to stored user tokens, cleaning up invalid tokens.
- **PWA assets**: `public/manifest.json`, `public/sw.js`, and `public/firebase-messaging-sw.js` (must be updated to your Firebase project config).
- **Genkit**: `src/ai/genkit.ts` initializes Genkit with the Google AI plugin; `src/ai/dev.ts` is a stub for local flow loading.

## Data model (Firestore)

- `users/{userId}`: `uid`, `email`, `displayName`, `photoURL`, `messId`, `role`, `fcmTokens`.
- `messes/{messId}`:
  - `name`, `managerId`, `inviteCode`, `mealSettings` (cutoff times & toggles), `summary` (`totalExpenses`, `totalDeposits`, `totalMeals`, `mealRate`).
  - Subcollections:
    - `members/{memberId}`: `name`, `email`, `role`, `balance`, `meals`.
      - `meals/{YYYY-MM-DD}`: per-day `breakfast`, `lunch`, `dinner`, guest meal counts, `isSetByUser`.
    - `expenses` and `deposits`: approved records.
    - `pendingExpenses` and `pendingDeposits`: queued edits/adds/deletes with `status` and originals.
    - `notifications`: notification payloads targeted at members or managers.
    - `guestMealLog`: guest meal submissions with host metadata.
- `monthlyReports/{messId_year_month}`: cached monthly report payloads (read-only to clients).

## Notable flows

- **Mess creation**: `createMess` seeds defaults, marks creator as manager, and adds first member.
- **Joining**: `joinMessByInviteCode` validates code, links the user profile to the mess, and seeds member data.
- **Approvals**: `approveDeposit/approveExpense` move pending items into live collections and adjust member balances and mess summary totals; rejects delete the pending docs and notify the requester.
- **Meals**: `updateMealForDate` and `logGuestMeal` recalculate `summary.totalMeals` and `mealRate`; `ensureDailyMealDocs` seeds missing day entries.
- **Notifications**: App code writes to `messes/{messId}/notifications`; the Cloud Function fans out FCM messages to tokens stored on user docs.
- **Reports**: `generateMonthlyReport` aggregates expenses, deposits, and meal counts per member, caches the result, and can be invalidated with `invalidateMonthlyReportCache`.

## Local development & deployment notes

- Keep `.env.local` in sync with `public/firebase-messaging-sw.js` for messaging to work. `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is required for web push.
- The dev server runs on port 9002 via `npm run dev`; PWA support is enabled in development through `next-pwa`.
- Cloud Functions require their own install: `cd functions && npm install`, then `firebase deploy --only functions` (or `firebase emulators:start` if you prefer an emulator workflow).
