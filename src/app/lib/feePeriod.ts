// Membership fees run on calendar months ("1 to 30"): a period normally starts on the 1st and
// ends on the last day of the month, whatever day the parent actually pays. Admins can move
// either date (members who join mid-month, missed months being back-filled…), so these helpers
// only provide the defaults. Dates are IST calendar dates as "YYYY-MM-DD"; pure, shared by the
// admin page, the member pay page and the server.

const DAY_MS = 24 * 60 * 60 * 1000;

export const ymdParts = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
};

const fromUtc = (date: Date) => date.toISOString().slice(0, 10);

/** Last day of the month that is `months - 1` months after the start's month. */
export function periodEndYmd(startYmd: string, months: number): string {
  const { y, m } = ymdParts(startYmd);
  return fromUtc(new Date(Date.UTC(y, m - 1 + months, 0)));
}

/** First day of the start's month. */
export function monthStartYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const { y, m, d } = ymdParts(ymd);
  return fromUtc(new Date(Date.UTC(y, m - 1, d) + days * DAY_MS));
}

export const daysBetweenYmd = (a: string, b: string) => {
  const pa = ymdParts(a);
  const pb = ymdParts(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / DAY_MS);
};

/** A lapse shorter than this continues from the old end date; longer lapses restart this month. */
export const CONTINUE_WITHIN_DAYS = 30;

/**
 * Where the next period should start: the day after the current paid-till date when the member
 * is current (or only recently lapsed), otherwise the 1st of the current month.
 */
export function nextPeriodStartYmd(paidTillYmd: string | null, todayYmd: string): string {
  if (paidTillYmd && daysBetweenYmd(paidTillYmd, todayYmd) <= CONTINUE_WITHIN_DAYS) {
    return addDaysYmd(paidTillYmd, 1);
  }
  return monthStartYmd(todayYmd);
}

export const isYmd = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
