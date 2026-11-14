import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToMongoose } from "@/app/server/mongodb";
import Club from "@/app/models/Club";
import User from "@/app/models/User";
import { ClubError, cleanClubInput, invalidatePublicClub } from "@/app/lib/clubs.server";

export const dynamic = "force-dynamic";

const fail = (error: unknown) => {
  if (error instanceof ClubError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  console.error("Club update failed:", error);
  return NextResponse.json({ success: false, error: "Failed to update club" }, { status: 500 });
};

// Owner only (middleware). Edit a club; the web address and ID prefix are fixed once members exist.
export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await connectToMongoose();
    const club = await (Club.findOne as any)({ slug: params.slug });
    if (!club) throw new ClubError("Club not found", 404);
    const data = cleanClubInput(await request.json(), true);
    const hasMembers = await (User.exists as any)({ club: club.slug });
    if (hasMembers) {
      delete data.slug;
      delete data.champIdPrefix;
    }
    Object.assign(club, data);
    await club.save();
    invalidatePublicClub(club.slug);
    return NextResponse.json({ success: true, club });
  } catch (error: any) {
    if (error?.code === 11000) return NextResponse.json({ success: false, error: "That web address or ID prefix is taken" }, { status: 409 });
    return fail(error);
  }
}

// { action: 'addAdmin', name, mobile, password } — a club admin logs in with this mobile + club
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await connectToMongoose();
    const club = await (Club.findOne as any)({ slug: params.slug }).lean();
    if (!club) throw new ClubError("Club not found", 404);
    const { action, name, mobile, password, email } = await request.json();
    if (action !== "addAdmin") throw new ClubError("Unknown action");

    const phone = String(mobile || "").replace(/\D/g, "").slice(-10);
    if (!String(name || "").trim()) throw new ClubError("Name is required");
    if (phone.length !== 10) throw new ClubError("Mobile number should be 10 digits");
    if (String(password || "").length < 6) throw new ClubError("Password must be at least 6 characters");
    if (await (User.exists as any)({ club: club.slug, mobile: phone })) {
      throw new ClubError("Someone in this club already uses that mobile number");
    }

    const admin = await (User.create as any)({
      // admins get their own ID series so members still start at <prefix>1001
      champId: `${club.champIdPrefix}-ADMIN-${Date.now().toString(36).toUpperCase()}`,
      name: String(name).trim(),
      email: String(email || "").trim() || `${phone}@${club.slug}.club`,
      mobile: phone,
      phone,
      password: await bcrypt.hash(String(password), 12),
      role: "club_admin",
      club: club.slug,
      champType: "adult",
      subscribed: "no",
      provider: "credentials",
    });
    return NextResponse.json({ success: true, admin: { id: String(admin._id), name: admin.name, mobile: admin.mobile } });
  } catch (error) {
    return fail(error);
  }
}

// ?admin=<userId> removes a club admin's access
export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
  const adminId = request.nextUrl.searchParams.get("admin");
  if (!adminId || !mongoose.isValidObjectId(adminId)) return fail(new ClubError("Invalid admin"));
  await connectToMongoose();
  const removed = await (User.findOneAndDelete as any)({ _id: adminId, role: "club_admin", club: params.slug });
  if (!removed) return fail(new ClubError("Admin not found", 404));
  return NextResponse.json({ success: true });
}
