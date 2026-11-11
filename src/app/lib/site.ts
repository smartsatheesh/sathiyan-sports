// The site's public address, used in WhatsApp messages, pay links and share text.
// NEXT_PUBLIC_SITE_URL is read at build time; the default is the live domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sathiyansports.in").replace(/\/$/, "");
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
