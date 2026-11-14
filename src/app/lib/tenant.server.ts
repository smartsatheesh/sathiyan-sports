import { headers } from "next/headers";
import { DEFAULT_CLUB, PublicClub } from "./clubs";
import { getPublicClub } from "./clubs.server";
import { TENANT_HEADER } from "./tenant";

/** The tenant slug for the current server request (set by the middleware). */
export function getTenantSlug(): string {
  try {
    return (headers().get(TENANT_HEADER) || DEFAULT_CLUB).toLowerCase();
  } catch {
    return DEFAULT_CLUB; // outside a request (build time)
  }
}

/** The tenant slug from a request object (route handlers). */
export function tenantFromRequest(req: Request): string {
  return (req.headers.get(TENANT_HEADER) || DEFAULT_CLUB).toLowerCase();
}

/** The current tenant's public profile; falls back to Sathiyan if the club doesn't exist. */
export async function getTenant(): Promise<PublicClub> {
  const slug = getTenantSlug();
  return (await getPublicClub(slug).catch(() => null)) || ((await getPublicClub(DEFAULT_CLUB)) as PublicClub);
}
