import Expense from "@/app/models/Expense";
import Subscription from "@/app/models/Subscription";
import Booking from "@/app/models/Booking";
import Player from "@/app/models/Player";
import { getSiteSettings } from "@/app/lib/settings.server";

// The money ledger behind /admin/expenses ("Money"): every rupee in and out, month by month,
// plus the running reserve cash. Money in = member fees (by payment date), court bookings (by
// play date), tournament entry fees (paid registrations, by registration date) and manual
// income entries (reserve money, land sale, sponsorship…). Money out = expense entries.
// Reserve cash = opening balance (Settings) + every month's net since the opening month.

const IST_OFFSET_MS = 330 * 60 * 1000;
const IST_TZ = "+05:30";
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type EntryType = "expense" | "income";

export interface MonthTotals {
  fees: number;
  bookings: number;
  tournaments: number;
  otherIncome: number; // manual income entries
  spent: number; // expense entries
}

const emptyTotals = (): MonthTotals => ({ fees: 0, bookings: 0, tournaments: 0, otherIncome: 0, spent: 0 });
export const incomeOf = (t: MonthTotals) => t.fees + t.bookings + t.tournaments + t.otherIncome;
export const netOf = (t: MonthTotals) => incomeOf(t) - t.spent;

/** [start, end) of a calendar month in India time, from "YYYY-MM". */
export function istMonthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS),
  };
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthOf(date: Date): string {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const PAID_BOOKING = { paymentStatus: { $in: ["completed", "paid", "confirmed"] }, bookingStatus: { $ne: "cancelled" } };

/** Money in and out grouped by IST month ("YYYY-MM") for every source, within [start, end). */
export async function totalsByMonth(start: Date, end: Date): Promise<Record<string, MonthTotals>> {
  const byMonth = (field: string) => ({ $dateToString: { format: "%Y-%m", date: `$${field}`, timezone: IST_TZ } });
  const [ledger, fees, bookings, tournaments] = await Promise.all([
    (Expense.aggregate as any)([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: { month: byMonth("date"), type: { $ifNull: ["$type", "expense"] } }, total: { $sum: "$amount" } } },
    ]),
    (Subscription.aggregate as any)([
      { $match: { paymentStatus: "Paid", lastPaymentDate: { $gte: start, $lt: end } } },
      { $group: { _id: byMonth("lastPaymentDate"), total: { $sum: "$amount" } } },
    ]),
    (Booking.aggregate as any)([
      { $match: { ...PAID_BOOKING, date: { $gte: start, $lt: end } } },
      { $group: { _id: byMonth("date"), total: { $sum: "$totalAmount" } } },
    ]),
    (Player.aggregate as any)([
      { $match: { paymentStatus: "completed", registrationFee: { $gt: 0 }, registeredAt: { $gte: start, $lt: end } } },
      { $group: { _id: byMonth("registeredAt"), total: { $sum: "$registrationFee" } } },
    ]),
  ]);

  const out: Record<string, MonthTotals> = {};
  const at = (m: string) => (out[m] ||= emptyTotals());
  for (const r of ledger) {
    if (r._id.type === "income") at(r._id.month).otherIncome += r.total || 0;
    else at(r._id.month).spent += r.total || 0;
  }
  for (const r of fees) at(r._id).fees += r.total || 0;
  for (const r of bookings) at(r._id).bookings += r.total || 0;
  for (const r of tournaments) at(r._id).tournaments += r.total || 0;
  return out;
}

function sumTotals(months: Record<string, MonthTotals>): MonthTotals {
  const t = emptyTotals();
  for (const m of Object.values(months)) {
    t.fees += m.fees; t.bookings += m.bookings; t.tournaments += m.tournaments; t.otherIncome += m.otherIncome; t.spent += m.spent;
  }
  return t;
}

/** Reserve cash at an instant: opening balance + net of everything from the opening month until then. */
async function balanceAt(end: Date, opening: { openingBalance: number; openingMonth: string }) {
  const start = opening.openingMonth ? istMonthRange(opening.openingMonth).start : new Date(0);
  if (end <= start) return opening.openingBalance;
  return opening.openingBalance + netOf(sumTotals(await totalsByMonth(start, end)));
}

