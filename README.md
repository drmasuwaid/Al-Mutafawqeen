# Al-Mutafawqeen Live Homework

Homework board for **Al-Mutafawqeen Secondary School**. Teachers publish assignments; students and other staff see them on every open device through **Firebase Firestore live listeners**.

The original backup zip was not available in this cloud workspace, so this is a rebuilt, Firebase-backed app rather than a patch of the Dropbox archive.

## What you get

- Role-based access: principal, teacher, student
- Arabic / English, with RTL
- Live board: new homework and completions stream in without refresh
- Firebase Auth + Cloud Firestore (emulator locally, your project in production)
- Security rules for a later client-SDK move

## Run locally (Firebase emulator)

You need Node 20+ and Java (for the Firestore emulator).

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Every demo account uses password `LiveSync2026`:

| Role | Email |
| --- | --- |
| Principal | `noura.admin@mutafawqeen.school` |
| Arabic teacher | `layla.arabic@mutafawqeen.school` |
| Math teacher | `omar.math@mutafawqeen.school` |
| Student, 4th Sci. A | `ahmed.g4a@mutafawqeen.school` |
| Student, 4th Sci. A | `sara.g4a@mutafawqeen.school` |
| Student, 5th Sci. A | `fatima.g5a@mutafawqeen.school` |

To see live sync: sign in as the Arabic teacher in one window and as Ahmed in another, then publish a homework item.

## Use your own Firebase project

1. Create a Firebase project and enable **Authentication (Email/Password)** and **Cloud Firestore**.
2. Copy `env.example` to `.env.local` and fill in the values.
3. Deploy `firebase/firestore.rules`.
4. Create a service account JSON, put it in `FIREBASE_SERVICE_ACCOUNT`.
5. Seed users or create matching `users/{uid}` documents (role, class, subjects).
6. Run `npm run dev:next` (no emulator) or `npm run build && npm start`.

Do not set `FIRESTORE_EMULATOR_HOST` or `FIREBASE_AUTH_EMULATOR_HOST` in production.

## Architecture

Browsers talk only to this Next.js app. The server uses the Firebase Admin SDK and pushes Firestore snapshots over **Server-Sent Events** (`/api/homework/stream`). That keeps a single public port for preview while still using Firebase as the live source of truth.
