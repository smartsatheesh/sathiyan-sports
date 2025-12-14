import "./globals.css";
import "./navbar-responsive.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import Providers from "./providers";
import Navbar from "./components/Navbar";
import "./lib/scheduler-init"; // Initialize attendance scheduler

export const metadata: Metadata = {
  title: "Sathiyan Sports",
  description: "Multi-sport training and coaching platform inspired by legendary coaching excellence",
  icons: {
    icon: [
      {
        url: "/sathiyanlogo.jpeg",
        sizes: "any",
        type: "image/jpeg",
      },
      {
        url: "/icon.png", 
        sizes: "any",
        type: "image/png",
      }
    ],
    shortcut: [
      {
        url: "/sathiyanlogo.jpeg",
        type: "image/jpeg",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
        
        {/* Additional favicon fallbacks for better browser compatibility */}
        <link rel="icon" href="/sathiyanlogo.jpeg" type="image/jpeg" />
        <link rel="shortcut icon" href="/sathiyanlogo.jpeg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
        
        {/* Razorpay Checkout Script for Real UPI Payments */}
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body className="Arial">
        <Providers>
          <Navbar />
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
