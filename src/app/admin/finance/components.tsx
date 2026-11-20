"use client";

// Pieces shared by the Sathiyan Finance screens: money formatting, state chips, and the three
// dialogs (new borrower, new loan, money received).
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { WhatsApp } from "@mui/icons-material";
import {
  ENTRY_KIND_LABELS,
  EntryKind,
  FREQUENCIES,
  FREQUENCY_LABELS,
  FinanceSettings,
  Frequency,
  LoanKind,
  LoanPosition,
  LoanState,
  addPeriods,
  installmentPlan,
  periodInterest,
  prettyDate,
} from "@/app/lib/finance";
import type { BorrowerOut, LoanOut } from "@/app/lib/finance.server";

export const rupee = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
export const todayYMD = () => {
  const d = new Date(Date.now() + 330 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

export const STATE_LABEL: Record<LoanState, string> = {
  closed: "Closed",
  overdue: "Overdue",
  due_today: "Due today",
  upcoming: "On track",
  paid_up: "Paid up",
};

export function StateChip({ position }: { position: LoanPosition }) {
  const s = position.state;
  const color = s === "overdue" ? "error" : s === "due_today" ? "warning" : s === "closed" ? "default" : "success";
  const label = s === "overdue" ? `${position.overdueDays}d overdue` : STATE_LABEL[s];
  return <Chip size="small" color={color} label={label} variant={s === "closed" ? "outlined" : "filled"} />;
}

export const describeTerms = (l: LoanOut) =>
  l.kind === "installment"
    ? `${l.installments} × ${rupee(l.installmentAmount || 0)} ${FREQUENCY_LABELS[l.frequency].toLowerCase()} · ${l.interestPercent}% flat`
    : `${l.interestPercent}% ${FREQUENCY_LABELS[l.frequency].toLowerCase()} interest`;

async function post(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong");
  return data;
}

// ---------- borrower ----------

export function BorrowerDialog({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial?: BorrowerOut | null; onSaved: (b: BorrowerOut) => void }) {
  const blank = { name: "", mobile: "", altMobile: "", address: "", idProof: "", notes: "", defaultRate: "" as string | number, active: true };
  const [form, setForm] = useState<any>(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial, defaultRate: initial.defaultRate ?? "" } : blank);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const data = initial
        ? await post(`/api/admin/finance/borrowers/${initial.id}`, "PATCH", form)
        : await post("/api/admin/finance/borrowers", "POST", form);
      onSaved(data.borrower);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{initial ? "Edit person" : "New person"}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={form.name} onChange={set("name")} autoFocus fullWidth />
          <TextField label="Mobile" value={form.mobile} onChange={set("mobile")} inputProps={{ inputMode: "tel", maxLength: 13 }} fullWidth helperText="WhatsApp reminders go to this number" />
          <TextField label="Alternate mobile" value={form.altMobile} onChange={set("altMobile")} inputProps={{ inputMode: "tel", maxLength: 13 }} fullWidth />
          <TextField label="Address" value={form.address} onChange={set("address")} fullWidth multiline minRows={2} />
          <TextField label="ID proof" value={form.idProof} onChange={set("idProof")} fullWidth placeholder="Aadhaar last 4, voter ID…" />
          <TextField
            label="Personal interest rate"
            value={form.defaultRate}
            onChange={set("defaultRate")}
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.5, inputMode: "decimal" }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            helperText="Leave empty to use the default rate for the tenure"
            fullWidth
          />
          <TextField label="Notes" value={form.notes} onChange={set("notes")} fullWidth multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- new loan ----------

type Defaults = Pick<FinanceSettings, "rates" | "tenures" | "roundTo">;

export function NewLoanDialog({ open, onClose, defaults, borrower: fixedBorrower, onCreated }: { open: boolean; onClose: () => void; defaults: Defaults; borrower?: BorrowerOut | null; onCreated: (loan: LoanOut) => void }) {
  const [borrowers, setBorrowers] = useState<BorrowerOut[]>([]);
  const [borrower, setBorrower] = useState<BorrowerOut | null>(null);
  const [query, setQuery] = useState("");
  const [newPerson, setNewPerson] = useState(false);
  const [kind, setKind] = useState<LoanKind>("installment");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [principal, setPrincipal] = useState<number>(NaN);
  const [rate, setRate] = useState<number>(defaults.rates.daily);
  const [rateTouched, setRateTouched] = useState(false);
  const [installments, setInstallments] = useState<number>(defaults.tenures.daily);
  const [amountOverride, setAmountOverride] = useState<string>("");
  const [givenOn, setGivenOn] = useState(todayYMD());
  const [firstDueOn, setFirstDueOn] = useState("");
  const [method, setMethod] = useState<"cash" | "upi">("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBorrower(fixedBorrower || null);
    setQuery("");
    setKind("installment");
    setFrequency("daily");
    setPrincipal(NaN);
    setRateTouched(false);
    setRate(fixedBorrower?.defaultRate ?? defaults.rates.daily);
    setInstallments(defaults.tenures.daily);
    setAmountOverride("");
    setGivenOn(todayYMD());
    setFirstDueOn("");
    setMethod("cash");
    setNotes("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // People list for the picker
  useEffect(() => {
    if (!open || fixedBorrower) return;
    const t = setTimeout(() => {
      fetch(`/api/admin/finance/borrowers?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => d.success && setBorrowers(d.borrowers))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [open, query, fixedBorrower]);

  // The rate follows the tenure (or the person's own rate) until the user types one
  useEffect(() => {
    if (!rateTouched) setRate(borrower?.defaultRate ?? defaults.rates[frequency]);
    setInstallments(defaults.tenures[frequency]);
    setAmountOverride("");
  }, [frequency, borrower, defaults, rateTouched]);

  const plan = useMemo(() => {
    if (!(principal > 0)) return null;
    if (kind === "installment") return installmentPlan(principal, rate, Math.max(1, installments || 1), defaults.roundTo);
    return { interest: periodInterest(principal, rate), installmentAmount: 0, totalRepayable: 0 };
  }, [principal, rate, installments, kind, defaults.roundTo]);
  const amount = amountOverride !== "" ? Number(amountOverride) : plan?.installmentAmount || 0;
  const total = kind === "installment" ? amount * Math.max(1, installments || 1) : 0;
  const firstDue = firstDueOn || (givenOn ? addPeriods(givenOn, frequency, 1) : "");

  const save = async () => {
    setError("");
    if (!borrower) return setError("Choose who the money is given to");
    setSaving(true);
    try {
      const data = await post("/api/admin/finance/loans", "POST", {
        borrowerId: borrower.id,
        kind,
        frequency,
        principal,
        interestPercent: rate,
        installments: kind === "installment" ? installments : undefined,
        installmentAmount: kind === "installment" && amountOverride !== "" ? Number(amountOverride) : undefined,
        givenOn,
        firstDueOn: firstDue,
        method,
        notes,
      });
      onCreated(data.loan);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Give a loan</DialogTitle>
        <DialogContent>
          <Stack spacing={1.75} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {fixedBorrower ? (
              <Typography fontWeight={700}>{fixedBorrower.name} · {fixedBorrower.mobile}</Typography>
            ) : (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={borrowers}
                  value={borrower}
                  onChange={(_, v) => setBorrower(v)}
                  inputValue={query}
                  onInputChange={(_, v, reason) => reason !== "reset" && setQuery(v)}
                  getOptionLabel={(o) => `${o.name} · ${o.mobile}`}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  filterOptions={(o) => o}
                  renderInput={(p) => <TextField {...p} label="Given to" placeholder="Name or mobile" autoFocus />}
                  noOptionsText={query.length < 2 ? "Type a name or number" : "Nobody found — add them"}
                />
                <Button variant="outlined" onClick={() => setNewPerson(true)} sx={{ whiteSpace: "nowrap", mt: 0.5 }}>+ New</Button>
              </Stack>
            )}
            <ToggleButtonGroup exclusive fullWidth size="small" value={kind} onChange={(_, v) => v && setKind(v)}>
              <ToggleButton value="installment">Thavanai (instalments)</ToggleButton>
              <ToggleButton value="interest">Interest only</ToggleButton>
            </ToggleButtonGroup>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <TextField
                  label="Amount given"
                  type="number"
                  fullWidth
                  value={Number.isFinite(principal) ? principal : ""}
                  onChange={(e) => setPrincipal(e.target.value === "" ? NaN : Number(e.target.value))}
                  inputProps={{ min: 1, inputMode: "numeric" }}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField select label={kind === "installment" ? "Collected" : "Interest every"} fullWidth value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                  {FREQUENCIES.map((f) => (
                    <MenuItem key={f} value={f}>{kind === "installment" ? FREQUENCY_LABELS[f] : f === "daily" ? "Day" : f === "weekly" ? "Week" : f === "monthly" ? "Month" : "Year"}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={kind === "installment" ? "Interest (flat, whole tenure)" : `Interest per ${frequency === "daily" ? "day" : frequency === "weekly" ? "week" : frequency === "monthly" ? "month" : "year"}`}
                  type="number"
                  fullWidth
                  value={Number.isFinite(rate) ? rate : ""}
                  onChange={(e) => { setRateTouched(true); setRate(e.target.value === "" ? NaN : Number(e.target.value)); }}
                  inputProps={{ min: 0, max: 100, step: 0.5, inputMode: "decimal" }}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  helperText={borrower?.defaultRate != null && !rateTouched ? `${borrower.name.split(" ")[0]}'s personal rate` : undefined}
                />
              </Grid>
              {kind === "installment" ? (
                <>
                  <Grid item xs={6}>
                    <TextField label="Instalments" type="number" fullWidth value={installments || ""} onChange={(e) => { setInstallments(Number(e.target.value)); setAmountOverride(""); }} inputProps={{ min: 1, max: 1000, inputMode: "numeric" }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Each instalment"
                      type="number"
                      fullWidth
                      value={amountOverride !== "" ? amountOverride : plan ? plan.installmentAmount : ""}
                      onChange={(e) => setAmountOverride(e.target.value)}
                      inputProps={{ min: 1, inputMode: "numeric" }}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                      helperText={plan ? `Total back ${rupee(total)} · interest ${rupee(total - principal)}` : "Worked out from the amount and rate"}
                    />
                  </Grid>
                </>
              ) : (
                <Grid item xs={6}>
                  <TextField label="Interest each period" fullWidth value={plan ? rupee(plan.interest) : ""} InputProps={{ readOnly: true }} helperText="Principal comes back whenever it is returned" />
                </Grid>
              )}
              <Grid item xs={6}>
                <TextField label="Given on" type="date" fullWidth value={givenOn} onChange={(e) => { setGivenOn(e.target.value); setFirstDueOn(""); }} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="First due" type="date" fullWidth value={firstDue} onChange={(e) => setFirstDueOn(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Given by" fullWidth value={method} onChange={(e) => setMethod(e.target.value as any)}>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI / bank</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Notes" fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Purpose, guarantor, surety…" />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !(principal > 0)}>{saving ? "Saving…" : `Give ${Number.isFinite(principal) && principal > 0 ? rupee(principal) : ""}`}</Button>
        </DialogActions>
      </Dialog>
      <BorrowerDialog open={newPerson} onClose={() => setNewPerson(false)} onSaved={(b) => { setBorrowers((list) => [b, ...list]); setBorrower(b); }} />
    </>
  );
}

// ---------- money received ----------

export function EntryDialog({ loan, open, onClose, onSaved }: { loan: LoanOut | null; open: boolean; onClose: () => void; onSaved: (loan: LoanOut) => void }) {
  const kinds: EntryKind[] = loan?.kind === "installment" ? ["collection", "penalty"] : ["interest", "principal", "penalty"];
  const [kind, setKind] = useState<EntryKind>("collection");
  const [amount, setAmount] = useState<number>(NaN);
  const [date, setDate] = useState(todayYMD());
  const [method, setMethod] = useState<"cash" | "upi">("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<{ link: string; amount: number } | null>(null);

  useEffect(() => {
    if (!open || !loan) return;
    const p = loan.position;
    const first = kinds[0];
    setKind(first);
    setAmount(p.arrears > 0 ? p.arrears : p.nextDueAmount || NaN);
    setDate(todayYMD());
    setMethod("cash");
    setNote("");
    setError("");
    setReceipt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.id]);

  useEffect(() => {
    if (!loan) return;
    const p = loan.position;
    if (kind === "penalty") setAmount(p.penaltyDue || NaN);
    else if (kind === "principal") setAmount(p.principalOutstanding || NaN);
    else setAmount(p.arrears > 0 ? p.arrears : p.nextDueAmount || NaN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const save = async () => {
    if (!loan) return;
    setSaving(true);
    setError("");
    try {
      const data = await post(`/api/admin/finance/loans/${loan.id}/entries`, "POST", { kind, amount, date, method, note });
      onSaved(data.loan);
      setReceipt({ link: data.receipt, amount });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loan) return null;
  const p = loan.position;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{receipt ? "Received" : `Receive from ${loan.borrowerName}`}</DialogTitle>
      <DialogContent>
        {receipt ? (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="success">{rupee(receipt.amount)} recorded on {loan.loanNo}.</Alert>
            <Button href={receipt.link} target="_blank" rel="noopener noreferrer" variant="contained" color="success" startIcon={<WhatsApp />}>
              Send receipt on WhatsApp
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="body2" color="text.secondary">
              {loan.loanNo} · {describeTerms(loan)}
              {p.arrears > 0 && <> · <b>{rupee(p.arrears)} overdue</b></>}
              {p.penaltyDue > 0 && <> · penalty {rupee(p.penaltyDue)}</>}
            </Typography>
            <ToggleButtonGroup exclusive fullWidth size="small" value={kind} onChange={(_, v) => v && setKind(v)}>
              {kinds.map((k) => (
                <ToggleButton key={k} value={k}>{ENTRY_KIND_LABELS[k]}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            <TextField
              label="Amount received"
              type="number"
              fullWidth
              autoFocus
              value={Number.isFinite(amount) ? amount : ""}
              onChange={(e) => setAmount(e.target.value === "" ? NaN : Number(e.target.value))}
              inputProps={{ min: 1, inputMode: "numeric" }}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              helperText={kind === "collection" ? `${rupee(p.outstanding)} left · ${p.paidCount}/${p.totalCount} paid` : kind === "principal" ? `${rupee(p.principalOutstanding)} principal outstanding` : undefined}
            />
            <Stack direction="row" spacing={1}>
              <TextField label="On" type="date" fullWidth value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ max: todayYMD() }} />
              <TextField select label="By" fullWidth value={method} onChange={(e) => setMethod(e.target.value as any)}>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="upi">UPI / bank</MenuItem>
              </TextField>
            </Stack>
            <TextField label="Note" fullWidth value={note} onChange={(e) => setNote(e.target.value)} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {receipt ? (
          <Button variant="contained" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={saving || !(amount > 0)}>{saving ? "Saving…" : "Save"}</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

/** One line per loan for the lists. */
export function LoanLine({ loan, onCollect, onOpen, whatsapp }: { loan: LoanOut; onCollect?: () => void; onOpen: () => void; whatsapp?: string }) {
  const p = loan.position;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.25, px: 1.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
      <Box sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onOpen}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography fontWeight={700} noWrap>{loan.borrowerName}</Typography>
          <StateChip position={p} />
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" noWrap>
          {loan.loanNo} · {describeTerms(loan)}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {p.state === "closed"
            ? `Closed${loan.closedOn ? ` ${prettyDate(loan.closedOn)}` : ""}`
            : p.arrears > 0
              ? `${rupee(p.arrears)} overdue${p.penaltyDue > 0 ? ` + ${rupee(p.penaltyDue)} penalty` : ""} · ${rupee(p.outstanding)} to come`
              : `Next ${rupee(p.nextDueAmount)} on ${p.nextDueOn ? prettyDate(p.nextDueOn) : "-"} · ${rupee(p.outstanding)} to come`}
        </Typography>
      </Box>
      {whatsapp && p.state !== "closed" && (
        <Button size="small" color="success" href={whatsapp} target="_blank" rel="noopener noreferrer" sx={{ minWidth: 0, px: 1 }} aria-label="WhatsApp reminder">
          <WhatsApp fontSize="small" />
        </Button>
      )}
      {onCollect && p.state !== "closed" && (
        <Button size="small" variant="contained" onClick={onCollect} sx={{ whiteSpace: "nowrap" }}>Receive</Button>
      )}
    </Box>
  );
}
