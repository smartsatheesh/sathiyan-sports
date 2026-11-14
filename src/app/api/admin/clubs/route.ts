import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Club from "@/app/models/Club";
import User from "@/app/models/User";
import { ClubError, cleanClubInput, invalidatePublicClub, listClubDocs } from "@/app/lib/clubs.server";
import { invalidateSettings, settingsKeyFor } from "@/app/lib/settings.server";
import { slugify } from "@/app/lib/clubs";

export const dynamic = "force-dynamic";

// Owner only (middleware): every partner club with its admins and member count
export async function GET() {
  await connectToMongoose();
  const clubs = await listClubDocs(true);
  const slugs = clubs.map((c: any) => c.slug);
  const [admins, counts] = await Promise.all([
    (User.find as any)({ role: "club_admin", club: { $in: slugs } }).select("name mobile club champId").lean(),
    (User.aggregate as any)([{ $match: { role: "customer", club: { $in: slugs } } }, { $group: { _id: "$club", n: { $sum: 1 } } }]),
  ]);
  const countBy = new Map(counts.map((c: any) => [c._id, c.n]));
  return NextResponse.json({
    success: true,
    clubs: clubs.map((c: any) => ({
      ...c,
      _id: String(c._id),
      logoUrl: c.hasLogo ? `/api/clubs/${c.slug}/logo?v=${new Date(c.updatedAt || 0).getTime()}` : null,
      members: countBy.get(c.slug) || 0,
      admins: admins.filter((a: any) => a.club === c.slug).map((a: any) => ({ id: String(a._id), name: a.name, mobile: a.mobile })),
    })),
  });
}

// Create a club
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = cleanClubInput({ ...body, slug: body.slug || slugify(body.name || "") }, true);
    if (!data.champIdPrefix) throw new ClubError("Member ID prefix is required");
    await connectToMongoose();
    const club = await (Club.create as any)({ programs: [], ...data });
    // a visit to the new subdomain before the club existed may have cached "no such club"
    invalidatePublicClub(club.slug);
    invalidateSettings(settingsKeyFor(club.slug));
    return NextResponse.json({ success: true, club });
  } catch (error: any) {
    if (error instanceof ClubError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return NextResponse.json(
        { success: false, error: field === "champIdPrefix" ? "Another club already uses that member ID prefix" : "Another club already uses that web address" },
        { status: 409 }
      );
    }
    console.error("Create club failed:", error);
    return NextResponse.json({ success: false, error: "Failed to create club" }, { status: 500 });
  }
}
