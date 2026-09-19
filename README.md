# DispatchFlow

Fleet dispatch & delivery operations console for SME logistics businesses — built from the "Kinetic Dispatch" Stitch design export (7 screens: Login, Operations Dashboard, Deliveries Timeline, Live GPS Tracking, Route Optimization, Customer Feedback, Performance Reports) and extended to a complete, multi-tenant, role-gated production app.

**No payment processor of any kind is wired into this app**, by design — there is no Stripe, no card fields, no checkout flow anywhere. Access is admin-provisioned (invite by email + role) rather than self-serve-with-a-card. See "Access model" below.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Firebase**: Auth (email/password + session cookies), Firestore (multi-tenant data + Security Rules as the real isolation boundary), Admin SDK for all writes
- **Leaflet + OpenStreetMap** for maps (no paid Google Maps key required)
- **@dnd-kit** for drag-to-reorder route stops, **Recharts** for the consignment distribution chart
- **Jest + React Testing Library** for tests

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase project's keys — see below
npm run dev
```

Open http://localhost:3000 — you'll land on Sign In; use "Set up your organization" to create the first account and org.

### Firebase project setup

1. Create a Firebase project (Firestore + Authentication → Email/Password provider enabled).
2. Firebase Console → Project settings → General → add a Web app → copy the `NEXT_PUBLIC_FIREBASE_*` values into `.env.local`.
3. Firebase Console → Project settings → Service accounts → Generate new private key → either paste the whole JSON into `FIREBASE_SERVICE_ACCOUNT_KEY` (one line) or split it into `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`.
4. Deploy Firestore rules and indexes: `npx firebase-tools deploy --only firestore:rules,firestore:indexes` (after `firebase use --add`).

### Deploying

- **App**: push to GitHub, import into Vercel, set the same env vars there.
- **Firestore rules/indexes**: `firebase deploy` (see above) — this is a separate pipeline from the Vercel deploy; pushing code does not push rules, and vice versa.

## Access model (no billing)

There is no self-serve signup-with-a-card anywhere in this app:

- The first person to sign up creates the organization and becomes its **Owner**.
- Everyone else joins by **invite** (Settings → Team → Invite Teammate), assigned one of: Admin, Dispatcher, Driver, Viewer. The owner role can't be reassigned or removed — there's no ownership-transfer flow, so that's a deliberate guard against orphaning an org.
- Settings → Plan shows an informational plan-tier badge with a "Contact us" mailto link — never a card form. If usage limits are ever needed, gate them server-side rather than adding checkout UI.

## Security model

- **Firestore Security Rules** (`firestore.rules`) are the real multi-tenant boundary for direct client reads: every rule re-derives the caller's membership + role by reading the live `organizations/{orgId}/members/{uid}` document — never trusting a cached custom claim — so a stale or forged token can't grant access a current membership wouldn't.
- **Every write** goes through a Route Handler using the Admin SDK (`requireApiSession(minRole)` in `src/lib/auth/api.ts`), which re-verifies the session cookie, checks role, and writes an audit log entry. Firestore rules block all direct client writes to the collections these routes own.
- **`middleware.ts`** only checks whether a session cookie is *present*, for redirect UX — it cannot run the Admin SDK on the Edge runtime, so it is explicitly not the security boundary. `src/lib/auth/server.ts` (server components) and `src/lib/auth/api.ts` (Route Handlers) are.
- Session cookies are minted via the standard Firebase pattern: client signs in → gets a fresh ID token → exchanges it for an httpOnly session cookie (`/api/auth/session`) that carries the `orgId`/`role` custom claims set at org-creation or invite-acceptance time.

## What's real vs. stubbed — honest gap list

Everything below the dashed line is a **deliberate, documented** scope decision, not an oversight. Nothing here fakes success with a `setTimeout` or a placeholder that looks done but isn't.

**Fully real and working:**
- Multi-tenant RBAC (5 roles), enforced both in Firestore rules and every API route
- Live Firestore listeners throughout (dashboard KPIs, activity stream, GPS positions, notifications) — genuinely real-time across every open session, not polling
- Real nearest-neighbor route optimization (`src/lib/routeOptimizer.ts`) computing actual before/after distance, minutes, and fuel savings from haversine distance — not canned demo numbers
- Real audit log covering every mutating action, with a SHA-256 content hash on every CSV export for tamper-evidence
- Real signature capture (canvas-based) for proof of delivery
- Full driver/vehicle/team CRUD with server-side validation (zod) and role gates
- Light/dark/system theme, applied via `data-theme` + localStorage with a pre-hydration inline script (no flash of wrong theme) — this was previously dead CSS variables; the toggle in Settings → Appearance now actually drives it
- In-memory sliding-window rate limiting (`src/lib/rateLimit.ts`) on every unauthenticated endpoint that can be hit repeatedly (session exchange, org creation, invite lookup/accept) and a blanket per-user limit inside `requireApiSession()` covering every authenticated route — returns `429` with a `Retry-After` header, not silently degraded
- Graceful degradation on backend failure: `org/create`, `invites/[token]`, and `invites/accept` catch Admin SDK failures and return a clean `503` instead of crashing to a raw `500` — verified in this sandbox, where there's no live Firebase to talk to, so this path is exercised on every request, not hypothetical
- Real app icon/favicon/PWA manifest (`app/icon.svg`, `app/apple-icon.png`, `app/manifest.ts`) — closes a real bug this round's browser pass caught (a 404 on `favicon.ico`)
- **Verified in a real, headless Chromium browser** (not just jsdom): zero axe-core accessibility violations and zero console errors across every public route (login, forgot-password, onboarding, invite preview, 404), after this round fixed two real bugs the pass caught — missing `<main>`/`<header>`/`<footer>` landmarks on every auth page, and several `text-white/NN` opacity utilities that computed under the 4.5:1 contrast ratio against the dark background. Re-run anytime with `node scripts/browser-check.mjs` against a running `npm run start` server.

---

- **No geocoding provider is wired in.** Delivery map coordinates are a deterministic pseudo-random offset from the org's depot coordinates (`src/lib/geo.ts`), seeded from the address string so the same address always lands in the same spot. This is enough to make Live GPS and Route Optimization fully functional for real use and testing, but it is not real geocoding. Swapping in a provider (Mapbox, OpenCage, Google Geocoding) is a small, isolated change once you've picked one — a business/cost decision I didn't want to guess.
- **No driver mobile app / live device GPS.** `Driver.lastKnownPosition` is set at creation/seed time and can be updated via `PATCH /api/drivers/:id`, and every viewer sees position changes in real time — but nothing currently pushes a real phone's GPS into that field. Building that driver-side client (native or PWA) is a separate, sizeable project.
- **No transactional email provider.** Invite links and review responses are generated and shown in-app (with a copy-to-clipboard action) rather than emailed automatically — wiring Resend/SendGrid/SES needs a provider choice and a domain you control, which is your call, not a default to guess.
- **Biometric/passkey sign-in** is shown in the login UI, explicitly labeled "Soon" and disabled — implementing real WebAuthn passkey enrollment per device is a further step, not faked as working.
- **One organization per account.** An account belongs to exactly one org; there's no multi-org switcher. Matches the pattern used in the other SaaS builds in this line of work — add it later if you need agencies managing multiple client fleets.
- **Rate limiting is per-server-instance, not distributed.** On a multi-instance/serverless deployment (Vercel functions, several container replicas) each instance has its own counters, so a burst spread across instances can exceed the stated limit. It still stops the common single-client-hammering-one-endpoint case. The interface is storage-agnostic so a Redis-backed limiter (Upstash, etc.) can be swapped in later without touching call sites.
- **Live Firebase round-trip is unverified from this build environment** — this sandbox's network allowlist blocks all Google API hosts (`firestore.googleapis.com`, `www.googleapis.com`, the emulator download host, and `fonts.googleapis.com`), confirmed by direct attempts (including a live `firebase-tools setup:emulators:firestore` run, which failed trying to reach `storage.googleapis.com`), not assumed. The code follows the same patterns already proven live in this line of work, and every route now degrades to a clean `503` instead of crashing when the Admin SDK can't be reached — but you should still do a real signup → invite → dispatch → route → export smoke test against your own Firebase project before treating it as verified end-to-end.
- **Plus Jakarta Sans** falls back to a matching system-font stack in this build environment for the same reason (Google Fonts host blocked here). `src/app/layout.tsx` has the exact `next/font/google` snippet commented in — uncomment it once deployed somewhere that can reach Google Fonts (Vercel can).

## Testing

```bash
npm test        # 43 tests across 8 suites — RBAC rules, route optimizer, geo math, rate limiter, UI components
npm run lint
npx tsc --noEmit
npm run build
node scripts/browser-check.mjs   # real-browser a11y + console-error pass (needs `npm run start` running)
```

All of the above currently pass clean (0 TS/ESLint errors, 0 accessibility violations, 0 console errors on public routes).

## Project structure

```
src/
  app/
    (auth)/          # login, forgot-password, onboarding, invite/[token] — public
    (app)/            # dashboard, deliveries, live-gps, routes, feedback, reports, settings/*, notifications, help — authenticated
    api/              # all mutating/privileged operations (Admin SDK)
  components/
    ui/               # design-system primitives (Button, Card, StatusPill, Sheet, ...)
    nav/  dashboard/  deliveries/  live-gps/  routes/  feedback/  reports/  settings/  providers/
  lib/
    firebase/         # client.ts (browser SDK), admin.ts (server-only Admin SDK)
    auth/             # session cookie helpers, RBAC rules, server/API session guards
    firestore/        # typed collection refs, live-query hook, audit log writer
    geo.ts  routeOptimizer.ts  utils.ts
  types/models.ts      # the whole Firestore data model, in one place
firestore.rules / firestore.indexes.json / firebase.json
```
