// Multi-club support shared by client and server. Sathiyan is the built-in default club:
// members, subscriptions and payments without a `club` field belong to it.

export const DEFAULT_CLUB = "sathiyan";

export interface ClubProgram {
  key: string;
  name: string;
  monthly: number; // kids
  adultMonthly?: number; // adults & veterans
}

export interface ClubFacility {
  name: string;
  emoji: string;
  description: string;
}

/** Which parts of the app a club's site shows. */
export interface ClubFeatures {
  memberships: boolean;
  attendance: boolean;
  bookings: boolean;
  tournaments: boolean;
  shop: boolean;
  coach: boolean;
}

/** Sathiyan's own site has everything; a new partner club starts with memberships and attendance. */
export const ALL_FEATURES: ClubFeatures = { memberships: true, attendance: true, bookings: true, tournaments: true, shop: true, coach: true };
export const PARTNER_DEFAULT_FEATURES: ClubFeatures = { memberships: true, attendance: true, bookings: false, tournaments: false, shop: false, coach: false };

/** What anyone may see about a club (its site header and home page, login and registration). */
export interface PublicClub {
  slug: string;
  name: string;
  city: string;
  tagline: string;
  color: string; // header / primary colour
  accentColor: string; // buttons and highlights
  logoUrl: string | null;
  isDefault: boolean;
  location: { address: string; mapUrl: string };
  contact: { phone: string; email: string; instagram: string };
  facilities: ClubFacility[];
  features: ClubFeatures;
  plan: string;
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
