import { NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Club from "@/app/models/Club";

export const dynamic = "force-dynamic";

// A club's logo (stored as a small data URL on the Club document)
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  await connectToMongoose();
  const club = await (Club.findOne as any)({ slug: String(params.slug).toLowerCase(), hasLogo: true }).select("logo").lean();
  const match = club?.logo && /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(club.logo);
  if (!match) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
