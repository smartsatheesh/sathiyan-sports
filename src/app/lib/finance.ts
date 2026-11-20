// Sathiyan Finance — the lending ledger (thavanai / vatti). Pure types and maths shared by the
// server and the pages: what a loan should have collected by today, what is overdue, the
// penalty the owner's rules add, and the WhatsApp texts. No database access here.
//
// Two kinds of loan:
//   installment  ("thavanai") — principal plus a flat interest % is split into N equal
//                instalments collected every day / week / month. ₹10,000 at 10% over 100 days
//                is 100 × ₹110.
//   interest     ("vatti")    — interest of X % of the outstanding principal is due every period
//                (usually monthly); the principal comes back whenever the borrower returns it.
// Dates are IST calendar days as "YYYY-MM-DD".

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type LoanKind = 'installment' | 'interest';
export type EntryKind = 'given' | 'collection' | 'interest' | 'principal' | 'penalty';
export type PenaltyMode = 'none' | 'flat_per_day' | 'percent_per_day' | 'flat_once' | 'percent_once';

export const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
export const FREQUENCY_LABELS: Record<Frequency, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
export const PERIOD_NOUN: Record<Frequency, string> = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
export const LOAN_KIND_LABELS: Record<LoanKind, string> = { installment: 'Thavanai (instalments)', interest: 'Interest only (vatti)' };
export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  given: 'Given',
  collection: 'Instalment',
  interest: 'Interest',
  principal: 'Principal back',
  penalty: 'Penalty',
};
export const PENALTY_MODE_LABELS: Record<PenaltyMode, string> = {
  none: 'No penalty',
  flat_per_day: '₹ per day late',
  percent_per_day: '% of overdue amount per day late',
  flat_once: '₹ once, when late',
  percent_once: '% of overdue amount, once',
};

export interface FinanceSettings {
  businessName: string;
  /** Default interest by tenure: flat % of principal for daily / weekly thavanai; % per period for monthly / yearly interest loans. */
  rates: Record<Frequency, number>;
  /** Default number of instalments for a thavanai loan of each frequency. */
  tenures: Record<Frequency, number>;
  /** Instalment amounts are rounded up to a multiple of this (1 = no rounding). */
  roundTo: number;
  penalty: {
    mode: PenaltyMode;
    value: number;
    /** Days after a due date before the penalty starts. */
    graceDays: number;
    /** Cap as % of the overdue amount (0 = no cap). */
    maxPercent: number;
  };
  whatsapp: {
    reminder: string;
    overdue: string;
    receipt: string;
  };
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  businessName: 'Sathiyan Finance',
  rates: { daily: 10, weekly: 10, monthly: 2, yearly: 18 },
  tenures: { daily: 100, weekly: 10, monthly: 10, yearly: 1 },
  roundTo: 10,
  penalty: { mode: 'none', value: 0, graceDays: 3, maxPercent: 0 },
  whatsapp: {
    reminder:
      'Hi {name}, your {business} {kind} of ₹{due} is due on {dueDate}. Balance after this payment: ₹{balance}. Thank you!',
    overdue:
      'Hi {name}, ₹{due} of your {business} {kind} is overdue by {days} days{penaltyLine}. Please pay today. Balance: ₹{balance}.',
    receipt:
      'Hi {name}, {business} received ₹{amount} ({kind}) on {date}. Balance: ₹{balance}. Thank you!',
  },
};

export const TEMPLATE_VARS = ['{name}', '{business}', '{kind}', '{due}', '{dueDate}', '{days}', '{penaltyLine}', '{balance}', '{amount}', '{date}', '{loan}'];

