# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sathiyan Sports — a Next.js 14 (App Router) + TypeScript + MongoDB app for running a sports facility: court/slot booking (cricket, football, badminton, body zorb, functions & events), subscriptions and billing, fee collection, attendance (QR-based), expenses/inventory, tournaments (fixtures, brackets, live score), an AI fitness coach (Gemini), and a booking chatbot. UI is MUI v5 (theme in `src/app/providers.tsx`) plus plain CSS files in `src/app/`.

## Commands

```bash
npm run dev          # dev server on http://localhost:3000
npm run build        # production build (also the main type/compile check)
npm run lint         # currently prompts for setup: eslint.config.mjs (flat config) is not supported by Next 14 lint
npm run debug        # dev server with Node inspector
npm run migrate:cricket-slots:dry    # preview cricket booking-slot migration
npm run migrate:cricket-slots:apply  # apply it
```

There is no test framework; verify with `npm run build` and by exercising the app. `src/scripts/` and `scripts/` hold one-off Node migration/import scripts that **mutate the database** — read before running. `docs/history/` contains historical change notes, not authoritative specs.

Product decisions: deployed on Vercel at www.sathiyansports.fit (use Vercel Cron, not long-running processes); payments are direct UPI with customer-entered UTR and admin confirmation (no paid gateway); WhatsApp notifications are free `wa.me` prefilled links, not a paid API. The owner is cost-conscious — avoid adding paid services.

## Environment

