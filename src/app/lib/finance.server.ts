// Sathiyan Finance on the server: settings, borrowers, loans, the ledger and the reports.
// All maths comes from lib/finance.ts; this file only reads and writes the collections and
// keeps each loan's running totals in step with its ledger rows.
import mongoose from 'mongoose';
import { connectToMongoose } from '@/app/server/mongodb';
import Settings from '@/app/models/Settings';
import Borrower from '@/app/models/Borrower';
import Loan from '@/app/models/Loan';
import LoanEntry from '@/app/models/LoanEntry';
import { toISTDateString } from '@/app/lib/istDate';
import {
  DEFAULT_FINANCE_SETTINGS,
  EntryKind,
  FinanceSettings,
  FREQUENCIES,
  Frequency,
  LoanKind,
  LoanLike,
  LoanPosition,
  addPeriods,
  fillTemplate,
  installmentPlan,
  interestPartOf,
  isYMD,
  loanKindNoun,
  loanPosition,
  prettyDate,
  rupees,
  waLink,
  withFinanceDefaults,
} from '@/app/lib/finance';

const SETTINGS_KEY = 'finance';

export const todayIST = () => toISTDateString(new Date());
const monthOf = (ymd: string) => ymd.slice(0, 7);
const isId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// ---------- settings ----------

export async function getFinanceSettings(): Promise<FinanceSettings> {
  await connectToMongoose();
  const doc = await (Settings.findOne as any)({ key: SETTINGS_KEY }).lean();
  return withFinanceDefaults(doc?.data || DEFAULT_FINANCE_SETTINGS);
}

export async function saveFinanceSettings(value: FinanceSettings, updatedBy: string): Promise<FinanceSettings> {
  await connectToMongoose();
  await (Settings.findOneAndUpdate as any)({ key: SETTINGS_KEY }, { $set: { data: value, updatedBy } }, { upsert: true });
  return value;
}

// ---------- shapes sent to the pages ----------

export interface BorrowerOut {
  id: string;
  name: string;
  mobile: string;
  altMobile: string;
  address: string;
  idProof: string;
  notes: string;
  defaultRate: number | null;
  active: boolean;
  createdAt: string;
}

export interface LoanOut extends LoanLike {
  id: string;
  loanNo: string;
  borrowerId: string;
  borrowerName: string;
  borrowerMobile: string;
  notes: string;
  closedOn: string | null;
  closedNote: string;
  lastEntryOn: string | null;
  createdAt: string;
  position: LoanPosition;
  /** wa.me links with the reminder / overdue texts filled in */
  whatsapp?: { reminder: string; overdue: string };
}

export interface EntryOut {
  id: string;
  loanId: string;
  kind: EntryKind;
  amount: number;
  interestPart: number;
  date: string;
  method: 'cash' | 'upi';
  note: string;
  recordedByName: string;
  createdAt: string;
}

const borrowerOut = (b: any): BorrowerOut => ({
  id: String(b._id),
  name: b.name,
  mobile: b.mobile,
  altMobile: b.altMobile || '',
  address: b.address || '',
  idProof: b.idProof || '',
  notes: b.notes || '',
  defaultRate: Number.isFinite(b.defaultRate) ? b.defaultRate : null,
  active: b.active !== false,
  createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : '',
});

const loanLike = (l: any, principalReturns?: { date: string; amount: number }[]): LoanLike => ({
  principalReturns: principalReturns || l.principalReturns || [],
  kind: l.kind,
  frequency: l.frequency,
  principal: l.principal,
  interestPercent: l.interestPercent,
  installments: l.installments,
  installmentAmount: l.installmentAmount,
  totalRepayable: l.totalRepayable,
  givenOn: l.givenOn,
  firstDueOn: l.firstDueOn,
  status: l.status,
  collectedTotal: l.collectedTotal || 0,
  interestTotal: l.interestTotal || 0,
  principalReturned: l.principalReturned || 0,
  penaltyTotal: l.penaltyTotal || 0,
});

