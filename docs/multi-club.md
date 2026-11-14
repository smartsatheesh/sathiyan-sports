# Running other clubs on the app (white-label)

Each partner club gets its own site at `https://<slug>.sathiyansports.in` (or its own domain),
with its logo, colours, name, location, facilities, programmes and prices — on the same Cloud
Run service and database as Sathiyan's site. Sathiyan's own site is unchanged.

## How a request knows which club it is for

- `src/middleware.ts` reads the host name: `<slug>.sathiyansports.in` → that club; `www`, the
  bare domain, the run.app address and localhost → Sathiyan. It passes the slug on in the
  `x-club` request header. On non-club hosts, `?club=<slug>` sets a 24-hour preview cookie so
  a club can be checked before its DNS exists (`?club=sathiyan` switches back).
- Server code: `getTenant()` / `getTenantSlug()` in `lib/tenant.server.ts` (root layout, route
  handlers via `tenantFromRequest(req)`). Client code: `useTenant()` from
  `components/TenantProvider.tsx`, which the root layout fills from the host.
- `lib/tenant.ts` holds the pure host logic and `siteUrlFor(slug)` for links.

## What is per club today

| Area | Source | Notes |
|---|---|---|
| Identity, branding (logo, header & accent colour), tagline, location, contact, facilities, programmes, UPI, WhatsApp, features, plan | `Club` document (`models/Club.ts`) | Owner edits at `/admin/clubs`; the club's admin edits everything except identity/plan at `/admin/club` |
| Court prices, extras, weekend days, holidays, tournament fee… (the `SiteSettings` shape) | `Settings` document with key `club:<slug>` | Edited at `/admin/settings` on the club's site; starts empty (never Sathiyan's prices). Sathiyan's stay under key `site` |
| Members, subscriptions (fee ledger), payments | `club` field on `User`, `Subscription`, `Payment` | Query with `clubFilter(slug)`; documents without the field are Sathiyan's |
| Theme, navbar, favicon, page titles, home page, login/registration (club fixed, no dropdown), pay links | derived from the tenant | Partner home page = `club/[slug]/ClubHome.tsx` |

Partner sites only expose the pages that are club-scoped (home, join, login, profile, pay,
attendance check-in, and the club admin's fees/payments/profile/settings). Court booking,
tournaments, the shop and the AI coach stay Sathiyan-only until they are scoped per club; the
middleware sends those paths back to the club's home page, and the navbar hides them unless the
club's `features` switch them on.

## Still to do (phase 2) — scoping the rest of the app per club

Add a `club` field (default Sathiyan via `clubFilter`) and apply it in every list/create route for:
`Booking` + court availability + `/api/bookings/*`, `Tournament`/`Player`/`Match` + fixtures,
`Attendance`/`AttendanceRecord` (+ the entrance QR), `Inventory` (shop), `Expense`, `Review`,
`CoachPlan`, `Settings`-driven court lists. Then turn on the matching `features` flag per club.
Also: Google sign-in per host (one OAuth redirect URI per subdomain), per-club admin
password-reset links, and a per-club chatbot prompt.

## Adding a club (owner checklist)

1. `/admin/clubs` → add the club (name, web address, member-ID prefix, colours, logo, …) and
   add its admin (gets a `<PREFIX>-ADMIN-…` ID; they log in on the club's site).
2. `scripts/add-club-domain.sh <slug>` maps `<slug>.sathiyansports.in` on Cloud Run (domain
   mappings have no wildcard support, so it's one mapping per club — still free), then add the
   printed CNAME at GoDaddy. HTTPS is automatic after 15–30 minutes.
3. Until then, preview with `https://www.sathiyansports.in/?club=<slug>`.
4. The club's admin signs in at `https://<slug>.sathiyansports.in/auth/login`, fills in
   `/admin/club` (branding, facilities, fees) and `/admin/settings` (prices), then registers
   members at `/register`.

Own domain for a club (`coolclub.com`): set it in the club's record, map it with
`gcloud beta run domain-mappings create --domain coolclub.com …` (the club must verify the
domain in Search Console for the sathiyanmultisports account, or add that account as an
owner), and point their A/CNAME records at Google. `tenantFromHost` will need a lookup of
`Club.customDomain` for this (not done yet; the middleware can't query the database directly —
use a small cached API or an env map).

## Monetisation notes

`Club.plan` (`trial` | `starter` | `pro`) and `Club.planPaidTill` record what a club pays for;
`features` says what it gets. Nothing is enforced automatically yet — a simple first step is to
show a "plan expired" banner on the club's admin pages when `planPaidTill` has passed, and to
let the owner switch `active` off. Collecting the plan fee itself can reuse the UPI + UTR flow.

Costs stay flat: one Cloud Run service (scale-to-zero), one MongoDB Atlas database, one
domain; each club adds only a DNS record and a domain mapping.
