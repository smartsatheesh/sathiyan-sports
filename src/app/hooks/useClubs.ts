"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_CLUB, isDefaultClub, PublicClub } from "@/app/lib/clubs";
import { SiteSettings } from "@/app/lib/pricing";
import { useSiteSettings } from "./useSiteSettings";

export interface ClubOption {
  slug: string;
  name: string;
  city: string;
}

const DEFAULT_OPTION: ClubOption = { slug: DEFAULT_CLUB, name: "Sathiyan Multisport Club", city: "Madurai" };
const LAST_CLUB_KEY = "lastClub";

let pending: Promise<ClubOption[]> | null = null;

/** Clubs for the login/registration dropdowns (Sathiyan first). */
export function useClubOptions(): ClubOption[] {
  const [clubs, setClubs] = useState<ClubOption[]>([DEFAULT_OPTION]);
  useEffect(() => {
    if (!pending) {
      pending = fetch("/api/clubs")
        .then((r) => r.json())
        .then((d) => (d.success && d.clubs?.length ? d.clubs : [DEFAULT_OPTION]))
        .catch(() => {
          pending = null;
          return [DEFAULT_OPTION];
        });
    }
    let active = true;
    pending.then((c) => active && setClubs(c));
    return () => {
      active = false;
    };
  }, []);
  return clubs;
}

/** The club picked last time on this device, so returning members don't have to choose again. */
export function rememberedClub(): string {
  try {
    return localStorage.getItem(LAST_CLUB_KEY) || DEFAULT_CLUB;
  } catch {
    return DEFAULT_CLUB;
  }
}

export function rememberClub(slug: string) {
  try {
    localStorage.setItem(LAST_CLUB_KEY, slug);
  } catch {
    /* private mode */
  }
}

/**
 * A club's public profile and its prices as SiteSettings, so pricing helpers work unchanged.
 * For Sathiyan this is just the site settings.
 */
export function useClub(slug: string | null | undefined): { club: PublicClub | null; settings: SiteSettings; loading: boolean } {
  const { settings: site, loading: siteLoading } = useSiteSettings();
  const [club, setClub] = useState<PublicClub | null>(null);
  const [loading, setLoading] = useState(true);
  const key = slug || DEFAULT_CLUB;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/clubs/${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => active && setClub(d.success ? d.club : null))
      .catch(() => active && setClub(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [key]);

  const settings = useMemo<SiteSettings>(() => {
    if (isDefaultClub(key) || !club) return site;
    return {
      ...site,
      membership: { programs: club.programs, flexibleSurchargePerMonth: 0 },
      upi: club.upi,
      whatsappNumber: club.whatsappNumber,
    };
  }, [key, club, site]);

  return { club, settings, loading: loading || siteLoading };
}
