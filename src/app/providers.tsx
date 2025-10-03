"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
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
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
