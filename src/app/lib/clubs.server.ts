import { connectToMongoose } from "@/app/server/mongodb";
import Club from "@/app/models/Club";
import { getSiteSettings } from "@/app/lib/settings.server";
import { SiteSettings } from "@/app/lib/pricing";
import { DEFAULT_CLUB, isClubAdmin, isDefaultClub, PublicClub } from "@/app/lib/clubs";

const DEFAULT_CLUB_NAME = "Sathiyan Multisport Club";

/** All active partner clubs (not including Sathiyan). */
export async function listClubDocs(includeInactive = false) {
  await connectToMongoose();
  return (Club.find as any)(includeInactive ? {} : { active: true }).sort({ name: 1 }).lean();
}

export async function getClubDoc(slug: string) {
  if (isDefaultClub(slug)) return null;
  await connectToMongoose();
  return (Club.findOne as any)({ slug: String(slug).toLowerCase() }).lean();
}

/** True for Sathiyan and for any active partner club. */
export async function clubExists(slug?: string | null) {
  if (isDefaultClub(slug)) return true;
  const doc = await getClubDoc(slug!);
  return Boolean(doc?.active);
}

/**
 * Prices, UPI and WhatsApp for a club, as a full SiteSettings object so every price function
 * works unchanged. Partner clubs override only the membership programmes, UPI and WhatsApp.
 */
export async function getClubSettings(slug?: string | null): Promise<SiteSettings> {
  const site = await getSiteSettings();
  if (isDefaultClub(slug)) return site;
  const club = await getClubDoc(slug!);
  if (!club) return site;
  // (not withDefaults: a club with no programmes yet must not inherit Sathiyan's fees)
  return {
    ...site,
    membership: { programs: club.programs || [], flexibleSurchargePerMonth: 0 },
    upi: { vpa: club.upi?.vpa || "", payeeName: club.upi?.payeeName || club.name },
    whatsappNumber: club.whatsappNumber || "",
  };
}

export async function getPublicClub(slug?: string | null): Promise<PublicClub | null> {
  if (isDefaultClub(slug)) {
    const s = await getSiteSettings();
    return {
      slug: DEFAULT_CLUB,
      name: DEFAULT_CLUB_NAME,
      city: "Madurai",
      tagline: "Football, cricket, badminton and martial arts under floodlights",
      color: "#071a2e",
      isDefault: true,
      whatsappNumber: s.whatsappNumber,
      upi: s.upi,
      programs: s.membership.programs.map(({ key, name, monthly, adultMonthly }) => ({ key, name, monthly, adultMonthly })),
    };
  }
  const c = await getClubDoc(slug!);
  if (!c || !c.active) return null;
  return {
    slug: c.slug,
    name: c.name,
    city: c.city || "",
    tagline: c.tagline || "",
    color: c.color || "#1565c0",
    isDefault: false,
    whatsappNumber: c.whatsappNumber || "",
    upi: { vpa: c.upi?.vpa || "", payeeName: c.upi?.payeeName || c.name },
    programs: c.programs || [],
  };
}

/** Club names for dropdowns: Sathiyan first, then partner clubs A–Z. */
export async function listPublicClubs() {
  const docs = await listClubDocs();
  return [
    { slug: DEFAULT_CLUB, name: DEFAULT_CLUB_NAME, city: "Madurai" },
    ...docs.map((c: any) => ({ slug: c.slug, name: c.name, city: c.city || "" })),
  ];
}

/**
 * Which club an admin request acts on. Club admins are pinned to their own club whatever they
 * ask for; owner admins pick one (default Sathiyan). Returns null for anyone else.
 */
export function scopeClub(user: { role?: string; club?: string } | undefined, requested?: string | null): string | null {
  if (!user) return null;
  if (isClubAdmin(user.role)) return user.club || null;
  if (user.role === "admin") return requested && requested !== "all" ? requested.toLowerCase() : DEFAULT_CLUB;
  return null;
}

export class ClubError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const money = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
};

/**
 * Validates club fields from a form. `identity` (slug, ID prefix, active) can only be set by
 * the owner; club admins edit the rest of their own club.
 */
export function cleanClubInput(body: any, identity: boolean) {
  const out: Record<string, unknown> = {};
  const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  if (body.name !== undefined) {
    out.name = text(body.name, 80);
    if (!out.name) throw new ClubError("Club name is required");
  }
  if (body.city !== undefined) out.city = text(body.city, 60);
  if (body.tagline !== undefined) out.tagline = text(body.tagline, 160);
  if (body.color !== undefined && /^#[0-9a-f]{6}$/i.test(body.color)) out.color = body.color;
  if (body.whatsappNumber !== undefined) {
    const digits = String(body.whatsappNumber).replace(/\D/g, "");
    if (digits && digits.length !== 10 && digits.length !== 12) throw new ClubError("WhatsApp number should be 10 digits");
    out.whatsappNumber = digits;
  }
  if (body.upi !== undefined) {
    const vpa = text(body.upi?.vpa, 80);
    if (vpa && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(vpa)) throw new ClubError("UPI ID looks wrong (example: clubname@okaxis)");
    out.upi = { vpa, payeeName: text(body.upi?.payeeName, 80) };
  }
  if (body.programs !== undefined) {
    if (!Array.isArray(body.programs) || body.programs.length > 20) throw new ClubError("Invalid programmes");
    out.programs = body.programs.map((p: any, i: number) => {
      const name = text(p?.name, 60);
      const monthly = money(p?.monthly);
      const adult = p?.adultMonthly === "" || p?.adultMonthly === undefined || p?.adultMonthly === null ? undefined : money(p.adultMonthly);
      if (!name || monthly === null || adult === null) throw new ClubError(`Programme ${i + 1}: name and fees are required`);
      return { key: text(p?.key, 40) || `p${i + 1}-${Date.now().toString(36)}`, name, monthly, ...(adult !== undefined && { adultMonthly: adult }) };
    });
  }
  if (identity) {
    if (body.slug !== undefined) {
      const slug = String(body.slug).toLowerCase().trim();
      if (!/^[a-z0-9-]{2,40}$/.test(slug) || slug === DEFAULT_CLUB) throw new ClubError("Web address: 2–40 letters, numbers or dashes");
      out.slug = slug;
    }
    if (body.champIdPrefix !== undefined) {
      const prefix = String(body.champIdPrefix).toUpperCase().trim();
      if (!/^[A-Z]{2,4}$/.test(prefix)) throw new ClubError("Member ID prefix: 2–4 letters (S is Sathiyan's)");
      out.champIdPrefix = prefix;
    }
    if (body.active !== undefined) out.active = Boolean(body.active);
  }
  return out;
}
