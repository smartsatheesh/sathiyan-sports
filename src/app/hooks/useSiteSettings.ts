"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, SiteSettings, withDefaults } from "@/app/lib/pricing";

// One fetch per page load, shared by every component that needs prices or UPI details.
let pending: Promise<SiteSettings> | null = null;
let loaded: SiteSettings | null = null;

function fetchSettings(): Promise<SiteSettings> {
  if (!pending) {
    pending = fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => (loaded = withDefaults(d?.settings)))
      .catch(() => {
        pending = null; // retry on next mount
        return DEFAULT_SETTINGS;
      });
  }
  return pending;
}

/** Call after the admin saves settings so open pages pick up the new values. */
export function invalidateSiteSettings(next?: SiteSettings) {
  loaded = next ?? null;
  pending = next ? Promise.resolve(next) : null;
}

export function useSiteSettings(): { settings: SiteSettings; loading: boolean } {
  const [settings, setSettings] = useState<SiteSettings>(loaded ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!loaded);

  useEffect(() => {
    let active = true;
    fetchSettings().then((s) => {
      if (active) {
        setSettings(s);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading };
}
