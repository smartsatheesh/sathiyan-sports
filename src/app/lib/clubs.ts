// Multi-club support shared by client and server. Sathiyan is the built-in default club:
// members, subscriptions and payments without a `club` field belong to it.

export const DEFAULT_CLUB = "sathiyan";

export interface ClubProgram {
  key: string;
  name: string;
  monthly: number; // kids
  adultMonthly?: number; // adults & veterans
}

/** What anyone may see about a club (club page, login and registration dropdowns). */
export interface PublicClub {
  slug: string;
  name: string;
  city: string;
  tagline: string;
  color: string;
  isDefault: boolean;
  whatsappNumber: string;
  upi: { vpa: string; payeeName: string };
  programs: ClubProgram[];
}

export const clubOf = (doc: { club?: string | null } | null | undefined) => (doc?.club || DEFAULT_CLUB).toLowerCase();
export const isDefaultClub = (slug?: string | null) => !slug || slug === DEFAULT_CLUB;

/** Mongo filter for documents of a club (Sathiyan's older documents have no club field). */
export function clubFilter(slug?: string | null): Record<string, unknown> {
  return isDefaultClub(slug) ? { club: { $in: [DEFAULT_CLUB, null] } } : { club: slug };
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Owner admins see every club (and choose one); club admins only their own. */
export const isClubAdmin = (role?: string) => role === "club_admin";
export const canManageFees = (role?: string) => role === "admin" || role === "club_admin";
