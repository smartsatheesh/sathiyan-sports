"use client";

import { useEffect, useMemo } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import TenantProvider from "./components/TenantProvider";
import { PublicClub } from "./lib/clubs";

/** A darker version of a #rrggbb colour (factor < 1). */
function shade(hex: string, factor: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return hex;
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor))).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

// Sathiyan's own theme; a partner club's site swaps in its own colours
const baseTheme = createTheme({
  palette: {
    primary: {
      main: "#20b2aa", // Primary teal
      dark: "#008080", // Dark teal
      light: "#14b8a6", // Light teal
    },
    secondary: {
      main: "#fbbf24", // Gold accent
      dark: "#f59e0b", // Dark gold
    },
    success: {
      main: "#10b981", // Success green
    },
    warning: {
      main: "#f97316", // Warning orange
    },
    error: {
      main: "#ef4444", // Error red
    },
    info: {
      main: "#3b82f6", // Info blue
    },
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
});

interface ProvidersProps {
  tenant: PublicClub;
  children: React.ReactNode;
}

export default function Providers({ tenant, children }: ProvidersProps) {
  const theme = useMemo(
    () =>
      tenant.isDefault
        ? baseTheme
        : createTheme(baseTheme, {
            palette: {
              primary: { main: tenant.color, dark: tenant.color, light: tenant.color },
              secondary: { main: tenant.accentColor, dark: tenant.accentColor },
            },
          }),
    [tenant]
  );
  // The navbar and a few CSS rules use the teal variables; a partner club's site recolours them
  useEffect(() => {
    const root = document.documentElement;
    const vars = ["--primary-teal", "--primary-teal-dark", "--primary-teal-darker", "--primary-gradient"];
    if (tenant.isDefault) {
      vars.forEach((v) => root.style.removeProperty(v));
      return;
    }
    const dark = shade(tenant.color, 0.75);
    const darker = shade(tenant.color, 0.55);
    root.style.setProperty("--primary-teal", tenant.color);
    root.style.setProperty("--primary-teal-dark", dark);
    root.style.setProperty("--primary-teal-darker", darker);
    root.style.setProperty("--primary-gradient", `linear-gradient(135deg, ${tenant.color} 0%, ${darker} 100%)`);
  }, [tenant]);
  return (
    <SessionProvider>
      <TenantProvider tenant={tenant}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </TenantProvider>
    </SessionProvider>
  );
}