/** Fill in missing or invalid settings so older saved documents keep working. */
export function withFinanceDefaults(raw: Partial<FinanceSettings> | null | undefined): FinanceSettings {
  const d = DEFAULT_FINANCE_SETTINGS;
  const s = raw || {};
  const num = (v: unknown, fallback: number, min = 0) => (Number.isFinite(Number(v)) && Number(v) >= min ? Number(v) : fallback);
  const rec = (v: Partial<Record<Frequency, number>> | undefined, base: Record<Frequency, number>, min = 0) =>
    Object.fromEntries(FREQUENCIES.map((f) => [f, num(v?.[f], base[f], min)])) as Record<Frequency, number>;
  const mode = (s.penalty?.mode && s.penalty.mode in PENALTY_MODE_LABELS ? s.penalty.mode : d.penalty.mode) as PenaltyMode;
  return {
    businessName: String(s.businessName || d.businessName).trim() || d.businessName,
    rates: rec(s.rates, d.rates),
    tenures: rec(s.tenures, d.tenures, 1),
    roundTo: [1, 5, 10, 50, 100].includes(Number(s.roundTo)) ? Number(s.roundTo) : d.roundTo,
    penalty: {
      mode,
      value: num(s.penalty?.value, d.penalty.value),
      graceDays: Math.floor(num(s.penalty?.graceDays, d.penalty.graceDays)),
      maxPercent: num(s.penalty?.maxPercent, d.penalty.maxPercent),
    },
    whatsapp: {
      reminder: String(s.whatsapp?.reminder || d.whatsapp.reminder),
      overdue: String(s.whatsapp?.overdue || d.whatsapp.overdue),
      receipt: String(s.whatsapp?.receipt || d.whatsapp.receipt),
    },
  };
}

export function validateFinanceSettings(s: FinanceSettings): string[] {
  const errors: string[] = [];
  if (!s.businessName.trim()) errors.push('Business name is required');
  for (const f of FREQUENCIES) {
    if (!(s.rates[f] >= 0 && s.rates[f] <= 100)) errors.push(`${FREQUENCY_LABELS[f]} rate must be between 0 and 100%`);
    if (!(s.tenures[f] >= 1 && s.tenures[f] <= 1000) || !Number.isInteger(s.tenures[f])) errors.push(`${FREQUENCY_LABELS[f]} tenure must be a whole number of periods (1 to 1000)`);
  }
  if (s.penalty.mode !== 'none' && !(s.penalty.value > 0)) errors.push('Penalty needs an amount or percentage');
  if (s.penalty.mode.startsWith('percent') && s.penalty.value > 100) errors.push('Penalty percentage cannot exceed 100%');
  if (!(s.penalty.graceDays >= 0 && s.penalty.graceDays <= 365)) errors.push('Grace days must be 0 to 365');
  if (!(s.penalty.maxPercent >= 0 && s.penalty.maxPercent <= 1000)) errors.push('Penalty cap must be 0 to 1000%');
  for (const [k, v] of Object.entries(s.whatsapp)) if (!v.trim()) errors.push(`The ${k} WhatsApp message cannot be empty`);
  return errors;
}

// ---------- dates ("YYYY-MM-DD", calendar arithmetic independent of the server's timezone) ----------

export const isYMD = (s: string) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);

const DAY_MS = 86_400_000;
const toUTC = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));
const fromUTC = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export const daysBetween = (fromYMD: string, toYMD: string) => Math.round((toUTC(toYMD) - toUTC(fromYMD)) / DAY_MS);

/** The date `n` periods after `ymd`. Monthly / yearly keep the day of month, clamped to the month's length. */
export function addPeriods(ymd: string, frequency: Frequency, n: number): string {
  if (frequency === 'daily') return fromUTC(toUTC(ymd) + n * DAY_MS);
  if (frequency === 'weekly') return fromUTC(toUTC(ymd) + n * 7 * DAY_MS);
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7)) - 1;
  const day = Number(ymd.slice(8, 10));
  const months = frequency === 'monthly' ? n : n * 12;
  const target = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUTC(target.getTime());
}

/** How many due dates from `firstDue` (every `frequency`) fall on or before `today`, capped at `max`. */
export function dueCountUpTo(firstDue: string, frequency: Frequency, today: string, max: number): number {
  if (max <= 0 || today < firstDue) return 0;
  // Walk forward: tenures are at most a few hundred periods, so this is cheap and exact for calendar months
  let count = 0;
  while (count < max && addPeriods(firstDue, frequency, count) <= today) count++;
  return count;
}

// ---------- loans ----------

export interface LoanTerms {
  kind: LoanKind;
  frequency: Frequency;
  principal: number;
  /** installment: flat % of principal over the whole tenure; interest: % of principal per period */
  interestPercent: number;
  /** installment only */
  installments?: number;
  installmentAmount?: number;
  totalRepayable?: number;
}

