import "./globals.css";
import "./globals-tournament.css";
import "./navbar-responsive.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import Providers from "./providers";
import Navbar from "./components/Navbar";
import ChatbotWidget from "./components/ChatbotWidget";
import { getTenant } from "./lib/tenant.server";

export const dynamic = "force-dynamic"; // the tenant comes from the request host

// Sathiyan's own metadata; a partner club's site gets its name and logo instead
const sathiyanMetadata: Metadata = {
  title: "Sathiyan Sports",
  description: "Multi-sport training and coaching platform inspired by legendary coaching excellence",
  icons: {
    icon: [
      {
        url: "/sathiyanlogo.png",
        sizes: "any",
        type: "image/png",
      },
      {
        url: "/icon.png", 
        sizes: "any",
        type: "image/png",
      }
    ],
    shortcut: [
      {
        url: "/sathiyanlogo.png",
        type: "image/png",
      }
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      }
    ],
  },
  manifest: "/manifest.json",
};

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  if (tenant.isDefault) return sathiyanMetadata;
  const icon = tenant.logoUrl || "/icon.png";
  return {
    title: { default: tenant.name, template: `%s · ${tenant.name}` },
    description: tenant.tagline || `${tenant.name}${tenant.city ? `, ${tenant.city}` : ""}: coaching programmes, memberships and easy UPI fee payments.`,
    icons: { icon: [{ url: icon }], shortcut: [{ url: icon }], apple: [{ url: icon }] },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();
  const favicon = tenant.isDefault ? "/sathiyanlogo.png" : tenant.logoUrl || "/icon.png";
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* Additional favicon fallbacks for better browser compatibility */}
        <link rel="icon" href={favicon} type="image/png" />
        <link rel="shortcut icon" href={favicon} type="image/png" />
        <link rel="apple-touch-icon" href={tenant.isDefault ? "/apple-icon.png" : favicon} />
        
      </head>
      <body className="Arial">
        <Providers tenant={tenant}>
          <Navbar />
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          {tenant.isDefault && <ChatbotWidget />}
        </Providers>
      </body>
    </html>
  );
}
