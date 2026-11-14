import { createHmac, timingSafeEqual } from "crypto";
import { SITE_URL as PUBLIC_SITE_URL } from "./site";
import { siteUrlFor } from "./tenant";
import { isDefaultClub } from "./clubs";
import mongoose from "mongoose";
import { connectToMongoose } from "@/app/server/mongodb";
import Subscription from "@/app/models/Subscription";
import User from "@/app/models/User";
import Payment from "@/app/models/Payment";
import { getClubSettings, getPublicClub } from "@/app/lib/clubs.server";
import { clubFilter, clubOf, DEFAULT_CLUB } from "@/app/lib/clubs";
import { PaymentError, submitPaymentProof } from "@/app/lib/payments.server";
import { getISTTodayStart } from "@/app/lib/istDate";
import {
  calculateMembershipPrice,
  programFor,
  SiteSettings,
  SUBSCRIPTION_MONTHS,
  SubscriptionType,
} from "@/app/lib/pricing";
import { normalizeUtr, isValidUtr } from "@/app/lib/upi";
import { latestPaidTill, syncUserFeeStatus } from "@/app/lib/feeStatus.server";

// Membership fees are stored as one Subscription document per paid period.
// "Paid till" = latest endDate of a Paid period; a member is due once that date passes.

export const SITE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || PUBLIC_SITE_URL;
const DAY = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 7;
// Overdue longer than this is treated as "probably left" and kept out of the Due list
export const LAPSED_AFTER_DAYS = 45;
// A lapse shorter than this continues from the old end date; longer lapses restart today.
const CONTINUE_WITHIN_DAYS = 30;

export const MONTHS_TO_TYPE: Record<number, SubscriptionType> = {
  1: "monthly",
  3: "quarterly",
  6: "half yearly",
  12: "yearly",
};

export type FeeState = "overdue" | "lapsed" | "due_soon" | "paid" | "awaiting_verification" | "never_paid";

export interface FeeMember {
  userId: string;
  champId: string;
  name: string;
  mobile: string;
  champType: string;
  sport: string;
  program: string;
  gender: string;
  paidTill: string | null;
  daysLeft: number | null; // negative = days overdue
  state: FeeState;
  monthlyFee: number;
  planFees: Record<number, number>; // months -> price
  lastAmount: number | null;
  lastPaidOn: string | null;
  feeReminderAt: string | null;
  payLink: string;
}

// ----- pay-link tokens (let a member pay without logging in) -----

function sign(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`fee:${userId}`).digest("hex").slice(0, 20);
}

