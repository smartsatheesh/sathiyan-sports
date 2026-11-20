"use client";

// Sathiyan Finance — the lending book. Staff see today's collections, the loans and the people
// and key in money given and received. The owner also gets the money tiles, the yearly report
// and the settings link. Role rules: lib/roles.ts (canUseFinance / canManageFinance).
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Assessment, Edit, Settings, WhatsApp } from "@mui/icons-material";
import { canManageFinance, canUseFinance } from "@/app/lib/roles";
import type { BorrowerOut, FinanceOverview, FinanceReport, LoanOut } from "@/app/lib/finance.server";
import { BorrowerDialog, EntryDialog, LoanLine, NewLoanDialog, rupee } from "./components";

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "error" | "warning" | "success" }) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.25, sm: 1.75 }, height: "100%" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.25rem", sm: "1.6rem" }, lineHeight: 1.3, color: tone ? `${tone}.main` : "text.primary" }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Card>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function FinancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const owner = canManageFinance(role);

  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [error, setError] = useState("");
  const [loans, setLoans] = useState<LoanOut[] | null>(null);
  const [loanFilter, setLoanFilter] = useState<{ status: string; q: string }>({ status: "active", q: "" });
  const [people, setPeople] = useState<BorrowerOut[] | null>(null);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  const [newLoan, setNewLoan] = useState<{ open: boolean; borrower?: BorrowerOut | null }>({ open: false });
  const [entryFor, setEntryFor] = useState<LoanOut | null>(null);
  const [personDialog, setPersonDialog] = useState<{ open: boolean; initial?: BorrowerOut | null }>({ open: false });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/auth/login?callbackUrl=/admin/finance");
    else if (!canUseFinance(role)) router.push("/");
  }, [status, session, role, router]);

  const loadOverview = useCallback(() => {
    fetch("/api/admin/finance/overview")
      .then((r) => r.json())
      .then((d) => (d.success ? setOverview(d) : setError(d.error || "Could not load")))
      .catch(() => setError("Could not load the finance book"));
  }, []);
  const loadLoans = useCallback(() => {
    const p = new URLSearchParams({ status: loanFilter.status, q: loanFilter.q });
    fetch(`/api/admin/finance/loans?${p}`)
      .then((r) => r.json())
      .then((d) => d.success && setLoans(d.loans))
      .catch(() => {});
  }, [loanFilter]);
  const loadPeople = useCallback(() => {
    fetch(`/api/admin/finance/borrowers?q=${encodeURIComponent(peopleQuery)}`)
      .then((r) => r.json())
      .then((d) => d.success && setPeople(d.borrowers))
      .catch(() => {});
  }, [peopleQuery]);
  const loadReport = useCallback(() => {
    fetch(`/api/admin/finance/report?year=${year}`)
      .then((r) => r.json())
      .then((d) => d.success && setReport(d))
      .catch(() => {});
  }, [year]);

  useEffect(() => { if (status === "authenticated" && canUseFinance(role)) loadOverview(); }, [status, role, loadOverview]);
  useEffect(() => { if (tab === 1 && status === "authenticated") { const t = setTimeout(loadLoans, 200); return () => clearTimeout(t); } }, [tab, status, loadLoans]);
  useEffect(() => { if (tab === 2 && status === "authenticated") { const t = setTimeout(loadPeople, 200); return () => clearTimeout(t); } }, [tab, status, loadPeople]);
  useEffect(() => { if (tab === 3 && owner && status === "authenticated") loadReport(); }, [tab, owner, status, loadReport]);

  const refreshAll = () => { loadOverview(); if (tab === 1) loadLoans(); if (tab === 3 && owner) loadReport(); };

  if (status !== "authenticated" || !canUseFinance(role)) {
    return <Container sx={{ py: 6, display: "flex", justifyContent: "center" }}><CircularProgress /></Container>;
  }

  const o = overview;
  const m = o?.money;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>{o?.defaults.businessName || "Sathiyan Finance"}</Typography>
          <Typography variant="body2" color="text.secondary">{owner ? "Loans, collections, interest and the book" : "Record money given and received"}</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {owner && <IconButton component={Link} href="/admin/finance/settings" aria-label="Finance settings"><Settings /></IconButton>}
          <Button variant="contained" startIcon={<Add />} onClick={() => setNewLoan({ open: true })} disabled={!o}>Give loan</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {!o ? (
          [0, 1, 2, 3].map((i) => <Grid item xs={6} sm={3} key={i}><Skeleton variant="rounded" height={84} /></Grid>)
        ) : owner && m ? (
          <>
            <Grid item xs={6} sm={3}><Tile label="Out on loan" value={rupee(m.outstanding)} sub={`${o.counts.active} active · ${rupee(m.principalOut)} principal`} /></Grid>
            <Grid item xs={6} sm={3}><Tile label="Overdue" value={rupee(o.amounts.overdue)} sub={`${o.counts.overdue} loans${o.amounts.penaltyDue ? ` · penalty ${rupee(o.amounts.penaltyDue)}` : ""}`} tone={o.counts.overdue ? "error" : undefined} /></Grid>
            <Grid item xs={6} sm={3}><Tile label="Collected this month" value={rupee(m.month.collected)} sub={`given ${rupee(m.month.given)}`} tone="success" /></Grid>
            <Grid item xs={6} sm={3}><Tile label="Interest this month" value={rupee(m.month.interest)} sub={`all time ${rupee(m.allTime.interest)}`} tone="success" /></Grid>
          </>
        ) : (
          <>
            <Grid item xs={6} sm={4}><Tile label="Due today" value={rupee(o.amounts.dueToday)} sub={`${o.counts.dueToday} loans`} tone={o.counts.dueToday ? "warning" : undefined} /></Grid>
            <Grid item xs={6} sm={4}><Tile label="Overdue" value={rupee(o.amounts.overdue)} sub={`${o.counts.overdue} loans`} tone={o.counts.overdue ? "error" : undefined} /></Grid>
            <Grid item xs={12} sm={4}><Tile label="Collected today" value={rupee(o.amounts.collectedToday)} sub={o.amounts.givenToday ? `given ${rupee(o.amounts.givenToday)}` : undefined} tone="success" /></Grid>
          </>
        )}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Collect" />
        <Tab label="Loans" />
        <Tab label="People" />
        {owner && <Tab label="Report" icon={<Assessment fontSize="small" />} iconPosition="start" />}
      </Tabs>

      {tab === 0 && o && (
        <Stack spacing={2}>
          <Paper variant="outlined">
            <Typography sx={{ px: 1.5, pt: 1.25, fontWeight: 700 }}>Overdue {o.overdue.length ? `(${o.overdue.length})` : ""}</Typography>
            {o.overdue.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 1.5 }}>Nobody is behind. 🎉</Typography>
            ) : (
              o.overdue.map((l) => <LoanLine key={l.id} loan={l} whatsapp={l.whatsapp?.overdue} onCollect={() => setEntryFor(l)} onOpen={() => router.push(`/admin/finance/loans/${l.id}`)} />)
            )}
          </Paper>
          <Paper variant="outlined">
            <Typography sx={{ px: 1.5, pt: 1.25, fontWeight: 700 }}>Due today {o.dueToday.length ? `(${o.dueToday.length})` : ""}</Typography>
            {o.dueToday.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 1.5 }}>Nothing due today.</Typography>
            ) : (
              o.dueToday.map((l) => <LoanLine key={l.id} loan={l} whatsapp={l.whatsapp?.reminder} onCollect={() => setEntryFor(l)} onOpen={() => router.push(`/admin/finance/loans/${l.id}`)} />)
            )}
          </Paper>
          <Typography variant="caption" color="text.secondary">
            Tap <WhatsApp sx={{ fontSize: 14, verticalAlign: "middle" }} /> to open WhatsApp with the reminder already typed. Receive records the money and offers a receipt.
          </Typography>
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1}>
            <TextField size="small" fullWidth placeholder="Name, mobile or loan no" value={loanFilter.q} onChange={(e) => setLoanFilter((f) => ({ ...f, q: e.target.value }))} />
            <TextField size="small" select value={loanFilter.status} onChange={(e) => setLoanFilter((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 130 }}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </TextField>
          </Stack>
          <Paper variant="outlined">
            {!loans ? (
              <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress size={24} /></Box>
            ) : loans.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No loans here yet.</Typography>
            ) : (
              loans.map((l) => <LoanLine key={l.id} loan={l} whatsapp={l.position.state === "overdue" ? l.whatsapp?.overdue : l.whatsapp?.reminder} onCollect={() => setEntryFor(l)} onOpen={() => router.push(`/admin/finance/loans/${l.id}`)} />)
            )}
          </Paper>
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1}>
            <TextField size="small" fullWidth placeholder="Name or mobile" value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} />
            <Button variant="outlined" startIcon={<Add />} onClick={() => setPersonDialog({ open: true, initial: null })} sx={{ whiteSpace: "nowrap" }}>Person</Button>
          </Stack>
          <Paper variant="outlined">
            {!people ? (
              <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress size={24} /></Box>
            ) : people.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Nobody yet. Add the first person.</Typography>
            ) : (
              people.map((b) => (
                <Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, px: 1.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{b.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {b.mobile}{b.defaultRate != null ? ` · ${b.defaultRate}% personal rate` : ""}{b.address ? ` · ${b.address}` : ""}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setPersonDialog({ open: true, initial: b })} aria-label="Edit person"><Edit fontSize="small" /></IconButton>
                  <Button size="small" variant="outlined" onClick={() => setNewLoan({ open: true, borrower: b })}>Give loan</Button>
                </Box>
              ))
            )}
          </Paper>
        </Stack>
      )}

      {tab === 3 && owner && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField size="small" select value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 110 }}>
              {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i).map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
            {report && (
              <Typography variant="body2" color="text.secondary">
                Today: {rupee(report.snapshot.outstanding)} out on {report.snapshot.activeLoans} loans · {report.snapshot.overdueLoans} overdue ({rupee(report.snapshot.overdueAmount)})
              </Typography>
            )}
          </Stack>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            {!report ? (
              <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress size={24} /></Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Given</TableCell>
                    <TableCell align="right">Collected</TableCell>
                    <TableCell align="right">Principal back</TableCell>
                    <TableCell align="right">Interest</TableCell>
                    <TableCell align="right">Penalty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.months.map((r, i) => (
                    <TableRow key={r.month} hover sx={{ opacity: r.given || r.collected ? 1 : 0.5 }}>
                      <TableCell>{MONTHS[i]}{r.loansGiven ? <Typography variant="caption" color="text.secondary"> · {r.loansGiven} loan{r.loansGiven > 1 ? "s" : ""}</Typography> : null}</TableCell>
                      <TableCell align="right">{r.given ? rupee(r.given) : "–"}</TableCell>
                      <TableCell align="right">{r.collected ? rupee(r.collected) : "–"}</TableCell>
                      <TableCell align="right">{r.principalBack ? rupee(r.principalBack) : "–"}</TableCell>
                      <TableCell align="right" sx={{ color: "success.main", fontWeight: 600 }}>{r.interest ? rupee(r.interest) : "–"}</TableCell>
                      <TableCell align="right">{r.penalty ? rupee(r.penalty) : "–"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ "& td": { fontWeight: 800, borderTop: "2px solid", borderColor: "divider" } }}>
                    <TableCell>{report.year}</TableCell>
                    <TableCell align="right">{rupee(report.totals.given)}</TableCell>
                    <TableCell align="right">{rupee(report.totals.collected)}</TableCell>
                    <TableCell align="right">{rupee(report.totals.principalBack)}</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>{rupee(report.totals.interest)}</TableCell>
                    <TableCell align="right">{rupee(report.totals.penalty)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </Paper>
          <Typography variant="caption" color="text.secondary">
            Interest counts the interest share of each instalment as it comes in, plus interest payments and penalties. Collected includes principal coming back.
          </Typography>
        </Stack>
      )}

      {o && (
        <NewLoanDialog
          open={newLoan.open}
          borrower={newLoan.borrower}
          defaults={o.defaults}
          onClose={() => setNewLoan({ open: false })}
          onCreated={(l) => { refreshAll(); router.push(`/admin/finance/loans/${l.id}`); }}
        />
      )}
      <EntryDialog loan={entryFor} open={Boolean(entryFor)} onClose={() => setEntryFor(null)} onSaved={() => refreshAll()} />
      <BorrowerDialog open={personDialog.open} initial={personDialog.initial} onClose={() => setPersonDialog({ open: false })} onSaved={() => loadPeople()} />
    </Container>
  );
}
