# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sathiyan Sports — a Next.js 14 (App Router) + TypeScript + MongoDB app for running a sports facility: court/slot booking (cricket, football, badminton, body zorb, functions & events), subscriptions and billing, fee collection, attendance (QR-based), expenses/inventory, tournaments (fixtures, brackets, live score), an AI fitness coach (Gemini), and a booking chatbot. UI is MUI v5 (theme in `src/app/providers.tsx`) plus plain CSS files in `src/app/`.

## Commands

```bash
npm run dev          # dev server on http://localhost:3000
npm run build        # production build (also the main type/compile check)
npm run lint         # next lint (eslint-config-next)
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
- **Services** (`src/app/services/`): notification channels (WhatsApp Cloud API, Twilio, URL-based WhatsApp links, SMS, email via `lib/emailService.ts`, web push), OTP, billing/billing-cycle logic, and `geminiService.ts` for AI fitness plans. Background jobs use `node-cron`: the attendance scheduler is started from `src/app/lib/scheduler-init.ts` (imported in `layout.tsx`), and the billing scheduler lives in `billingSchedulerService.ts`.
- **Payments**: Razorpay (`api/payment/*`), PhonePe (`api/phonepe/*`), and a simple UPI/GPay flow (`components/SimplePaymentDialog.tsx`) with manual admin confirmation.
- **Tournaments**: models `Tournament`, `Player` (supports doubles partners), `Match`. `src/app/lib/bracket.ts` builds a seeded single-elimination bracket for any N teams (byes to top seeds); matches link forward via `nextMatchNumber` / `nextMatchSlot`. Fixture generation is `api/tournaments/[id]/generate-fixtures`, round reshuffling is `api/tournaments/[id]/shuffle-round`, and match results/advancement go through `api/tournaments/[id]/matches/[matchId]`. Rendered by `components/TournamentBracket.tsx`.
- **Chatbot** (`api/chatbot/route.ts` + `components/ChatbotWidget.tsx`): Gemini with function-calling; it creates bookings by calling the `POST` handler of `api/bookings/simple-create` directly. Sport pricing and badminton court IDs (S1–S3) are duplicated as constants there — keep them in sync with the booking flow.
