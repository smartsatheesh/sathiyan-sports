// Which club a request is for ("the tenant"), decided from the host name. Shared by the
// middleware, server components and client code; no database access here.
//
//   www.sathiyansports.in / sathiyansports.in  → Sathiyan (the default club)
//   <slug>.sathiyansports.in                    → partner club <slug>
//   anything else (run.app, localhost)         → Sathiyan, unless a preview cookie says otherwise

import { DEFAULT_CLUB, isDefaultClub } from "./clubs";

export const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN || "sathiyansports.in").toLowerCase();
/** Request header the middleware sets so server code knows the tenant. */
export const TENANT_HEADER = "x-club";
/** Preview cookie (set with ?club=<slug> on a non-club host) for testing a club before its DNS exists. */
export const TENANT_COOKIE = "tenant";
/** Subdomains that can never be a club. */
export const RESERVED_SUBDOMAINS = ["www", "api", "app", "admin", "mail", "pay", "shop", "club", "clubs", "static", "cdn"];

/** Club slug from a host name, or null when the host isn't a club subdomain. */
export function tenantFromHost(host?: string | null): string | null {
  const h = (host || "").toLowerCase().split(":")[0];
  if (!h.endsWith(`.${BASE_DOMAIN}`)) return null;
  const label = h.slice(0, -(BASE_DOMAIN.length + 1));
  if (!label || label.includes(".") || RESERVED_SUBDOMAINS.includes(label)) return null;
  return /^[a-z0-9-]{2,40}$/.test(label) ? label : null;
}

/** True for hosts where the preview cookie / ?club= is honoured (never on a real club subdomain). */
export function isPreviewHost(host?: string | null): boolean {
  const h = (host || "").toLowerCase().split(":")[0];
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".run.app") || h.endsWith(".vercel.app") || h === BASE_DOMAIN || h === `www.${BASE_DOMAIN}`;
}

/** Public address of a club's site. */
export function siteUrlFor(slug?: string | null, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return isDefaultClub(slug) ? `https://www.${BASE_DOMAIN}` : `https://${slug}.${BASE_DOMAIN}`;
}

export const tenantOr = (slug?: string | null) => (slug || DEFAULT_CLUB).toLowerCase();
