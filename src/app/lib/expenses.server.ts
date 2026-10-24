import Expense from "@/app/models/Expense";
import Subscription from "@/app/models/Subscription";
import Booking from "@/app/models/Booking";
import { getSiteSettings } from "@/app/lib/settings.server";

const IST_OFFSET_MS = 330 * 60 * 1000;

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
  const prev = istMonthRange(previousMonth(month));

  const [expenses, prevTotal, fees, bookings] = await Promise.all([
    (Expense.find as any)({ date: { $gte: start, $lt: end } }).sort({ date: -1, createdAt: -1 }).lean(),
    (Expense.aggregate as any)([
      { $match: { date: { $gte: prev.start, $lt: prev.end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    (Subscription.aggregate as any)([
      { $match: { paymentStatus: "Paid", lastPaymentDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    (Booking.aggregate as any)([
      { $match: { paymentStatus: { $in: ["completed", "paid"] }, date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const income = { fees: fees[0]?.total || 0, bookings: bookings[0]?.total || 0 };

  return {
    expenses,
    summary: {
      total,
      previousTotal: prevTotal[0]?.total || 0,
      byCategory: sumBy(expenses, "category"),
      byPerson: sumBy(expenses, "paidBy"),
      byMethod: sumBy(expenses.map((e: any) => ({ ...e, method: e.paymentMethod === "gpay" ? "UPI" : "Cash" })), "method"),
      income: { ...income, total: income.fees + income.bookings },
      net: income.fees + income.bookings - total,
    },
  };
}

/** Validates and normalises an expense from the request body. Returns [data, error]. */
export async function parseExpense(body: any): Promise<[any, string | null]> {
  const settings = await getSiteSettings();
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return [null, "Enter an amount"];
  const description = String(body.description || "").trim();
  if (!description) return [null, "Say what the money was for"];
  if (!settings.expenses.people.includes(body.paidBy) && !body.allowLegacy) return [null, "Choose who paid"];
  if (!settings.expenses.categories.includes(body.category) && !body.allowLegacy) return [null, "Choose a category"];
  const paymentMethod = body.paymentMethod === "gpay" || body.paymentMethod === "upi" ? "gpay" : "cash";
  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) return [null, "Invalid date"];

  return [
    {
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
