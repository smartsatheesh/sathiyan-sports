import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/app/lib/rateLimit";
import { DEFAULT_CLUB, isDefaultClub } from "@/app/lib/clubs";
import { isPreviewHost, TENANT_COOKIE, TENANT_HEADER, tenantFromHost } from "@/app/lib/tenant";

// Central access control. Route handlers may still do their own checks, but every
// sensitive path is guarded here first so a forgotten check can't expose data.
// It also decides which club ("tenant") a request is for, from the host name, and passes
// that on in the x-club request header.

// clubAdmin = owner admin or a partner club's admin; those routes scope data to the club themselves
type Access = "public" | "admin" | "clubAdmin" | "staff" | "user";

interface Rule {
  pattern: RegExp;
  access: Access;
  methods?: string[]; // omitted = all methods
}

const WRITE = ["POST", "PUT", "PATCH", "DELETE"];

// First matching rule wins, so list the more specific paths first.
const API_RULES: Rule[] = [
  // Members can check in / look up their own QR without staff
  { pattern: /^\/api\/attendance\/(check-mobile|scan)$/, access: "public" },
  { pattern: /^\/api\/attendance\/qr$/, access: "user" },
  { pattern: /^\/api\/attendance$/, access: "user" }, // route scopes members to their own records
  { pattern: /^\/api\/attendance\/record$/, access: "staff" },
  { pattern: /^\/api\/attendance\//, access: "admin" },

  { pattern: /^\/api\/admin\/(fees|payments|club|settings)(\/|$)/, access: "clubAdmin" },
  { pattern: /^\/api\/admin(\/|$)/, access: "admin" },
  // Booking lookups expose customer contact details; payment proof goes through /api/payments
  { pattern: /^\/api\/bookings\/(?!simple-create$)[^/]+$/, access: "admin" },
  { pattern: /^\/api\/expenses(\/|$)/, access: "admin" },
  { pattern: /^\/api\/subscriptions(\/|$)/, access: "admin" },
  // Shop list and photos are public; changes are admin-only
  { pattern: /^\/api\/inventory(\/|$)/, access: "admin", methods: WRITE },

  // Fitness enrollments: public may enroll (POST), only admin reads/edits the list
  { pattern: /^\/api\/fitness-plans\/generate$/, access: "user" },
  { pattern: /^\/api\/fitness-plans\/[^/]+$/, access: "admin" },
  { pattern: /^\/api\/fitness-plans$/, access: "admin", methods: ["GET"] },

  // AI generation costs money per call — require a signed-in user
  { pattern: /^\/api\/coach(\/|$)/, access: "user" },
  { pattern: /^\/api\/user(\/|$)/, access: "user" },
];

const PAGE_RULES: Rule[] = [
  { pattern: /^\/admin\/?$/, access: "clubAdmin" },
  { pattern: /^\/admin\/(fees|payments|club|settings)(\/|$)/, access: "clubAdmin" },
  { pattern: /^\/admin(\/|$)/, access: "admin" },
  { pattern: /^\/expenses(\/|$)/, access: "admin" },
  { pattern: /^\/subscription$/, access: "admin" },
  { pattern: /^\/coach\/(attendance|admin)(\/|$)/, access: "staff" },
  { pattern: /^\/(my-bookings|profile|review|s3\/enrolled)(\/|$)/, access: "user" },
];

// Pages a partner club's site offers today (memberships, fees, attendance and its admin).
// Everything else — court booking, tournaments, shop, AI coach — is Sathiyan-only until it is
// scoped per club, so on a club subdomain those paths go back to the club's home page.
const PARTNER_PAGES = /^\/($|auth\/|register|pay\/|profile|attendance|club\/|admin\/?$|admin\/(fees|payments|club|settings|password-resets)(\/|$)|about|contact)/;

function findRule(rules: Rule[], pathname: string, method: string): Rule | undefined {
  return rules.find(
    (r) => r.pattern.test(pathname) && (!r.methods || r.methods.includes(method))
  );
}

function isAllowed(access: Access, role: string | undefined): boolean {
  if (!role) return false;
  if (access === "user") return true;
  if (access === "staff") return role === "admin" || role === "coach";
  if (access === "clubAdmin") return role === "admin" || role === "club_admin";
  return role === "admin";
}

/** The club this request is for: a club subdomain, else (on preview hosts) ?club= / the preview cookie, else Sathiyan. */
function resolveTenant(req: NextRequest): { slug: string; setCookie?: string } {
  const host = req.headers.get("host");
  const fromHost = tenantFromHost(host);
  if (fromHost) return { slug: fromHost };
  if (isPreviewHost(host)) {
    const wanted = req.nextUrl.searchParams.get("club");
    if (wanted !== null) {
      const slug = wanted.toLowerCase() || DEFAULT_CLUB;
      return { slug, setCookie: slug };
    }
    const cookie = req.cookies.get(TENANT_COOKIE)?.value;
    if (cookie && /^[a-z0-9-]{2,40}$/.test(cookie)) return { slug: cookie };
  }
  return { slug: DEFAULT_CLUB };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const tenant = resolveTenant(req);

  // Partner-club sites only show the parts that work per club
  if (!isApi && !isDefaultClub(tenant.slug) && !PARTNER_PAGES.test(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Admins and club admins register members at the desk, many in a row from one phone
  const deskRegistration =
    pathname === "/api/register" &&
    ["admin", "club_admin"].includes(String((await getToken({ req, secret: process.env.NEXTAUTH_SECRET }))?.role || ""));

  if (isApi && !deskRegistration) {
    const ip = req.ip || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const { limited, retryAfterSec } = checkRateLimit(pathname, req.method, ip);
    if (limited) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }
  }

  // Pass the tenant to server components and route handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(TENANT_HEADER, tenant.slug);
  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (tenant.setCookie) res.cookies.set(TENANT_COOKIE, tenant.setCookie, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 });
    return res;
  };

  const rule = findRule(isApi ? API_RULES : PAGE_RULES, pathname, req.method);
  if (!rule || rule.access === "public") return next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  // Signed-in users without a role are treated as customers
  const role = token ? ((token.role as string) || "customer") : undefined;
  // A club admin only manages the club whose site they are on
  const wrongClub = role === "club_admin" && String(token?.club || DEFAULT_CLUB) !== tenant.slug && !isDefaultClub(tenant.slug);

  if (isAllowed(rule.access, role) && !wrongClub) return next();

  if (isApi) {
    return NextResponse.json(
      { success: false, error: token ? "Forbidden" : "Authentication required" },
      { status: token ? 403 : 401 }
    );
  }

  const loginUrl = new URL("/auth/login", req.url);
  if (token) loginUrl.searchParams.set("error", "AccessDenied");
  else loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Every page and API (the tenant header must reach all of them); skip static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|xml|json|woff2?)$).*)"],
};
