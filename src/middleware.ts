import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/app/lib/rateLimit";

// Central access control. Route handlers may still do their own checks, but every
// sensitive path is guarded here first so a forgotten check can't expose data.

type Access = "public" | "admin" | "staff" | "user";

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

  { pattern: /^\/api\/admin(\/|$)/, access: "admin" },
  { pattern: /^\/api\/expenses(\/|$)/, access: "admin" },
  { pattern: /^\/api\/subscriptions(\/|$)/, access: "admin" },
  { pattern: /^\/api\/inventory(\/|$)/, access: "admin", methods: WRITE },
  { pattern: /^\/api\/coach\/admin(\/|$)/, access: "admin" },

  // Fitness enrollments: public may enroll (POST), only admin reads/edits the list
  { pattern: /^\/api\/fitness-plans\/generate$/, access: "user" },
  { pattern: /^\/api\/fitness-plans\/[^/]+$/, access: "admin" },
  { pattern: /^\/api\/fitness-plans$/, access: "admin", methods: ["GET"] },

  // AI generation costs money per call — require a signed-in user
  { pattern: /^\/api\/coach(\/|$)/, access: "user" },
  { pattern: /^\/api\/user(\/|$)/, access: "user" },
];

const PAGE_RULES: Rule[] = [
  { pattern: /^\/admin(\/|$)/, access: "admin" },
  { pattern: /^\/expenses(\/|$)/, access: "admin" },
  { pattern: /^\/subscription$/, access: "admin" },
  { pattern: /^\/coach\/attendance(\/|$)/, access: "staff" },
  { pattern: /^\/(my-bookings|profile|my-plan|s3\/enrolled)(\/|$)/, access: "user" },
];

function findRule(rules: Rule[], pathname: string, method: string): Rule | undefined {
  return rules.find(
    (r) => r.pattern.test(pathname) && (!r.methods || r.methods.includes(method))
  );
}

function isAllowed(access: Access, role: string | undefined): boolean {
  if (!role) return false;
  if (access === "user") return true;
  if (access === "staff") return role === "admin" || role === "coach";
  return role === "admin";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    const ip = req.ip || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const { limited, retryAfterSec } = checkRateLimit(pathname, req.method, ip);
    if (limited) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }
  }

  const rule = findRule(isApi ? API_RULES : PAGE_RULES, pathname, req.method);
  if (!rule || rule.access === "public") return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  // Signed-in users without a role are treated as customers
  const role = token ? ((token.role as string) || "customer") : undefined;

  if (isAllowed(rule.access, role)) return NextResponse.next();

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
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/expenses/:path*",
    "/subscription",
    "/coach/attendance/:path*",
    "/my-bookings/:path*",
    "/profile/:path*",
    "/my-plan/:path*",
    "/s3/enrolled/:path*",
  ],
};
