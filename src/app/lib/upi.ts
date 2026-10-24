// UPI helpers shared by client and server.

// Some UPI apps don't decode "+" or "%40", so keep the VPA's "@" literal and encode
// everything else with encodeURIComponent (spaces become %20).
export function buildUpiUrl(opts: { vpa: string; payeeName: string; amount: number; note: string }): string {
  const vpa = encodeURIComponent(opts.vpa).replace(/%40/g, "@");
  return (
    `upi://pay?pa=${vpa}` +
    `&pn=${encodeURIComponent(opts.payeeName)}` +
    `&am=${opts.amount.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(opts.note.slice(0, 80))}`
  );
}

/** UPI reference numbers (UTR / RRN) are 12 digits. Strips spaces users paste in. */
export function normalizeUtr(raw: string): string {
  return (raw || "").replace(/\s+/g, "").trim();
}

export function isValidUtr(raw: string): boolean {
  return /^\d{12}$/.test(normalizeUtr(raw));
}
