import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicClub } from "@/app/lib/clubs.server";
import { isDefaultClub } from "@/app/lib/clubs";
import ClubHome from "./ClubHome";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const club = await getPublicClub(params.slug).catch(() => null);
  if (!club) return { title: "Club not found" };
  return {
    title: `${club.name}${club.city ? ` · ${club.city}` : ""} — membership & fees`,
    description: club.tagline || `Join ${club.name}: coaching programmes, monthly fees and easy UPI payments.`,
  };
}

// Each partner club's own home page: programmes and fees, join, member login, pay fees.
export default async function ClubPage({ params }: { params: { slug: string } }) {
  if (isDefaultClub(params.slug)) redirect("/");
  const club = await getPublicClub(params.slug);
  if (!club) notFound();
  return <ClubHome club={club} />;
}
