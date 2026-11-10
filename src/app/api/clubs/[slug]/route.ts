import { NextResponse } from "next/server";
import { getPublicClub } from "@/app/lib/clubs.server";

export const dynamic = "force-dynamic";

// Public club profile: name, programmes and fees, and where to pay (UPI) or message (WhatsApp)
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const club = await getPublicClub(params.slug);
  if (!club) return NextResponse.json({ success: false, error: "Club not found" }, { status: 404 });
  return NextResponse.json({ success: true, club });
}
