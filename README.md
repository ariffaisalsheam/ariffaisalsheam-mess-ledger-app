# Mess Ledger

Transparent tracking and settlement for shared meals, built with Next.js and Firebase.

## Overview

Mess Ledger is a PWA that helps mess/hostel members track daily meals, expenses, and deposits with manager approvals. It uses Firebase for authentication, Firestore for data, Cloud Functions for push notifications, and ships with offline-ready PWA support.

## Features

- **Authentication** with Firebase (email/password or federated providers you enable).
- **Mess creation & join** flows with invite codes and role management (manager/member).
- **Meal tracking** with cut-off windows, guest meals, and per-day ledgers.
- **Expense & deposit submissions** that go through a pending queue for manager approval.
- **Notifications** via FCM; Cloud Functions fan out push messages to relevant members.
- **Reporting** with cached monthly summaries and per-member breakdowns.
- **PWA** install prompts, offline manifest, and Firebase Analytics.

## Tech stack

- Next.js 15 (App Router) with Turbopack for local dev.
- Firebase Auth, Firestore, Storage, Messaging, and Cloud Functions.
- Tailwind CSS with shadcn/ui + Radix primitives; lucide-react icons.
- next-pwa for service worker/manifest wiring.

## Project structure

- `src/app`: App Router entrypoints, global layout, styles, and splash page.
- `src/services/messService.ts`: All Firestore/domain operations (mess management, meals, approvals, reports, notifications).
- `src/lib/firebase.ts`: Firebase client initialization (reads `NEXT_PUBLIC_FIREBASE_*` env vars).
- `src/components`: UI building blocks, PWA install helpers, analytics and notification handlers.
- `functions/`: Firebase Cloud Functions (push notification fan-out).
- `public/`: PWA assets, manifest, service workers (including `firebase-messaging-sw.js`).
- `docs/`: Blueprint and technical notes.

## Prerequisites

- Node.js 18+ and npm.
- A Firebase project with Auth, Firestore, Storage, and Cloud Messaging enabled.
- Firebase CLI for deploying hosting/functions (`npm install -g firebase-tools`).

## Setup

1) Install dependencies:
```bash
npm install
```

2) Create `.env.local` with your Firebase client config:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...   # Required for web push
```

3) Align the Firebase Messaging service worker with the same project credentials by updating `public/firebase-messaging-sw.js` (it currently contains placeholder config).

4) Run the app (defaults to port 9002):
```bash
npm run dev
```

## Useful scripts

- `npm run dev` – start Next.js with Turbopack.
- `npm run lint` – lint the project.
- `npm run typecheck` – TypeScript checks.
- `npm run build` / `npm run start` – production build and serve.

## Firebase & notifications

- Firestore and Storage rules live in `firestore.rules` and `storage.rules`.
- Cloud Function `functions/src/index.ts` listens to `messes/{messId}/notifications` and pushes FCM messages to stored user tokens.
- Web push requires a valid `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, the matching `firebase-messaging-sw.js` config, and user permission (requested in `NotificationHandler`).

## Deployment

- Build locally with `npm run build` to validate before deploying.
- For Firebase Hosting + Functions, ensure you have `firebase-tools` configured, then:
```bash
firebase deploy --only hosting,functions
```

## Further reading

- `docs/architecture.md` for a deeper technical overview.
- `docs/blueprint.md` for the product/UX blueprint.
