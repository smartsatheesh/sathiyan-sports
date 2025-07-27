import "./globals.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sathiyan Sports",
  description: "Multi-sport slot booking app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/sathiyanlogo.jpeg" type="image/jpeg" />
        <link rel="shortcut icon" href="/sathiyanlogo.jpeg" type="image/jpeg" />
      </head>
      <body className="Arial">
        <AppBar position="sticky" color="primary" elevation={3}>
          <Toolbar>
            <Button href="/" component="a" sx={{ p: 0, minWidth: 40, mr: 2 }}>
              <img
                src="/sathiyanlogo.jpeg"
                alt="Sathiyan Logo"
                style={{ height: 40, width: 40, borderRadius: 8 }}
              />
            </Button>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              SATHIYAN SPORTS
            </Typography>
            <Button color="inherit" href="/" component="a">
              Home
            </Button>
            <Button color="inherit" component={Link} href="/about">
              About
            </Button>
            <Button color="inherit" href="/#contact" component="a">
              Contact
            </Button>
            <Button color="inherit" component={Link} href="/admin">
              Admin
            </Button>
            <Button color="inherit" component={Link} href="/bookslot">
              Book Slot
            </Button>
            <Button color="inherit" component={Link} href="/register">
              Registration
            </Button>
          </Toolbar>
        </AppBar>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </body>
    </html>
  );
}