const loanOut = (l: any, settings: FinanceSettings, today: string, principalReturns?: { date: string; amount: number }[]): LoanOut => ({
  ...loanLike(l, principalReturns),
  id: String(l._id),
  loanNo: l.loanNo,
  borrowerId: String(l.borrowerId),
  borrowerName: l.borrowerName,
  borrowerMobile: l.borrowerMobile,
  notes: l.notes || '',
  closedOn: l.closedOn || null,
  closedNote: l.closedNote || '',
  lastEntryOn: l.lastEntryOn || null,
  createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
  position: loanPosition(loanLike(l, principalReturns), settings, today),
});

/** Principal returned per interest-only loan, so each period's interest is on what was outstanding then. */
async function principalReturnsFor(loans: any[]): Promise<Map<string, { date: string; amount: number }[]>> {
  const ids = loans.filter((l) => l.kind === 'interest' && (l.principalReturned || 0) > 0).map((l) => l._id);
  const map = new Map<string, { date: string; amount: number }[]>();
  if (!ids.length) return map;
  const rows = await (LoanEntry.find as any)({ loanId: { $in: ids }, kind: 'principal' }).select('loanId date amount').lean();
  for (const r of rows) {
    const key = String(r.loanId);
    map.set(key, [...(map.get(key) || []), { date: r.date, amount: r.amount }]);
  }
  return map;
}

const entryOut = (e: any): EntryOut => ({
  id: String(e._id),
  loanId: String(e.loanId),
  kind: e.kind,
  amount: e.amount,
  interestPart: e.interestPart || 0,
  date: e.date,
  method: e.method || 'cash',
  note: e.note || '',
  recordedByName: e.recordedByName || '',
  createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : '',
});

// ---------- borrowers ----------