export interface LoanLike extends LoanTerms {
  givenOn: string;
  firstDueOn: string;
  status: 'active' | 'closed';
  collectedTotal: number; // instalment collections (installment kind)
  interestTotal: number; // interest received (interest kind)
  principalReturned: number; // principal returned (interest kind)
  penaltyTotal: number; // penalties collected
  /** Interest kind: each principal return, so interest is worked out on what was outstanding in each period. */
  principalReturns?: { date: string; amount: number }[];
}

/** Round up to a multiple of `roundTo` (1 = exact rupees). */
export const roundUpTo = (amount: number, roundTo: number) => Math.ceil(amount / Math.max(1, roundTo)) * Math.max(1, roundTo);

/** Instalment amount and total for a thavanai loan: (principal + flat interest) / N, rounded up. */
export function installmentPlan(principal: number, interestPercent: number, installments: number, roundTo: number) {
  const interest = (principal * interestPercent) / 100;
  const installmentAmount = roundUpTo((principal + interest) / Math.max(1, installments), roundTo);
  return { interest, installmentAmount, totalRepayable: installmentAmount * installments };
}

/** Interest due every period on an interest-only loan. */
export const periodInterest = (principalOutstanding: number, interestPercent: number) => Math.round((principalOutstanding * interestPercent) / 100);

export type LoanState = 'closed' | 'overdue' | 'due_today' | 'upcoming' | 'paid_up';

export interface LoanPosition {
  state: LoanState;
  /** Money that should have been collected by today but was not (instalments or interest). */
  arrears: number;
  /** Days since the oldest unpaid due date (0 when nothing is late). */
  overdueDays: number;
  /** The next date money is due (null once a loan is fully paid). */
  nextDueOn: string | null;
  /** What the next due payment is: the instalment, or one period's interest. */
  nextDueAmount: number;
  /** Everything still to come back: remaining instalments, or principal + unpaid interest. */
  outstanding: number;
  principalOutstanding: number;
  paidCount: number; // instalments (or interest periods) fully paid
  totalCount: number | null; // instalments; null for interest-only
  /** Penalty the rules add for the current lateness, less penalties already collected. */
  penaltyDue: number;
  progress: number; // 0..1 for instalment loans
}

