import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authConfig";
import { connectToMongoose } from "@/app/server/mongodb";
import Club from "@/app/models/Club";
import { ClubError, cleanClubInput } from "@/app/lib/clubs.server";
import { isClubAdmin } from "@/app/lib/clubs";

export const dynamic = "force-dynamic";

// A club admin's own club: profile, UPI, WhatsApp and programme fees
async function ownClub() {
  const session = await getServerSession(authOptions);
  if (!isClubAdmin(session?.user?.role) || !session?.user?.club) return null;
  await connectToMongoose();
  return (Club.findOne as any)({ slug: session.user.club });
}

export async function GET() {
  const club = await ownClub();
  if (!club) return NextResponse.json({ success: false, error: "Only club admins have a club here" }, { status: 404 });
  return NextResponse.json({ success: true, club });
}

export async function PUT(request: NextRequest) {
  try {
    const club = await ownClub();
    if (!club) throw new ClubError("Club not found", 404);
    Object.assign(club, cleanClubInput(await request.json(), false));
    await club.save();
    return NextResponse.json({ success: true, club });
  } catch (error) {
    if (error instanceof ClubError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    console.error("Club settings update failed:", error);
    return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 });
  }
}