export function payTokenFor(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function userIdFromPayToken(token: string): string | null {
  const [userId, sig] = String(token || "").split(".");
  if (!userId || !sig || !mongoose.isValidObjectId(userId)) return null;
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? userId : null;
}

export const payLinkFor = (userId: string, club?: string | null) => `${isDefaultClub(club) ? SITE_URL : siteUrlFor(club)}/pay/${payTokenFor(userId)}`;

// ----- pricing helpers -----

export function feeFor(settings: SiteSettings, user: any, months: number): number {
  return calculateMembershipPrice(settings, {
    champType: user.champType || "adult",
    preferredSport: user.preferredSport,
    coachingProgram: user.coachingProgram,
    gender: user.gender,
    preferredTimeSlot: user.preferredTimeSlot,
    subscriptionType: MONTHS_TO_TYPE[months] || "monthly",
    mode: user.mode,
  });
}

/** Where the next period should start, given the current paid-till date. */
export function nextPeriodStart(paidTill: Date | null): Date {
  const today = getISTTodayStart();
  if (paidTill && paidTill.getTime() >= today.getTime() - CONTINUE_WITHIN_DAYS * DAY) {
    return new Date(paidTill);
  }
  return today;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ----- the fee board -----

/** Fee board for one club (each club has its own members, prices and collections). */
export async function getFeeBoard(club: string = DEFAULT_CLUB): Promise<{ members: FeeMember[]; collectedThisMonth: number }> {
  await connectToMongoose();
  const settings = await getClubSettings(club);
  const today = getISTTodayStart();

  const users = await (User.find as any)({ role: "customer", subscribed: { $in: ["yes", "Yes"] }, ...clubFilter(club) })
    .select("champId name mobile phone champType preferredSport coachingProgram gender preferredTimeSlot mode feeReminderAt")
    .lean();
  // Periods are matched by member, so Sathiyan's older periods (no club field) still count
  const userIds = users.map((u: any) => u._id);

  const latestPaid = await (Subscription.aggregate as any)([
    { $match: { paymentStatus: "Paid", userId: { $in: userIds } } },
    { $sort: { endDate: -1 } },
    {
      $group: {
        _id: "$userId",
        paidTill: { $first: "$endDate" },
        lastAmount: { $first: "$amount" },
        lastPaidOn: { $first: "$lastPaymentDate" },
      },
    },
  ]);
  const paidByUser = new Map<string, any>(latestPaid.map((r: any) => [String(r._id), r]));

  // Members who have submitted a UPI proof we haven't checked yet
  const awaiting = await (Payment.find as any)({ kind: "subscription", status: "submitted" }).select("refId").lean();
  const awaitingSubs = await (Subscription.find as any)({ _id: { $in: awaiting.map((p: any) => p.refId) } })
    .select("userId")
    .lean();
  const awaitingUsers = new Set(awaitingSubs.map((s: any) => String(s.userId)));

  const members: FeeMember[] = users.map((u: any) => {
    const id = String(u._id);
    const paid = paidByUser.get(id);
    const paidTill: Date | null = paid?.paidTill ? new Date(paid.paidTill) : null;
    const daysLeft = paidTill ? Math.ceil((paidTill.getTime() - today.getTime()) / DAY) : null;

    let state: FeeState;
    if (awaitingUsers.has(id)) state = "awaiting_verification";
    else if (!paidTill) state = "never_paid";
    else if (daysLeft! < -LAPSED_AFTER_DAYS) state = "lapsed";
    else if (daysLeft! < 0) state = "overdue";
    else if (daysLeft! <= DUE_SOON_DAYS) state = "due_soon";
    else state = "paid";

    return {
      userId: id,
      champId: u.champId || "",
      name: u.name || "",
      mobile: u.mobile || u.phone || "",
      champType: u.champType || "adult",
      sport: u.preferredSport || "",
      program: programFor(settings, u).name,
      gender: u.gender || "",
      paidTill: paidTill ? paidTill.toISOString() : null,
      daysLeft,
      state,
      monthlyFee: feeFor(settings, u, 1),
      planFees: { 1: feeFor(settings, u, 1), 3: feeFor(settings, u, 3), 6: feeFor(settings, u, 6), 12: feeFor(settings, u, 12) },
      lastAmount: paid?.lastAmount ?? null,
      lastPaidOn: paid?.lastPaidOn ? new Date(paid.lastPaidOn).toISOString() : null,
      feeReminderAt: u.feeReminderAt ? new Date(u.feeReminderAt).toISOString() : null,
      payLink: payLinkFor(id, club),
    };
  });

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [collected] = await (Subscription.aggregate as any)([
    { $match: { paymentStatus: "Paid", lastPaymentDate: { $gte: monthStart }, userId: { $in: userIds } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return { members, collectedThisMonth: collected?.total || 0 };
}

export async function getMemberHistory(userId: string) {
  await connectToMongoose();
  return (Subscription.find as any)({ userId })
    .select("subscriptionType amount startDate endDate paymentStatus status paymentMethod transactionId lastPaymentDate notes")
    .sort({ startDate: -1 })
    .limit(24)
    .lean();
}

// ----- creating periods -----

async function buildPeriod(user: any, months: number, amount: number, startDate?: Date) {
  const type = MONTHS_TO_TYPE[months];
  if (!type) throw new PaymentError("Choose 1, 3, 6 or 12 months");
  const prevCount = await (Subscription.countDocuments as any)({ userId: user._id });
  const start = startDate || nextPeriodStart(await latestPaidTill(String(user._id)));
  const end = addMonths(start, SUBSCRIPTION_MONTHS[type]);

  return {
    userId: user._id,
    club: clubOf(user),
    champId: user.champId,
    userName: user.name,
    userEmail: user.email || "not-provided",
    userMobile: user.mobile || user.phone || "not-provided",
    subscriptionType: type,
    mode: user.mode === "flexible" ? "flexible" : "fixed",
    amount,
    duration: SUBSCRIPTION_MONTHS[type],
    startDate: start,
    endDate: end,
    nextDueDate: end,
    preferredSport: user.preferredSport,
    preferredTimeSlot: user.preferredTimeSlot,
    subscriptionPeriodId: `${user.champId}-${Date.now()}`,
    isRenewal: prevCount > 0,
    renewalNumber: prevCount + 1,
    createdBy: user._id,
  };
}

/** Admin records a fee collected at the desk (cash or UPI already received). */
export async function recordFeePayment(opts: {
  userId: string;
  months: number;
  amount?: number;
  method: "cash" | "upi";
  utr?: string;
  startDate?: string;
  adminName: string;
  /** Club the admin is acting for; members of other clubs are refused. */
  club: string;
}) {
  await connectToMongoose();
  const user = await (User.findById as any)(opts.userId).lean();
  if (!user || clubOf(user) !== opts.club) throw new PaymentError("Member not found", 404);

  const settings = await getClubSettings(opts.club);
  const amount = Number.isFinite(opts.amount) && opts.amount! >= 0 ? opts.amount! : feeFor(settings, user, opts.months);

  let utr: string | undefined;
  if (opts.method === "upi" && opts.utr) {
    utr = normalizeUtr(opts.utr);
    if (!isValidUtr(utr)) throw new PaymentError("UTR must be 12 digits");
    if (await (Payment.exists as any)({ utr })) throw new PaymentError("This UPI reference number has already been used", 409);
  }

  const period = await buildPeriod(user, opts.months, amount, opts.startDate ? new Date(opts.startDate) : undefined);
  const sub = await (Subscription.create as any)({
    ...period,
    paymentStatus: "Paid",
    status: "active",
    paymentMethod: opts.method === "upi" ? "UPI" : "Cash",
    transactionId: utr,
    lastPaymentDate: new Date(),
    notes: `Recorded by ${opts.adminName}`,
    updatedBy: user._id,
  });

  // Audit trail alongside customer-submitted UPI payments
  await (Payment.create as any)({
    kind: "subscription",
    refId: sub._id,
    club: opts.club,
    reference: user.champId,
    payerName: user.name,
    payerPhone: user.mobile || user.phone || "",
    amount,
    method: opts.method,
    utr,
    status: "confirmed",
    decidedBy: opts.adminName,
    decidedAt: new Date(),
  });

  await (Subscription.updateMany as any)(
    { userId: user._id, _id: { $ne: sub._id }, status: "active", endDate: { $lte: sub.startDate } },
    { status: "expired" }
  );
  if (String(user.subscribed || "").toLowerCase() !== "yes") {
    await (User.findByIdAndUpdate as any)(user._id, { subscribed: "yes" });
  }
  await syncUserFeeStatus(String(user._id));
  return sub;
}

/** Member pays online: create a pending period and attach their UPI proof. */
export async function submitMemberFee(userId: string, months: number, rawUtr: string) {
  await connectToMongoose();
  const utr = normalizeUtr(rawUtr);
  if (!isValidUtr(utr)) throw new PaymentError("Please enter the 12-digit UPI reference number (UTR) from your payment app");
  if (await (Payment.exists as any)({ utr })) throw new PaymentError("This UPI reference number has already been used", 409);

  const user = await (User.findById as any)(userId).lean();
  if (!user) throw new PaymentError("Member not found", 404);

  const settings = await getClubSettings(clubOf(user));
  const amount = feeFor(settings, user, months);
  const period = await buildPeriod(user, months, amount);
  const sub = await (Subscription.create as any)({
    ...period,
    paymentStatus: "Pending",
    status: "pending",
    paymentMethod: "UPI",
    notes: "Paid online by member, awaiting verification",
  });

  try {
    return await submitPaymentProof("subscription", String(sub._id), utr);
  } catch (err) {
    await (Subscription.findByIdAndDelete as any)(sub._id);
    throw err;
  }
}

export async function getMemberFeeSummary(userId: string) {
  await connectToMongoose();
  const user = await (User.findById as any)(userId)
    .select("name champId champType gender preferredTimeSlot mode subscribed preferredSport coachingProgram club")
    .lean();
  if (!user) return null;

  const club = await getPublicClub(clubOf(user));
  const settings = await getClubSettings(clubOf(user));
  const paidTill = await latestPaidTill(userId);
  const pending = await (Subscription.findOne as any)({ userId, status: "pending", paymentStatus: "Pending" }).select("_id amount").lean();
  const awaiting = pending ? await (Payment.exists as any)({ kind: "subscription", refId: pending._id, status: "submitted" }) : null;

  return {
    firstName: String(user.name || "").split(" ")[0],
    subscribed: String(user.subscribed || "").toLowerCase() === "yes",
    champId: user.champId,
    champType: user.champType || "adult",
    sport: user.preferredSport || "",
    program: programFor(settings, user).name,
    paidTill: paidTill ? paidTill.toISOString() : null,
    nextStart: nextPeriodStart(paidTill).toISOString(),
    awaitingVerification: Boolean(awaiting),
    options: [1, 3, 6, 12].map((m) => ({ months: m, amount: feeFor(settings, user, m) })),
    // fees go to the member's own club
    club: club ? { slug: club.slug, name: club.name, upi: club.upi, whatsappNumber: club.whatsappNumber } : null,
  };
}
