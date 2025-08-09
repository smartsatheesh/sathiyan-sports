import "./globals.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import Providers from "./providers";
import Navbar from "./components/Navbar";

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
