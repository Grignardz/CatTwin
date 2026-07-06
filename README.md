# CatTwin AI

Your cat's AI-powered health companion — track weight, feeding, sleep, activity,
and vet schedules, get an AI-generated "Digital Twin" health score and 30-day
prediction, chat with a Gemini-powered vet assistant, and run body-condition
photo analysis. Installable as a home-screen app (PWA) on Android and desktop.

All personal data (profile, cats, logs, chat history, photo scans) stays
**on-device** in `localStorage` / `IndexedDB` — there is no backend server and
no database. The only network calls the app makes are to Google's Gemini API
(via Firebase AI Logic) for the AI features, and to Firebase Auth for optional
Google sign-in.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Firebase setup](#firebase-setup-required-for-ai--google-sign-in)
- [Available scripts](#available-scripts)
- [Deployment](#deployment-vercel)
- [Data & privacy model](#data--privacy-model)
- [Known limitations](#known-limitations)

## Features

### Core tracking (works fully offline, no AI required)
- **Cat profiles** — name, breed, age, DOB, weight, gender, color, environment,
  allergies, existing conditions, medical notes, microchip ID, neuter status,
  and a photo.
- **Health logs** — weight history, sleep/activity + manual Body Condition
  Score (BCS) entries, hydration (water intake) logs.
- **Feeding / Food plan** — scheduled meals with a themed time picker and
  per-meal reminder toggles.
- **Vet schedule** — vaccinations and deworming with due-date status
  (Complete / Due Soon / Not Due), plus a separate Medical History log for
  past events (no status picker — it's a history record, not a schedule).
- **Analytics** — trend charts across weight, sleep, activity, and hydration.
- **Reports** — generates a shareable PDF health report (via `jspdf`)
  summarizing profile, logs, and the computed Digital Twin data.
- **Notifications center** — in-app feed of feeding reminders, upcoming vet
  items, and health-risk flags, computed live from your logged data on every
  visit (dismissals persist).
- **Themed pickers** — custom date, time, and age pickers matching the app's
  visual style instead of native browser inputs.

### AI features (require Firebase — see [setup](#firebase-setup-required-for-ai--google-sign-in))
All AI calls go straight from the browser to Google's Gemini API through the
**Firebase AI Logic** SDK — there is no proxy server holding your data.

- **AI Digital Twin** — a rule-based engine (`src/lib/digitalTwin.ts`) computes
  per-module health scores (body condition, weight, nutrition, hydration,
  sleep, activity, stress, vaccination, medical risk) plus an overall score,
  confidence rating, and a 30-day weight/health prediction — all from plain
  statistics on your own logs, so the numbers are deterministic and
  reproducible. Gemini (`src/lib/geminiPrediction.ts`) then writes the
  natural-language "AI Summary" and prediction insight describing those
  already-computed numbers — it never invents the scores themselves.
- **AI Assistant (chat)** — a Gemini-powered vet-assistant chatbot
  (`src/lib/geminiChat.ts`) grounded in your cat's actual logged data via a
  generated system instruction, so answers reflect real history instead of
  generic advice. Conversation history is normalized before each request to
  satisfy Gemini's strict `user → model` turn alternation.
- **AI Photo Scan** — upload a cat photo for body-condition score, weight
  estimate, obesity risk, and coat-condition analysis
  (`src/lib/geminiVision.ts`), using structured JSON output validated against
  a schema. Images are resized client-side via `<canvas>`
  (`src/lib/imageUtils.ts`) and results + photos are stored in IndexedDB
  (`src/lib/indexedDb.ts`) — nothing is uploaded anywhere except directly to
  Gemini for analysis.
- Reachable from the bottom nav's **Chat** button, which opens a chooser
  between "AI Assistant" and "AI Photo Scan" instead of hiding the photo
  feature inside the chat screen.

### Auth
- Email/password auth, fully local (`src/lib/auth.tsx` — accounts stored in
  `localStorage`, passwords hashed client-side).
- **Google sign-in** via Firebase Authentication (`signInWithPopup`) — creates
  or matches a local account by email; Firebase Auth is only used to verify
  the Google identity, the resulting account still lives in the same local
  store as email/password accounts.

### PWA / installability
- Web app manifest + generated icon set (192/512, regular and maskable) so the
  app can be installed to a phone or desktop home screen.
- Custom **"Install CatTwin"** popup (`src/components/InstallPrompt.tsx`,
  `src/lib/installPrompt.ts`) that listens for the browser's native
  `beforeinstallprompt` event and shows an on-brand prompt after a short
  delay, with a 7-day snooze after dismissal — instead of relying purely on
  the browser's own (inconsistent, browser-dependent) install banner.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing via TanStack Router) |
| Build | Vite 8 + [Nitro](https://nitro.build) (via `@lovable.dev/vite-tanstack-config`) |
| Styling | Tailwind CSS v4 + custom CSS variables (coral/warm theme, light & dark mode) |
| Animation | Framer Motion |
| AI | Firebase AI Logic (Gemini `2.5-flash`) — text, chat, structured JSON, and image input |
| Auth | Local (localStorage) + optional Firebase Authentication (Google) |
| Storage | `localStorage` (profile/cats/logs/chat) + `IndexedDB` (photo scans) — no backend, no database |
| Charts / PDF | `recharts`-style custom SVG charts, `jspdf` for report export |
| UI primitives | Radix UI + shadcn-style components (`src/components/ui`) |

## Architecture

This app used to have an Express + Prisma + SQLite backend for photo analysis
and a `GEMINI_API_KEY`-based Gemini client. That backend has been **fully
removed**. All AI calls and Google sign-in now go directly from the browser
to Firebase, and every other feature was already local-storage based. The
result is a pure static SPA/PWA with zero server-side code to deploy, run, or
pay for beyond static hosting.

```
Browser
 ├─ localStorage ── User accounts, cats, logs, meals, vet records, chat history
 ├─ IndexedDB ────── Photo scan results + images
 └─ Firebase AI Logic / Firebase Auth ── Gemini calls + Google sign-in
                                          (no CatTwin server in between)
```

## Project structure

```
src/
├─ routes/              File-based routes (TanStack Router) — one file per page
│  ├─ index.tsx         Home — pet card, quick stats, recent activity
│  ├─ digital-twin.tsx   AI Digital Twin — scores, prediction, modules
│  ├─ chat.tsx           AI Assistant chatbot
│  ├─ photo-analysis.tsx AI Photo Scan
│  ├─ health.tsx         Weight/sleep/hydration logs, vaccinations, deworming, medical history
│  ├─ feeding.tsx        Food plan / meal schedule
│  ├─ analytics.tsx      Trend charts
│  ├─ reports.tsx        PDF report generation
│  ├─ notifications.tsx  Notification center
│  ├─ cat-profile.tsx    Full cat profile editor
│  ├─ settings.tsx       Account, cats management, preferences, data export/delete
│  ├─ login.tsx / signup.tsx / forgot-password.tsx / welcome.tsx   Auth flow
│  └─ __root.tsx         App shell — providers, manifest/meta tags, install prompt
├─ lib/
│  ├─ auth.tsx           localStorage-based auth + full CRUD data store (the "backend")
│  ├─ firebase.ts        Firebase app/AI/Auth initialization — the only place Gemini is configured
│  ├─ geminiChat.ts       Chat assistant logic
│  ├─ geminiPrediction.ts AI Summary / prediction narrative for the Digital Twin
│  ├─ geminiVision.ts     Photo analysis (body condition/weight/coat)
│  ├─ digitalTwin.ts      Deterministic health-score computation engine
│  ├─ notifications.ts    Notification computation engine
│  ├─ reportGenerator.ts  PDF report builder
│  ├─ indexedDb.ts        Photo scan storage
│  ├─ imageUtils.ts       Client-side image resize (canvas)
│  ├─ installPrompt.ts    PWA install-prompt hook
│  └─ theme.tsx           Light/dark theme provider
├─ components/           Shared UI (PhoneShell, BottomNav, pickers, InstallPrompt, ui/ primitives)
└─ styles.css            Design tokens (colors, fonts) + Tailwind layer

public/
├─ manifest.webmanifest  PWA manifest
└─ icons/                App icon set (192/512, regular + maskable, apple-touch-icon)
```

## Getting started

**Prerequisites:** Node.js 18+, npm.

```powershell
# Install dependencies
npm install

# Copy the env template and fill in your Firebase config (see below)
Copy-Item .env.example .env

# Start the dev server
npm run dev
```

The app runs at `http://localhost:8080`. Without Firebase configured, every
screen except the AI features and Google sign-in works fully offline.

## Firebase setup (required for AI + Google sign-in)

The app talks to Gemini through **Firebase AI Logic**, not a raw Gemini API
key — Firebase manages the actual key server-side, you never paste one into
this codebase.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **AI Logic** → *Get started* → choose the **Gemini Developer API** provider
   (free tier, no billing required to start).
3. **Authentication** → *Sign-in method* → enable **Google**. Confirm
   `localhost` is listed under *Settings → Authorized domains* (it is by
   default); add your deployed domain here too once you have one.
4. Register a **Web app** in *Project Settings* and copy the six config
   values into `.env`:

   ```dotenv
   VITE_FIREBASE_API_KEY="..."
   VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="..."
   VITE_FIREBASE_APP_ID="..."
   ```

5. *(Recommended before sharing publicly)* Set up **App Check** with
   reCAPTCHA v3 to protect your Gemini quota from abuse, and add the site key
   as `VITE_RECAPTCHA_SITE_KEY`. Safe to leave empty for local development.
6. Restart the dev server — Vite only reads `.env` at startup.

These six config values identify your Firebase project; they are **not**
secrets (unlike a raw API key) — App Check is what actually protects your
Gemini quota from abuse.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build (via Nitro) |
| `npm run build:dev` | Development-mode build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run test` | Run tests (Vitest) |

## Deployment (Vercel)

1. Push the repo to GitHub, import it in [Vercel](https://vercel.com), and let
   it auto-detect the TanStack Start / Nitro build (`npm run build`).
2. Add the same `VITE_FIREBASE_*` (and `VITE_RECAPTCHA_SITE_KEY`) variables
   from your `.env` under **Project Settings → Environment Variables**.
3. Deploy, then add the resulting domain to **Firebase → Authentication →
   Authorized domains** (and to your reCAPTCHA site's allowed domains, if App
   Check is enabled) — otherwise Google sign-in and Gemini calls will fail on
   the live URL even though they work on `localhost`.
4. Open the deployed URL on a phone and use the browser menu (or the in-app
   install prompt, on supporting browsers) to install it as a home-screen app.

## Data & privacy model

- **Everything you log** (cats, weight/sleep/hydration entries, meals, vet
  records, chat history, photo scans, preferences) is stored **only on the
  device/browser you're using** — `localStorage` for structured data,
  `IndexedDB` for photos.
- **Nothing is synced across devices or browsers.** Signing in with the same
  account (even via Google) on a different browser or device starts with an
  empty slate, since there is no server-side database — this is a deliberate
  tradeoff for zero backend/hosting cost and full offline capability, not a
  bug.
- **The only outbound network calls** are: (a) the prompt/image you send to
  Gemini via Firebase AI Logic for chat, predictions, and photo analysis, and
  (b) the Google identity handshake if you use Google sign-in. No CatTwin
  server exists to send data to.
- Settings includes **Export my data** (PDF report) and **Delete all
  records**, both operating purely on local data.

## Known limitations

- **No cross-device sync.** Local-only storage means data doesn't follow an
  account across browsers/devices. Migrating to Firestore would fix this at
  the cost of added complexity (async data layer, security rules) — see
  project notes/history for the tradeoffs considered.
- **Background/scheduled notifications don't fire.** The in-app notification
  center works (computed fresh on each visit), but real push-style
  notifications while the app is closed would require a service worker +
  Push API + a backend to trigger sends — not currently implemented.
- **PWA install prompts are browser-dependent.** Chrome/Edge fire the native
  `beforeinstallprompt` event reliably; some Chromium-based browsers (e.g.
  Brave) disable or alter this by default as a privacy feature, and iOS
  Safari doesn't support it at all (installation there is manual via the
  Share sheet).
- **AI features require Firebase configuration.** Without a configured
  Firebase project, the chatbot, Digital Twin AI summary, and photo analysis
  will show a clear "not configured" error rather than silently failing —
  but they won't work until `.env` is filled in.
