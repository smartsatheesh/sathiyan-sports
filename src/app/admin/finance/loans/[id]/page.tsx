"use client";

// One loan: where it stands, its ledger, WhatsApp reminders and receipts. Staff receive money;
// the owner can also correct the terms, delete a wrong row, close or delete the loan.
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowBack, Delete, Edit, WhatsApp } from "@mui/icons-material";
import { canManageFinance, canUseFinance } from "@/app/lib/roles";
import { ENTRY_KIND_LABELS, FREQUENCY_LABELS, prettyDate } from "@/app/lib/finance";
import type { LoanDetail, LoanOut } from "@/app/lib/finance.server";
import { EntryDialog, StateChip, describeTerms, rupee } from "../../components";

export default function LoanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const owner = canManageFinance(role);
  const [detail, setDetail] = useState<LoanDetail | null>(null);
  const [error, setError] = useState("");
  const [receive, setReceive] = useState(false);
  const [edit, setEdit] = useState(false);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push(`/auth/login?callbackUrl=/admin/finance/loans/${id}`);
    else if (!canUseFinance(role)) router.push("/");
  }, [status, session, role, router, id]);

  const load = useCallback(() => {
    fetch(`/api/admin/finance/loans/${id}`)
      .then((r) => r.json())
      .then((d) => (d.success ? setDetail(d) : setError(d.error || "Loan not found")))
      .catch(() => setError("Could not load the loan"));
  }, [id]);
  useEffect(() => { if (status === "authenticated" && canUseFinance(role)) load(); }, [status, role, load]);

  const patch = async (body: any) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/finance/loans/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Could not save");
      load();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const deleteEntry = async (entryId: string) => {
    if (!confirm("Remove this row? The loan totals will be recalculated.")) return;
    const res = await fetch(`/api/admin/finance/entries/${entryId}`, { method: "DELETE" });
    const d = await res.json();
    if (!d.success) setError(d.error || "Could not remove");
    load();
  };
  const deleteLoan = async () => {
    if (!detail || !confirm(`Delete loan ${detail.loan.loanNo} and all its entries? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/finance/loans/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) router.push("/admin/finance");
    else setError(d.error || "Could not delete");
  };

  if (status !== "authenticated" || !canUseFinance(role) || (!detail && !error)) {
    return <Container sx={{ py: 6, display: "flex", justifyContent: "center" }}><CircularProgress /></Container>;
  }
  if (!detail) {
    return <Container maxWidth="sm" sx={{ py: 4 }}><Alert severity="error">{error}</Alert><Button component={Link} href="/admin/finance" sx={{ mt: 2 }}>Back to finance</Button></Container>;
  }

  const { loan, entries, borrower, whatsapp } = detail;
  const p = loan.position;
  const closed = loan.status === "closed";

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <IconButton component={Link} href="/admin/finance" aria-label="Back"><ArrowBack /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={800} noWrap>{loan.borrowerName}</Typography>
            <StateChip position={p} />
          </Stack>
          <Typography variant="body2" color="text.secondary">{loan.loanNo} · {loan.borrowerMobile}{borrower?.address ? ` · ${borrower.address}` : ""}</Typography>
        </Box>
        {owner && <IconButton onClick={() => setEdit(true)} aria-label="Edit loan"><Edit /></IconButton>}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ p: 1.5, height: "100%" }}>
            <Typography variant="caption" color="text.secondary">Still to come</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.4rem" }}>{rupee(p.outstanding)}</Typography>
            {loan.kind === "interest" && <Typography variant="caption" color="text.secondary">principal {rupee(p.principalOutstanding)}</Typography>}
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ p: 1.5, height: "100%" }}>
            <Typography variant="caption" color="text.secondary">{p.arrears > 0 ? "Overdue" : "Next due"}</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: p.arrears > 0 ? "error.main" : "text.primary" }}>{rupee(p.arrears > 0 ? p.arrears : p.nextDueAmount)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {closed ? "Closed" : p.arrears > 0 ? `${p.overdueDays} days late${p.penaltyDue ? ` · penalty ${rupee(p.penaltyDue)}` : ""}` : p.nextDueOn ? prettyDate(p.nextDueOn) : "-"}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ p: 1.5, height: "100%" }}>
            <Typography variant="caption" color="text.secondary">Received so far</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: "success.main" }}>{rupee(loan.collectedTotal + loan.interestTotal + loan.principalReturned + loan.penaltyTotal)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {loan.kind === "installment" ? `${p.paidCount} of ${p.totalCount} instalments` : `interest ${rupee(loan.interestTotal)} · principal ${rupee(loan.principalReturned)}`}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined" sx={{ p: 1.5, height: "100%" }}>
            <Typography variant="caption" color="text.secondary">Given</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.4rem" }}>{rupee(loan.principal)}</Typography>
            <Typography variant="caption" color="text.secondary">{prettyDate(loan.givenOn)}</Typography>
          </Card>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          <b>{loan.kind === "installment" ? "Thavanai" : "Interest only"}</b> · {describeTerms(loan)} · first due {prettyDate(loan.firstDueOn)}
          {loan.kind === "installment" && <> · total back {rupee(loan.totalRepayable || 0)}</>}
        </Typography>
        <LinearProgress variant="determinate" value={Math.round(p.progress * 100)} sx={{ height: 8, borderRadius: 4 }} color={closed ? "inherit" : p.state === "overdue" ? "error" : "success"} />
        {loan.notes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{loan.notes}</Typography>}
        {closed && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Closed {loan.closedOn ? prettyDate(loan.closedOn) : ""}{loan.closedNote ? ` · ${loan.closedNote}` : ""}</Typography>}
      </Paper>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {!closed && <Button variant="contained" onClick={() => setReceive(true)}>Receive money</Button>}
        {!closed && (
          <Button variant="outlined" color="success" startIcon={<WhatsApp />} href={p.state === "overdue" ? whatsapp.overdue : whatsapp.reminder} target="_blank" rel="noopener noreferrer">
            {p.state === "overdue" ? "Overdue notice" : "Reminder"}
          </Button>
        )}
        {owner && !closed && <Button variant="text" onClick={() => setClosing(true)}>Close loan</Button>}
        {owner && closed && <Button variant="text" onClick={() => patch({ status: "active" })} disabled={busy}>Reopen</Button>}
        {owner && <Button variant="text" color="error" startIcon={<Delete />} onClick={deleteLoan}>Delete</Button>}
      </Stack>

      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>What</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>By</TableCell>
              <TableCell>Note</TableCell>
              {owner && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{prettyDate(e.date)}</TableCell>
                <TableCell><Chip size="small" label={ENTRY_KIND_LABELS[e.kind]} color={e.kind === "given" ? "default" : e.kind === "penalty" ? "warning" : "success"} variant="outlined" /></TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: e.kind === "given" ? "error.main" : "success.main", whiteSpace: "nowrap" }}>{e.kind === "given" ? "−" : "+"}{rupee(e.amount)}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{e.method === "upi" ? "UPI" : "Cash"}{e.recordedByName ? ` · ${e.recordedByName.split(" ")[0]}` : ""}</TableCell>
                <TableCell>{e.note}</TableCell>
                {owner && (
                  <TableCell align="right">
                    {e.kind !== "given" && <IconButton size="small" onClick={() => deleteEntry(e.id)} aria-label="Remove row"><Delete fontSize="small" /></IconButton>}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <EntryDialog loan={receive ? loan : null} open={receive} onClose={() => setReceive(false)} onSaved={() => load()} />
      {owner && <EditLoanDialog open={edit} loan={loan} onClose={() => setEdit(false)} onSave={async (b) => { if (await patch(b)) setEdit(false); }} busy={busy} />}
      <CloseDialog open={closing} onClose={() => setClosing(false)} onSave={async (note) => { if (await patch({ status: "closed", closedNote: note })) setClosing(false); }} busy={busy} outstanding={p.outstanding} />
    </Container>
  );
}

function EditLoanDialog({ open, loan, onClose, onSave, busy }: { open: boolean; loan: LoanOut; onClose: () => void; onSave: (b: any) => void; busy: boolean }) {
  const [f, setF] = useState({ notes: loan.notes, firstDueOn: loan.firstDueOn, interestPercent: loan.interestPercent, installments: loan.installments || 0, installmentAmount: loan.installmentAmount || 0 });
  useEffect(() => { if (open) setF({ notes: loan.notes, firstDueOn: loan.firstDueOn, interestPercent: loan.interestPercent, installments: loan.installments || 0, installmentAmount: loan.installmentAmount || 0 }); }, [open, loan]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit {loan.loanNo}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <TextField label="First due" type="date" value={f.firstDueOn} onChange={(e) => setF({ ...f, firstDueOn: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label={loan.kind === "installment" ? "Interest (flat)" : `Interest per ${FREQUENCY_LABELS[loan.frequency].toLowerCase().replace("ly", "")}`} type="number" value={f.interestPercent} onChange={(e) => setF({ ...f, interestPercent: Number(e.target.value) })} InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} inputProps={{ min: 0, max: 100, step: 0.5 }} fullWidth />
          {loan.kind === "installment" && (
            <Stack direction="row" spacing={1}>
              <TextField label="Instalments" type="number" value={f.installments} onChange={(e) => setF({ ...f, installments: Number(e.target.value) })} inputProps={{ min: 1 }} fullWidth />
              <TextField label="Each" type="number" value={f.installmentAmount} onChange={(e) => setF({ ...f, installmentAmount: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} inputProps={{ min: 1 }} fullWidth />
            </Stack>
          )}
          <TextField label="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} multiline minRows={2} fullWidth />
          <Typography variant="caption" color="text.secondary">Money already received stays as recorded; the schedule is reworked from these terms.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(loan.kind === "installment" ? f : { notes: f.notes, firstDueOn: f.firstDueOn, interestPercent: f.interestPercent })} disabled={busy}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function CloseDialog({ open, onClose, onSave, busy, outstanding }: { open: boolean; onClose: () => void; onSave: (note: string) => void; busy: boolean; outstanding: number }) {
  const [note, setNote] = useState("");
  useEffect(() => { if (open) setNote(""); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Close this loan</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {outstanding > 0 && <Alert severity="warning">{rupee(outstanding)} is still to come. Closing writes it off from the book (the rows stay).</Alert>}
          <TextField label="Why" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Settled in full, waived, written off…" fullWidth autoFocus />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="warning" onClick={() => onSave(note)} disabled={busy}>Close loan</Button>
      </DialogActions>
    </Dialog>
  );
}