Config comes from `.env` / `.env.local` (see `.env.example`). Key vars: `MONGODB_URI`, `MONGODB_DB` (defaults to `SathiyanSports`), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GEMINI_API_KEY`, Razorpay/PhonePe keys, `NEXT_PUBLIC_GPAY_UPI_ID`, WhatsApp Cloud API / Twilio credentials, `EMAIL_SERVER_*`, Firebase admin creds. Google/Facebook OAuth providers are only enabled if their client ID/secret are set.

## Architecture

- **Routing**: everything lives under `src/app/`. Pages are folders (`admin/*`, `bookslot`, `tournaments`, `coach`, `s3`, ...); backend is Route Handlers in `src/app/api/**/route.ts`. Path alias `@/*` → `src/*`, but much code uses relative imports.
- **Database** (`src/app/server/mongodb.ts`): two cached connection helpers coexist:
  - `connectToMongoose()` (also the default export) — used with Mongoose models in `src/app/models/`.
  - `connectToMongoDB()`, exported also as `connectToDatabase` — native driver, used for coach collections and raw queries.
  - The `*-native` API routes (`tournaments-native`, `players-native`, `matches-native`) open their own `MongoClient` directly.
  - Mongoose model calls are often cast, e.g. `(Model.find as any)(...)`, to work around typing issues; TS `strict` is off.
- **Auth**: NextAuth v4, JWT sessions, config in `src/app/lib/authConfig.ts`. Primary login is a Credentials provider using **mobile + password**, with an optional `champId` to disambiguate multiple users (family members) sharing one mobile number. Session/JWT carry `role` (`admin` or user) and `mobile`.
  - **Access control is centralized in `src/middleware.ts`**: `API_RULES` / `PAGE_RULES` map path regexes (optionally per HTTP method) to `public | user | staff | admin` (staff = admin or coach); first match wins, unmatched paths are public. When adding a sensitive route, add a rule there. Some handlers also re-check via `getServerSession(authOptions)`.
  - Server must never trust client-sent `role`, `paymentStatus`, or "paid" flags: non-admin callers can only submit payment proof (UTR) which moves bookings to `pending_verification`; an admin confirms.
  - Best-effort in-memory rate limits for login/OTP/register/chatbot/AI/payment routes live in `src/app/lib/rateLimit.ts` (per server instance).
  - Security headers and the apex → `www.sathiyansports.fit` redirect are in `next.config.js`.
- **Timezone**: business logic is IST (Asia/Kolkata). Use helpers in `src/app/lib/istDate.ts` rather than relying on server-local time.
- **Membership fees**: `Subscription` documents are the fee ledger — one document per paid period (renewals add a new document). "Paid till" = latest `endDate` of a `Paid` period. `lib/fees.server.ts` builds the admin board (`/admin/fees`: overdue / due soon / paid / lapsed >45 days), records desk payments, and handles member self-payment via signed pay links (`/pay/<userId>.<hmac>`, HMAC with `NEXTAUTH_SECRET`). Keep the denormalised User fields in sync with `syncUserFeeStatus` (`lib/feeStatus.server.ts`).
- **Admin area**: `/admin` is a mobile-first hub (numbers from `/api/admin/overview`); the legacy bookings/users/slot-stats dashboard lives at `/admin/manage`. Expenses (`/admin/expenses`, one month at a time via `lib/expenses.server.ts`; paid-by names and categories come from Settings) and inventory (`/admin/inventory`, products with stock history; photos resized in the browser and stored as data URLs, served by `/api/inventory/[id]/image`) back the public `/shop`, which orders via WhatsApp.
- **Landing page** (`src/app/page.tsx`): hero is a lazy-loaded three.js stage (`components/landing/`) — `Athlete.tsx` is a procedural, faceless rig (pose = joint Euler rotations; athletes face +Z, negative X swings limbs forward) and `Scenes.tsx` holds the football "Siu" / badminton smash / cricket six scenes on a shared stadium. Preview a frozen frame with `/?scene=<0-2>&t=<seconds>`. Prices shown on the page come from Settings. Don't use real players' names or likenesses.
- **Global CSS**: avoid `!important` overrides of MUI components in `globals.css`; button defaults live in the theme in `providers.tsx`. Keep `overflow-x: clip` (not `hidden`) on html/body so the page, not `<body>`, scrolls.
- **Notifications**: WhatsApp only, via free `wa.me` links that an admin taps (fee reminders, payment receipts, password-reset links). There is no SMS/push/paid WhatsApp API — don't add one without asking. Password reset: member requests at `/auth/forgot-password` → admin sends a one-time link from `/admin/password-resets` (only the SHA-256 of reset tokens is stored).
- **Scheduled jobs**: Vercel Cron (`vercel.json`) calling `/api/cron/*` with `Authorization: Bearer $CRON_SECRET`; no in-process schedulers. `src/app/services/` now only holds `geminiService.ts`.
- **Prices & settings**: every price (court prices are per hour and 30-minute slots cost half; courts can have weekday 2-hour blocks or per-person pricing, enforced by `bookingRuleError`; holidays use weekend prices; coaching fees are per programme in `membership.programs`, chosen per member via `User.coachingProgram` or their sport (`programFor`) — see `lib/pricing.ts`), extras, weekend days, membership plans, women's discount window, flexible surcharge, tournament default fee), the UPI ID and the WhatsApp number live in one `Settings` document edited at `/admin/settings`. `src/app/lib/pricing.ts` holds the types, `DEFAULT_SETTINGS` and the pure price functions shared by client and server; `lib/settings.server.ts` loads/caches/validates it; pages use `hooks/useSiteSettings`. Never hard-code a price — servers must recompute amounts with these functions (admins may override).
- **Payments**: direct UPI only. Customers pay via QR/intent (`components/UpiPaymentDialog.tsx`, links built by `lib/upi.ts`) and submit the 12-digit UTR to `POST /api/payments` with `{kind: booking|subscription|tournament, refId}`. `lib/payments.server.ts` creates a `Payment` (amount taken from the stored record, UTR unique) and marks the target `pending_verification`; admins confirm/reject at `/admin/payments`, which updates the linked Booking/Subscription/Player (booking confirmation re-checks slot conflicts via `lib/bookingConflicts.ts`).
- **Tournaments**: models `Tournament`, `Player` (supports doubles partners), `Match`. `src/app/lib/bracket.ts` builds a seeded single-elimination bracket for any N teams (byes to top seeds); matches link forward via `nextMatchNumber` / `nextMatchSlot`. Fixture generation is `api/tournaments/[id]/generate-fixtures`, round reshuffling is `api/tournaments/[id]/shuffle-round`, and match results/advancement go through `api/tournaments/[id]/matches/[matchId]`. Rendered by `components/TournamentBracket.tsx`.
- **AI Coach** (`/coach`, staff overview at `/coach/admin`): members answer a wizard (`lib/coach.ts` holds the questions and plan types), `lib/coach.server.ts` asks Gemini for a structured 4-week plan (JSON response schema) and handles the plan-aware chat that can rewrite the plan; plans, tick-offs and chat are stored in `CoachPlan`. Daily per-member limits (`PLANS_PER_DAY`, `CHATS_PER_DAY`) keep usage in the free tier. All Gemini calls go through `lib/gemini.server.ts` (`GEMINI_API_KEY` from aistudio.google.com, optional `GEMINI_MODEL`, default `gemini-flash-latest`).
- **Chatbot** (`api/chatbot/route.ts` + `components/ChatbotWidget.tsx`): Gemini with function-calling; it creates bookings by calling the `POST` handler of `api/bookings/simple-create` directly. Sport pricing and badminton court IDs (S1–S3) are duplicated as constants there — keep them in sync with the booking flow.