const cleanMobile = (raw: unknown) => String(raw || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');

export function parseBorrower(body: any): [Record<string, any> | null, string | null] {
  const name = String(body?.name || '').trim();
  const mobile = cleanMobile(body?.mobile);
  if (name.length < 2) return [null, 'Name is required'];
  if (!/^\d{10}$/.test(mobile)) return [null, 'Mobile must be a 10-digit number'];
  const altMobile = String(body?.altMobile || '').trim();
  if (altMobile && !/^\d{10}$/.test(cleanMobile(altMobile))) return [null, 'Alternate mobile must be a 10-digit number'];
  const data: Record<string, any> = {
    name,
    mobile,
    altMobile: altMobile ? cleanMobile(altMobile) : '',
    address: String(body?.address || '').trim().slice(0, 300),
    idProof: String(body?.idProof || '').trim().slice(0, 120),
    notes: String(body?.notes || '').trim().slice(0, 500),
  };
  if (body?.defaultRate === '' || body?.defaultRate === null || body?.defaultRate === undefined) data.defaultRate = undefined;
  else {
    const r = Number(body.defaultRate);
    if (!Number.isFinite(r) || r < 0 || r > 100) return [null, 'Personal rate must be between 0 and 100%'];
    data.defaultRate = r;
  }
  if (body?.active !== undefined) data.active = Boolean(body.active);
  return [data, null];
}

export async function listBorrowers(q = ''): Promise<BorrowerOut[]> {
  await connectToMongoose();
  const query: Record<string, any> = {};
  const term = q.trim();
  if (term) {
    const digits = term.replace(/\D/g, '');
    query.$or = digits.length >= 3 && /^\d+$/.test(term.replace(/[\s+\-]/g, ''))
      ? [{ mobile: new RegExp('^' + digits.replace(/^(91|0)(?=\d{10}$)/, '')) }]
      : [{ name: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
  }
  const rows = await (Borrower.find as any)(query).sort({ name: 1 }).limit(300).lean();
  return rows.map(borrowerOut);
}

export async function createBorrower(body: any, userId: string): Promise<[BorrowerOut | null, string | null]> {
  const [data, error] = parseBorrower(body);
  if (error) return [null, error];
  await connectToMongoose();
  const doc = await (Borrower.create as any)({ ...data, createdBy: userId || undefined });
  return [borrowerOut(doc.toObject()), null];
}

export async function updateBorrower(id: string, body: any): Promise<[BorrowerOut | null, string | null]> {
  if (!isId(id)) return [null, 'Borrower not found'];
  const [data, error] = parseBorrower(body);
  if (error) return [null, error];
  await connectToMongoose();
  const $set: Record<string, any> = { ...data };
  const $unset: Record<string, any> = {};
  if (data!.defaultRate === undefined) {
    delete $set.defaultRate;
    $unset.defaultRate = '';
  }
  const doc = await (Borrower.findByIdAndUpdate as any)(id, { $set, ...(Object.keys($unset).length ? { $unset } : {}) }, { new: true }).lean();
  if (!doc) return [null, 'Borrower not found'];
  // Loans carry the name and number for the lists and WhatsApp links
  await (Loan.updateMany as any)({ borrowerId: id }, { $set: { borrowerName: doc.name, borrowerMobile: doc.mobile } });
  return [borrowerOut(doc), null];
}

export async function deleteBorrower(id: string): Promise<string | null> {
  if (!isId(id)) return 'Borrower not found';
  await connectToMongoose();
  const loans = await (Loan.countDocuments as any)({ borrowerId: id });
  if (loans > 0) return 'This person has loans on record. Close the loans instead of deleting the person.';
  const res = await (Borrower.findByIdAndDelete as any)(id);
  return res ? null : 'Borrower not found';
}

// ---------- loans ----------

async function nextLoanNo(): Promise<string> {
  const last = await (Loan.findOne as any)({}).sort({ createdAt: -1 }).select('loanNo').lean();
  const n = Number(String(last?.loanNo || 'SF-0000').replace(/\D/g, '')) || 0;
  return `SF-${String(n + 1).padStart(4, '0')}`;
}

export interface NewLoanInput {
  borrowerId: string;
  kind: LoanKind;
  frequency: Frequency;
  principal: number;
  interestPercent: number;
  installments?: number;
  installmentAmount?: number;
  givenOn: string;
  firstDueOn?: string;
  notes?: string;
}

/** Validate the terms and fill in the plan (instalment amount, total) from the settings. */
export function parseLoan(body: any, settings: FinanceSettings): [Record<string, any> | null, string | null] {
  const kind: LoanKind = body?.kind === 'interest' ? 'interest' : body?.kind === 'installment' ? 'installment' : (null as any);
  if (!kind) return [null, 'Choose the loan type'];
  const frequency = String(body?.frequency || '') as Frequency;
  if (!FREQUENCIES.includes(frequency)) return [null, 'Choose how often money is collected'];
  const principal = Math.round(Number(body?.principal));
  if (!Number.isFinite(principal) || principal < 1 || principal > 100_000_000) return [null, 'Enter the amount given'];
  const interestPercent = Number(body?.interestPercent);
  if (!Number.isFinite(interestPercent) || interestPercent < 0 || interestPercent > 100) return [null, 'Interest must be between 0 and 100%'];
  const givenOn = String(body?.givenOn || '');
  if (!isYMD(givenOn)) return [null, 'Pick the date the money was given'];
  const firstDueOn = body?.firstDueOn ? String(body.firstDueOn) : addPeriods(givenOn, frequency, 1);
  if (!isYMD(firstDueOn)) return [null, 'First due date must be a date'];
  if (firstDueOn < givenOn) return [null, 'First due date cannot be before the given date'];
  const data: Record<string, any> = {
    kind,
    frequency,
    principal,
    interestPercent,
    givenOn,
    firstDueOn,
    notes: String(body?.notes || '').trim().slice(0, 500),
  };
  if (kind === 'installment') {
    const installments = Math.round(Number(body?.installments ?? settings.tenures[frequency]));
    if (!Number.isFinite(installments) || installments < 1 || installments > 1000) return [null, 'Number of instalments must be 1 to 1000'];
    const plan = installmentPlan(principal, interestPercent, installments, settings.roundTo);
    let installmentAmount = plan.installmentAmount;
    if (body?.installmentAmount !== undefined && body?.installmentAmount !== '' && body?.installmentAmount !== null) {
      installmentAmount = Math.round(Number(body.installmentAmount));
      if (!Number.isFinite(installmentAmount) || installmentAmount < 1) return [null, 'Instalment amount must be a positive amount'];
    }
    data.installments = installments;
    data.installmentAmount = installmentAmount;
    data.totalRepayable = installmentAmount * installments;
    if (data.totalRepayable < principal) return [null, 'The instalments add up to less than the amount given'];
  }
  return [data, null];
}

export async function createLoan(body: any, user: { id: string; name: string }): Promise<[LoanOut | null, string | null]> {
  const settings = await getFinanceSettings();
  const [data, error] = parseLoan(body, settings);
  if (error) return [null, error];
  const borrowerId = String(body?.borrowerId || '');
  if (!isId(borrowerId)) return [null, 'Choose who the money is given to'];
  await connectToMongoose();
  const borrower = await (Borrower.findById as any)(borrowerId).lean();
  if (!borrower) return [null, 'Borrower not found'];
  let loan: any = null;
  for (let attempt = 0; attempt < 3 && !loan; attempt++) {
    try {
      loan = await (Loan.create as any)({
        ...data,
        loanNo: await nextLoanNo(),
        borrowerId: borrower._id,
        borrowerName: borrower.name,
        borrowerMobile: borrower.mobile,
        createdBy: user.id || undefined,
      });
    } catch (e: any) {
      if (e?.code !== 11000 || attempt === 2) throw e;
    }
  }
  await (LoanEntry.create as any)({
    loanId: loan._id,
    borrowerId: borrower._id,
    kind: 'given',
    amount: data!.principal,
    date: data!.givenOn,
    month: monthOf(data!.givenOn),
    method: body?.method === 'upi' ? 'upi' : 'cash',
    note: 'Loan given',
    recordedBy: user.id || undefined,
    recordedByName: user.name || '',
  });
  return [loanOut(loan.toObject(), settings, todayIST()), null];
}

export interface LoanFilter {
  status?: 'active' | 'closed' | 'overdue' | 'due_today' | 'all';
  q?: string;
  borrowerId?: string;
}

export async function listLoans(filter: LoanFilter = {}): Promise<LoanOut[]> {
  const settings = await getFinanceSettings();
  await connectToMongoose();
  const query: Record<string, any> = {};
  const status = filter.status || 'active';
  if (status === 'closed') query.status = 'closed';
  else if (status !== 'all') query.status = 'active';
  if (filter.borrowerId && isId(filter.borrowerId)) query.borrowerId = filter.borrowerId;
  const term = (filter.q || '').trim();
  if (term) {
    const digits = term.replace(/\D/g, '');
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [{ borrowerName: new RegExp(safe, 'i') }, { loanNo: new RegExp(safe, 'i') }];
    if (digits.length >= 3) query.$or.push({ borrowerMobile: new RegExp('^' + digits.replace(/^(91|0)(?=\d{10}$)/, '')) });
  }
  const today = todayIST();
  const rows = await (Loan.find as any)(query).sort({ givenOn: -1, createdAt: -1 }).limit(1000).lean();
  const returns = await principalReturnsFor(rows);
  let out: LoanOut[] = rows.map((l: any) => {
    const o = loanOut(l, settings, today, returns.get(String(l._id)));
    o.whatsapp = whatsappLinks(o, settings);
    return o;
  });
  if (status === 'overdue') out = out.filter((l) => l.position.state === 'overdue');
  if (status === 'due_today') out = out.filter((l) => l.position.state === 'due_today' || l.position.state === 'overdue');
  return out;
}

export interface LoanDetail {
  loan: LoanOut;
  entries: EntryOut[];
  borrower: BorrowerOut | null;
  whatsapp: { reminder: string; overdue: string };
  settings: Pick<FinanceSettings, 'businessName' | 'penalty' | 'roundTo'>;
}

/** Everything the loan page shows, including ready-made WhatsApp links. */
export async function getLoanDetail(id: string): Promise<LoanDetail | null> {
  if (!isId(id)) return null;
  const settings = await getFinanceSettings();
  await connectToMongoose();
  const [l, entries] = await Promise.all([
    (Loan.findById as any)(id).lean(),
    (LoanEntry.find as any)({ loanId: id }).sort({ date: -1, createdAt: -1 }).lean(),
  ]);
  if (!l) return null;
  const borrower = await (Borrower.findById as any)(l.borrowerId).lean();
  const loan = loanOut(l, settings, todayIST(), entries.filter((e: any) => e.kind === 'principal').map((e: any) => ({ date: e.date, amount: e.amount })));
  return {
    loan,
    entries: entries.map(entryOut),
    borrower: borrower ? borrowerOut(borrower) : null,
    whatsapp: whatsappLinks(loan, settings),
    settings: { businessName: settings.businessName, penalty: settings.penalty, roundTo: settings.roundTo },
  };
}

export function whatsappLinks(loan: LoanOut, settings: FinanceSettings) {
  const p = loan.position;
  const due = p.arrears > 0 ? p.arrears : p.nextDueAmount;
  const vars = {
    name: loan.borrowerName,
    business: settings.businessName,
    kind: loanKindNoun(loan),
    due: rupees(due),
    dueDate: p.nextDueOn ? prettyDate(p.nextDueOn) : '-',
    days: p.overdueDays,
    penaltyLine: p.penaltyDue > 0 ? ` (penalty ₹${rupees(p.penaltyDue)})` : '',
    balance: rupees(Math.max(0, p.outstanding - due)),
    amount: '',
    date: prettyDate(todayIST()),
    loan: loan.loanNo,
  };
  return {
    reminder: waLink(loan.borrowerMobile, fillTemplate(settings.whatsapp.reminder, vars)),
    overdue: waLink(loan.borrowerMobile, fillTemplate(settings.whatsapp.overdue, vars)),
  };
}

export function receiptLink(loan: LoanOut, entry: EntryOut, settings: FinanceSettings) {
  const vars = {
    name: loan.borrowerName,
    business: settings.businessName,
    kind: entry.kind === 'collection' ? 'instalment' : entry.kind === 'interest' ? 'interest' : entry.kind === 'principal' ? 'principal' : 'penalty',
    due: '',
    dueDate: loan.position.nextDueOn ? prettyDate(loan.position.nextDueOn) : '-',
    days: 0,
    penaltyLine: '',
    balance: rupees(loan.position.outstanding),
    amount: rupees(entry.amount),
    date: prettyDate(entry.date),
    loan: loan.loanNo,
  };
  return waLink(loan.borrowerMobile, fillTemplate(settings.whatsapp.receipt, vars));
}

/** Owner edits: notes, dates, rate, instalment plan, and closing / reopening. */
export async function updateLoan(id: string, body: any, userId: string): Promise<[LoanOut | null, string | null]> {
  if (!isId(id)) return [null, 'Loan not found'];
  const settings = await getFinanceSettings();
  await connectToMongoose();
  const l = await (Loan.findById as any)(id);
  if (!l) return [null, 'Loan not found'];
  if (body.notes !== undefined) l.notes = String(body.notes || '').trim().slice(0, 500);
  if (body.firstDueOn !== undefined) {
    if (!isYMD(String(body.firstDueOn))) return [null, 'First due date must be a date'];
    if (String(body.firstDueOn) < l.givenOn) return [null, 'First due date cannot be before the given date'];
    l.firstDueOn = String(body.firstDueOn);
  }
  if (body.interestPercent !== undefined) {
    const r = Number(body.interestPercent);
    if (!Number.isFinite(r) || r < 0 || r > 100) return [null, 'Interest must be between 0 and 100%'];
    l.interestPercent = r;
  }
  if (l.kind === 'installment' && (body.installments !== undefined || body.installmentAmount !== undefined || body.interestPercent !== undefined)) {
    const installments = Math.round(Number(body.installments ?? l.installments));
    if (!Number.isFinite(installments) || installments < 1 || installments > 1000) return [null, 'Number of instalments must be 1 to 1000'];
    let installmentAmount = Math.round(Number(body.installmentAmount ?? l.installmentAmount));
    if (body.installmentAmount === undefined && body.interestPercent !== undefined) {
      installmentAmount = installmentPlan(l.principal, l.interestPercent, installments, settings.roundTo).installmentAmount;
    }
    if (!Number.isFinite(installmentAmount) || installmentAmount < 1) return [null, 'Instalment amount must be a positive amount'];
    l.installments = installments;
    l.installmentAmount = installmentAmount;
    l.totalRepayable = installments * installmentAmount;
  }
  if (body.status === 'closed' && l.status !== 'closed') {
    l.status = 'closed';
    l.closedOn = todayIST();
    l.closedNote = String(body.closedNote || '').trim().slice(0, 200);
  } else if (body.status === 'active' && l.status === 'closed') {
    l.status = 'active';
    l.closedOn = undefined;
    l.closedNote = '';
  }
  l.updatedBy = userId || undefined;
  await l.save();
  const returns = await principalReturnsFor([l]);
  return [loanOut(l.toObject(), settings, todayIST(), returns.get(String(l._id))), null];
}

export async function deleteLoan(id: string): Promise<string | null> {
  if (!isId(id)) return 'Loan not found';
  await connectToMongoose();
  const res = await (Loan.findByIdAndDelete as any)(id);
  if (!res) return 'Loan not found';
  await (LoanEntry.deleteMany as any)({ loanId: id });
  return null;
}

// ---------- ledger ----------

const RECEIPT_KINDS: EntryKind[] = ['collection', 'interest', 'principal', 'penalty'];

/** Record money received on a loan. Staff and owner alike; the loan totals move with it. */
export async function addEntry(loanId: string, body: any, user: { id: string; name: string }): Promise<[{ entry: EntryOut; loan: LoanOut; receipt: string } | null, string | null]> {
  if (!isId(loanId)) return [null, 'Loan not found'];
  const settings = await getFinanceSettings();
  await connectToMongoose();
  const l = await (Loan.findById as any)(loanId);
  if (!l) return [null, 'Loan not found'];
  if (l.status === 'closed') return [null, 'This loan is closed. Reopen it first.'];
  const kind = String(body?.kind || '') as EntryKind;
  if (!RECEIPT_KINDS.includes(kind)) return [null, 'Choose what was received'];
  if (l.kind === 'installment' && (kind === 'interest' || kind === 'principal')) return [null, 'A thavanai loan takes instalments and penalties only'];
  if (l.kind === 'interest' && kind === 'collection') return [null, 'An interest loan takes interest, principal and penalties'];
  const amount = Math.round(Number(body?.amount));
  if (!Number.isFinite(amount) || amount < 1 || amount > 100_000_000) return [null, 'Enter the amount received'];
  const date = String(body?.date || todayIST());
  if (!isYMD(date)) return [null, 'Date must be a valid date'];
  if (date < l.givenOn) return [null, 'Cannot receive money before the loan was given'];
  if (date > todayIST()) return [null, 'Date cannot be in the future'];
  const returnsBefore = (await principalReturnsFor([l])).get(String(l._id)) || [];
  const before = loanPosition(loanLike(l, returnsBefore), settings, todayIST());
  if (kind === 'collection' && amount > before.outstanding) return [null, `Only ₹${rupees(before.outstanding)} is left on this loan`];
  if (kind === 'principal' && amount > before.principalOutstanding) return [null, `Only ₹${rupees(before.principalOutstanding)} principal is outstanding`];

  const entry = await (LoanEntry.create as any)({
    loanId: l._id,
    borrowerId: l.borrowerId,
    kind,
    amount,
    interestPart: kind === 'collection' ? interestPartOf(loanLike(l), amount) : kind === 'interest' || kind === 'penalty' ? amount : 0,
    date,
    month: monthOf(date),
    method: body?.method === 'upi' ? 'upi' : 'cash',
    note: String(body?.note || '').trim().slice(0, 200),
    recordedBy: user.id || undefined,
    recordedByName: user.name || '',
  });
  if (kind === 'collection') l.collectedTotal = (l.collectedTotal || 0) + amount;
  if (kind === 'interest') l.interestTotal = (l.interestTotal || 0) + amount;
  if (kind === 'principal') l.principalReturned = (l.principalReturned || 0) + amount;
  if (kind === 'penalty') l.penaltyTotal = (l.penaltyTotal || 0) + amount;
  l.lastEntryOn = !l.lastEntryOn || date > l.lastEntryOn ? date : l.lastEntryOn;
  // Fully repaid → closed automatically
  const returnsAfter = kind === 'principal' ? [...returnsBefore, { date, amount }] : returnsBefore;
  const after = loanPosition(loanLike(l, returnsAfter), settings, todayIST());
  if (after.state === 'closed' && l.status !== 'closed') {
    l.status = 'closed';
    l.closedOn = date;
    l.closedNote = 'Fully repaid';
  }
  await l.save();
  const loan = loanOut(l.toObject(), settings, todayIST(), returnsAfter);
  const e = entryOut(entry.toObject());
  return [{ entry: e, loan, receipt: receiptLink(loan, e, settings) }, null];
}

/** Owner only. Removes a ledger row and recomputes the loan's totals from what is left. */
export async function deleteEntry(entryId: string): Promise<string | null> {
  if (!isId(entryId)) return 'Entry not found';
  await connectToMongoose();
  const e = await (LoanEntry.findById as any)(entryId).lean();
  if (!e) return 'Entry not found';
  if (e.kind === 'given') return 'The "given" row belongs to the loan. Delete the loan instead.';
  await (LoanEntry.findByIdAndDelete as any)(entryId);
  await recomputeTotals(String(e.loanId));
  return null;
}

async function recomputeTotals(loanId: string) {
  const sums = await (LoanEntry.aggregate as any)([
    { $match: { loanId: new mongoose.Types.ObjectId(loanId) } },
    { $group: { _id: '$kind', total: { $sum: '$amount' }, last: { $max: '$date' } } },
  ]);
  const by: Record<string, number> = {};
  let last: string | undefined;
  for (const s of sums) {
    by[s._id] = s.total;
    if (s._id !== 'given' && (!last || s.last > last)) last = s.last;
  }
  await (Loan.findByIdAndUpdate as any)(loanId, {
    $set: {
      collectedTotal: by.collection || 0,
      interestTotal: by.interest || 0,
      principalReturned: by.principal || 0,
      penaltyTotal: by.penalty || 0,
      lastEntryOn: last,
    },
  });
}

// ---------- overview and reports ----------

export interface FinanceOverview {
  today: string;
  dueToday: LoanOut[];
  overdue: LoanOut[];
  counts: { active: number; dueToday: number; overdue: number };
  amounts: { dueToday: number; overdue: number; penaltyDue: number; collectedToday: number; givenToday: number };
  /** What a new loan starts from (rates per tenure, instalment counts, rounding) — not revenue, so staff get it too */
  defaults: Pick<FinanceSettings, 'businessName' | 'rates' | 'tenures' | 'roundTo'>;
  /** Owner only */
  money?: {
    outstanding: number;
    principalOut: number;
    month: MonthTotals & { month: string };
    allTime: { given: number; received: number; interest: number };
  };
}

export interface MonthTotals {
  given: number;
  collected: number; // instalments + interest + principal + penalties received
  interest: number; // interest share of everything received, including penalties
  principalBack: number;
  penalty: number;
  loansGiven: number;
}

const emptyTotals = (): MonthTotals => ({ given: 0, collected: 0, interest: 0, principalBack: 0, penalty: 0, loansGiven: 0 });

async function totalsByMonth(from: string, to: string): Promise<Map<string, MonthTotals>> {
  const rows = await (LoanEntry.aggregate as any)([
    { $match: { month: { $gte: from, $lte: to } } },
    { $group: { _id: { month: '$month', kind: '$kind' }, amount: { $sum: '$amount' }, interest: { $sum: '$interestPart' }, n: { $sum: 1 } } },
  ]);
  const map = new Map<string, MonthTotals>();
  for (const r of rows) {
    const m = map.get(r._id.month) || emptyTotals();
    const kind: EntryKind = r._id.kind;
    if (kind === 'given') {
      m.given += r.amount;
      m.loansGiven += r.n;
    } else {
      m.collected += r.amount;
      m.interest += r.interest;
      if (kind === 'principal') m.principalBack += r.amount;
      if (kind === 'collection') m.principalBack += r.amount - r.interest;
      if (kind === 'penalty') m.penalty += r.amount;
    }
    map.set(r._id.month, m);
  }
  return map;
}

export async function getFinanceOverview(includeMoney: boolean): Promise<FinanceOverview> {
  const settings = await getFinanceSettings();
  const loans = await listLoans({ status: 'active' });
  const today = todayIST();
  const dueToday = loans.filter((l) => l.position.state === 'due_today');
  const overdue = loans.filter((l) => l.position.state === 'overdue').sort((a, b) => b.position.overdueDays - a.position.overdueDays);
  await connectToMongoose();
  const todayRows = await (LoanEntry.aggregate as any)([
    { $match: { date: today } },
    { $group: { _id: '$kind', amount: { $sum: '$amount' } } },
  ]);
  const todayBy: Record<string, number> = Object.fromEntries(todayRows.map((r: any) => [r._id, r.amount]));
  const out: FinanceOverview = {
    today,
    dueToday,
    overdue,
    counts: { active: loans.length, dueToday: dueToday.length, overdue: overdue.length },
    amounts: {
      dueToday: dueToday.reduce((s, l) => s + l.position.nextDueAmount, 0),
      overdue: overdue.reduce((s, l) => s + l.position.arrears, 0),
      penaltyDue: overdue.reduce((s, l) => s + l.position.penaltyDue, 0),
      collectedToday: (todayBy.collection || 0) + (todayBy.interest || 0) + (todayBy.principal || 0) + (todayBy.penalty || 0),
      givenToday: todayBy.given || 0,
    },
    defaults: { businessName: settings.businessName, rates: settings.rates, tenures: settings.tenures, roundTo: settings.roundTo },
  };
  if (includeMoney) {
    const month = today.slice(0, 7);
    const [byMonth, allTime] = await Promise.all([
      totalsByMonth(month, month),
      (LoanEntry.aggregate as any)([{ $group: { _id: '$kind', amount: { $sum: '$amount' }, interest: { $sum: '$interestPart' } } }]),
    ]);
    const all: Record<string, { amount: number; interest: number }> = Object.fromEntries(allTime.map((r: any) => [r._id, r]));
    const received = ['collection', 'interest', 'principal', 'penalty'].reduce((s, k) => s + (all[k]?.amount || 0), 0);
    out.money = {
      outstanding: loans.reduce((s, l) => s + l.position.outstanding, 0),
      principalOut: loans.reduce((s, l) => s + l.position.principalOutstanding, 0),
      month: { month, ...(byMonth.get(month) || emptyTotals()) },
      allTime: {
        given: all.given?.amount || 0,
        received,
        interest: ['collection', 'interest', 'penalty'].reduce((s, k) => s + (all[k]?.interest || 0), 0),
      },
    };
  }
  return out;
}

export interface FinanceReport {
  year: number;
  months: (MonthTotals & { month: string })[];
  totals: MonthTotals;
  snapshot: { outstanding: number; principalOut: number; activeLoans: number; overdueLoans: number; overdueAmount: number };
}

/** Twelve months of money given and received, plus today's book. Owner only. */
export async function getFinanceReport(year: number): Promise<FinanceReport> {
  const [byMonth, loans] = await Promise.all([totalsByMonth(`${year}-01`, `${year}-12`), listLoans({ status: 'active' })]);
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`;
    return { month, ...(byMonth.get(month) || emptyTotals()) };
  });
  const totals = months.reduce((t, m) => {
    for (const k of Object.keys(t) as (keyof MonthTotals)[]) t[k] += m[k];
    return t;
  }, emptyTotals());
  const overdue = loans.filter((l) => l.position.state === 'overdue');
  return {
    year,
    months,
    totals,
    snapshot: {
      outstanding: loans.reduce((s, l) => s + l.position.outstanding, 0),
      principalOut: loans.reduce((s, l) => s + l.position.principalOutstanding, 0),
      activeLoans: loans.length,
      overdueLoans: overdue.length,
      overdueAmount: overdue.reduce((s, l) => s + l.position.arrears, 0),
    },
  };
}

/** The ledger rows of one month (owner's report drill-down). */
export async function getMonthEntries(month: string): Promise<(EntryOut & { loanNo: string; borrowerName: string })[]> {
  await connectToMongoose();
  const rows = await (LoanEntry.find as any)({ month }).sort({ date: -1, createdAt: -1 }).lean();
  const loanIds = Array.from(new Set(rows.map((r: any) => String(r.loanId))));
  const loans = await (Loan.find as any)({ _id: { $in: loanIds } }).select('loanNo borrowerName').lean();
  const byId = new Map<string, any>(loans.map((l: any) => [String(l._id), l]));
  return rows.map((r: any) => ({ ...entryOut(r), loanNo: byId.get(String(r.loanId))?.loanNo || '', borrowerName: byId.get(String(r.loanId))?.borrowerName || '' }));
}
