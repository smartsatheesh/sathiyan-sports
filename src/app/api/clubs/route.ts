import { NextResponse } from "next/server";
import { listPublicClubs } from "@/app/lib/clubs.server";

export const dynamic = "force-dynamic";

// Club names for the login and registration dropdowns (Sathiyan first)
export async function GET() {
  try {
    return NextResponse.json({ success: true, clubs: await listPublicClubs() });
  } catch (error) {
    console.error("Failed to list clubs:", error);
    return NextResponse.json({ success: false, error: "Failed to load clubs" }, { status: 500 });
  }
}