/** Where a loan stands on `today` under the owner's penalty rules. */
export function loanPosition(loan: LoanLike, settings: FinanceSettings, today: string): LoanPosition {
  const closed = loan.status === 'closed';
  if (loan.kind === 'installment') {
    const n = Math.max(1, loan.installments || 1);
    const amt = Math.max(1, loan.installmentAmount || 1);
    const total = loan.totalRepayable ?? amt * n;
    const paid = loan.collectedTotal;
    const outstanding = Math.max(0, total - paid);
    const dueCount = dueCountUpTo(loan.firstDueOn, loan.frequency, today, n);
    const arrears = Math.max(0, Math.min(total, dueCount * amt) - paid);
    const paidCount = Math.min(n, Math.floor(paid / amt + 1e-9));
    const nextDueOn = outstanding <= 0 ? null : addPeriods(loan.firstDueOn, loan.frequency, paidCount);
    const overdueDays = nextDueOn && nextDueOn < today && arrears > 0 ? daysBetween(nextDueOn, today) : 0;
    const penaltyDue = penaltyFor(arrears, overdueDays, settings) - loan.penaltyTotal;
    const interestShare = total > 0 ? (total - loan.principal) / total : 0;
    const principalOutstanding = Math.max(0, Math.round(outstanding * (1 - interestShare)));
    return {
      state: closed || outstanding <= 0 ? 'closed' : arrears > 0 && overdueDays > 0 ? 'overdue' : nextDueOn === today ? 'due_today' : 'upcoming',
      arrears,
      overdueDays,
      nextDueOn: closed ? null : nextDueOn,
      nextDueAmount: nextDueOn ? Math.min(amt, outstanding) : 0,
      outstanding: closed ? 0 : outstanding,
      principalOutstanding: closed ? 0 : principalOutstanding,
      paidCount,
      totalCount: n,
      penaltyDue: closed ? 0 : Math.max(0, penaltyDue),
      progress: total > 0 ? Math.min(1, paid / total) : 1,
    };
  }
  // interest-only: every period charges X % of the principal outstanding at the start of that period
  const principalOutstanding = Math.max(0, loan.principal - loan.principalReturned);
  const returns = (loan.principalReturns || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const principalAt = (periodStart: string) => Math.max(0, loan.principal - returns.filter((r) => r.date <= periodStart).reduce((t, r) => t + r.amount, 0));
  let interestDue = 0;
  let periodsElapsed = 0;
  let nextDueOn: string | null = null;
  let nextDueAmount = 0;
  let paidCount = 0;
  let cumulative = 0;
  for (let k = 0; k < 100_000; k++) {
    const due = addPeriods(loan.firstDueOn, loan.frequency, k);
    const start = k === 0 ? loan.givenOn : addPeriods(loan.firstDueOn, loan.frequency, k - 1);
    const charge = periodInterest(principalAt(start), loan.interestPercent);
    if (due > today) {
      // the first future period: what the next reminder asks for, unless something is still unpaid
      if (!nextDueOn) {
        nextDueOn = due;
        nextDueAmount = charge;
      }
      break;
    }
    periodsElapsed++;
    interestDue += charge;
    cumulative += charge;
    if (loan.interestTotal + 1e-9 >= cumulative) paidCount = k + 1;
    else if (!nextDueOn) {
      nextDueOn = due;
      nextDueAmount = Math.max(0, cumulative - loan.interestTotal);
    }
  }
  const arrears = Math.max(0, interestDue - loan.interestTotal);
  const settled = principalOutstanding <= 0 && arrears <= 0;
  if (settled) nextDueOn = null;
  const overdueDays = nextDueOn && nextDueOn < today && arrears > 0 ? daysBetween(nextDueOn, today) : 0;
  const penaltyDue = penaltyFor(arrears, overdueDays, settings) - loan.penaltyTotal;
  const outstanding = principalOutstanding + arrears;
  return {
    state: closed || settled ? 'closed' : arrears > 0 && overdueDays > 0 ? 'overdue' : nextDueOn === today ? 'due_today' : 'upcoming',
    arrears,
    overdueDays,
    nextDueOn: closed ? null : nextDueOn,
    nextDueAmount: nextDueOn ? nextDueAmount : 0,
    outstanding: closed ? 0 : outstanding,
    principalOutstanding: closed ? 0 : principalOutstanding,
    paidCount,
    totalCount: null,
    penaltyDue: closed ? 0 : Math.max(0, penaltyDue),
    progress: loan.principal > 0 ? Math.min(1, loan.principalReturned / loan.principal) : 1,
  };
}

/** The penalty the rules add for `arrears` that are `overdueDays` late. */
export function penaltyFor(arrears: number, overdueDays: number, settings: FinanceSettings): number {
  const p = settings.penalty;
  if (p.mode === 'none' || arrears <= 0) return 0;
  const lateDays = overdueDays - p.graceDays;
  if (lateDays <= 0) return 0;
  let penalty = 0;
  if (p.mode === 'flat_per_day') penalty = p.value * lateDays;
  else if (p.mode === 'percent_per_day') penalty = (arrears * p.value * lateDays) / 100;
  else if (p.mode === 'flat_once') penalty = p.value;
  else if (p.mode === 'percent_once') penalty = (arrears * p.value) / 100;
  if (p.maxPercent > 0) penalty = Math.min(penalty, (arrears * p.maxPercent) / 100);
  return Math.round(penalty);
}

/** The share of an instalment that is interest (so reports can show interest earned as money comes in). */
export function interestPartOf(loan: LoanTerms, amount: number): number {
  if (loan.kind !== 'installment') return 0;
  const total = loan.totalRepayable || 0;
  if (total <= loan.principal || total <= 0) return 0;
  return Math.round((amount * (total - loan.principal)) / total);
}

// ---------- WhatsApp ----------

export const rupees = (n: number) => `${Math.round(n).toLocaleString('en-IN')}`;

export const prettyDate = (ymd: string) => {
  if (!isYMD(ymd)) return ymd;
  const d = new Date(toUTC(ymd));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

/** Digits only, with India's country code, for a wa.me link. */
export function waMobile(mobile: string): string {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export const waLink = (mobile: string, text: string) => `https://wa.me/${waMobile(mobile)}?text=${encodeURIComponent(text)}`;

/** "daily instalment" / "monthly interest" — the {kind} in the WhatsApp texts. */
export const loanKindNoun = (loan: LoanTerms) =>
  `${FREQUENCY_LABELS[loan.frequency].toLowerCase()} ${loan.kind === 'installment' ? 'instalment' : 'interest'}`;