function sumBy(rows: any[], key: string): { name: string; total: number }[] {
  const totals: Record<string, number> = {};
  for (const r of rows) {
    const k = r[key] || "Other";
    totals[k] = (totals[k] || 0) + (r.amount || 0);
  }
  return Object.entries(totals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export async function getMonthReport(month: string) {
  const { start, end } = istMonthRange(month);
  const settings = await getSiteSettings();
  const opening = settings.expenses;

  const [entries, months, prevMonths, closing] = await Promise.all([
    (Expense.find as any)({ date: { $gte: start, $lt: end } }).sort({ date: -1, createdAt: -1 }).lean(),
    totalsByMonth(start, end),
    totalsByMonth(istMonthRange(previousMonth(month)).start, start),
    balanceAt(end, opening),
  ]);
  const t = months[month] || emptyTotals();
  const prev = prevMonths[previousMonth(month)] || emptyTotals();

  const expenses = entries.filter((e: any) => e.type !== "income");
  const incomeEntries = entries.filter((e: any) => e.type === "income");
  const total = t.spent;
  const income = {
    fees: t.fees,
    bookings: t.bookings,
    tournaments: t.tournaments,
    other: t.otherIncome,
    byCategory: sumBy(incomeEntries, "category"),
    total: incomeOf(t),
  };
  const net = netOf(t);
  // Reserve cash is only meaningful from the opening month onwards
  const tracked = !opening.openingMonth || month >= opening.openingMonth;

  return {
    expenses,
    incomeEntries,
    summary: {
      total,
      previousTotal: prev.spent,
      previousIncome: incomeOf(prev),
      byCategory: sumBy(expenses, "category"),
      byPerson: sumBy(expenses, "paidBy"),
      byMethod: sumBy(expenses.map((e: any) => ({ ...e, method: e.paymentMethod === "gpay" ? "UPI" : "Cash" })), "method"),
      income,
      net,
      reserve: {
        tracked,
        opening: tracked ? closing - net : null,
        closing: tracked ? closing : null,
        openingBalance: opening.openingBalance,
        openingMonth: opening.openingMonth,
      },
    },
  };
}

/** Twelve rows (Jan–Dec) of money in / out / net and the reserve cash at each month end. */
export async function getYearReport(year: number) {
  const settings = await getSiteSettings();
  const yearStart = istMonthRange(`${year}-01`).start;
  const yearEnd = istMonthRange(`${year + 1}-01`).start;
  const [months, opening] = await Promise.all([
    totalsByMonth(yearStart, yearEnd),
    balanceAt(yearStart, settings.expenses),
  ]);
  const openingMonth = settings.expenses.openingMonth;
  let reserve = opening;
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const month = `${year}-${String(m).padStart(2, "0")}`;
    const t = months[month] || emptyTotals();
    const tracked = !openingMonth || month >= openingMonth;
    if (tracked) reserve += netOf(t);
    rows.push({ month, ...t, income: incomeOf(t), net: netOf(t), reserve: tracked ? reserve : null });
  }
  const totals = sumTotals(months);
  return {
    year,
    opening,
    openingMonth,
    months: rows,
    totals: { ...totals, income: incomeOf(totals), net: netOf(totals) },
  };
}

export const isMonth = (v: unknown) => typeof v === "string" && MONTH_RE.test(v);

/** Validates and normalises a ledger entry from the request body. Returns [data, error]. */
export async function parseExpense(body: any): Promise<[any, string | null]> {
  const settings = await getSiteSettings();
  const type: EntryType = body.type === "income" ? "income" : "expense";
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) return [null, "Enter an amount"];
  const description = String(body.description || "").trim();
  if (!description) return [null, type === "income" ? "Say where the money came from" : "Say what the money was for"];
  if (!settings.expenses.people.includes(body.paidBy) && !body.allowLegacy) {
    return [null, type === "income" ? "Choose who received it" : "Choose who paid"];
  }
  const categories = type === "income" ? settings.expenses.incomeCategories : settings.expenses.categories;
  if (!categories.includes(body.category) && !body.allowLegacy) return [null, "Choose a category"];
  const paymentMethod = body.paymentMethod === "gpay" || body.paymentMethod === "upi" ? "gpay" : "cash";
  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) return [null, "Invalid date"];

  return [
    {
      type,
      amount,
      description: description.slice(0, 200),
      paidBy: String(body.paidBy),
      category: String(body.category),
      paymentMethod,
      transactionId: paymentMethod === "gpay" ? String(body.transactionId || "").trim() || undefined : undefined,
      date,
    },
    null,
  ];
}
