"use client";

import React, { createContext, useContext } from "react";
import { PublicClub } from "../lib/clubs";

const TenantContext = createContext<PublicClub | null>(null);

/** Makes the current club (from the host name, resolved in the root layout) available to client components. */
export default function TenantProvider({ tenant, children }: { tenant: PublicClub; children: React.ReactNode }) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

/** The club this site is showing. `isDefault` is true on Sathiyan's own site. */
export function useTenant(): PublicClub {
  const t = useContext(TenantContext);
  if (!t) throw new Error("useTenant must be used inside TenantProvider");
  return t;
}
