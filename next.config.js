/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is needed for the attendance QR scanner
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(self)" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Old fee screens were merged into Admin → Membership Fees
      { source: "/admin/subscriptions", destination: "/admin/fees", permanent: false },
      { source: "/admin/fee-collection", destination: "/admin/fees", permanent: false },
      { source: "/admin/subscription-management", destination: "/admin/fees", permanent: false },
      { source: "/subscription", destination: "/admin/fees", permanent: false },
      { source: "/notifications", destination: "/admin", permanent: false },
      { source: "/expenses", destination: "/admin/expenses", permanent: false },
      { source: "/admin/expenses/stats", destination: "/admin/expenses", permanent: false },
      {
        source: "/:path*",
        has: [{ type: "host", value: "sathiyansports.fit" }],
        destination: "https://www.sathiyansports.fit/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
