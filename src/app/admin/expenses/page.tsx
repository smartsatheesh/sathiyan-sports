"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Add, ChevronLeft, ChevronRight, DeleteOutline, Download, Search } from "@mui/icons-material";
import { useSiteSettings } from "@/app/hooks/useSiteSettings";

type EntryType = "expense" | "income";

interface Entry {
  _id: string;
  type?: EntryType; // missing on older records = expense
  amount: number;
  description: string;
  paidBy: string;
  category: string;
  paymentMethod: "cash" | "gpay";
  transactionId?: string;
  date: string;
}

interface Breakdown {
  name: string;
  total: number;
}

interface Summary {
  total: number;
  previousTotal: number;
  previousIncome: number;
  byCategory: Breakdown[];
  byPerson: Breakdown[];
  byMethod: Breakdown[];
  income: { fees: number; bookings: number; tournaments: number; other: number; byCategory: Breakdown[]; total: number };
  net: number;
  reserve: { tracked: boolean; opening: number | null; closing: number | null; openingBalance: number; openingMonth: string };
}

interface YearRow {
  month: string;
  fees: number;
  bookings: number;
  tournaments: number;
  otherIncome: number;
  spent: number;
  income: number;
  net: number;
  reserve: number | null; // null before the opening month in Settings
}

interface YearReport {
  year: number;
  opening: number;
  openingMonth: string;
  months: YearRow[];
  totals: { fees: number; bookings: number; tournaments: number; otherIncome: number; spent: number; income: number; net: number };
}

const rupees = (n: number) => `${n < 0 ? "−" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (month: string, short = false) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: short ? "short" : "long", year: short ? undefined : "numeric" });
};
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const isIncome = (e: Entry) => e.type === "income";
const vsLast = (now: number, before: number) =>
  before ? `${now - before >= 0 ? "▲" : "▼"} ${rupees(Math.abs(now - before))} vs last month` : undefined;

function StatTile({ label, value, sub, valueColor }: { label: string; value: string; sub?: React.ReactNode; valueColor?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, height: "100%" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", sm: "1.6rem" }, color: valueColor || "text.primary", lineHeight: 1.3, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary" component="div">{sub}</Typography>}
    </Paper>
  );
}

// Ranked horizontal bars, one hue (magnitude). Label and value are always visible as text.
function BreakdownBars({ title, rows, total, color = "primary.main" }: { title: string; rows: Breakdown[]; total: number; color?: string }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>{title}</Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Nothing yet</Typography>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((r) => (
            <Tooltip key={r.name} title={`${r.name}: ${rupees(r.total)} (${Math.round((r.total / (total || 1)) * 100)}%)`} placement="top">
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ pr: 1 }}>{r.name}</Typography>
                  <Typography variant="body2" fontWeight={600}>{rupees(r.total)}</Typography>
                </Stack>
                <Box sx={{ height: 10, bgcolor: "action.hover", borderRadius: "0 4px 4px 0" }}>
                  <Box sx={{ height: "100%", width: `${Math.max((r.total / max) * 100, 2)}%`, bgcolor: color, borderRadius: "0 4px 4px 0" }} />
                </Box>
              </Box>
            </Tooltip>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export default function MoneyPage() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { settings } = useSiteSettings();

  const [view, setView] = useState<"month" | "year">("month");
  const [month, setMonth] = useState(thisMonth());
  const [year, setYear] = useState(Number(thisMonth().slice(0, 4)));

  // Allow deep links like /admin/expenses?month=2025-11
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("month");
    if (m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m)) setMonth(m);
  }, []);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [yearReport, setYearReport] = useState<YearReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(view === "year" ? `/api/admin/expenses?year=${year}` : `/api/admin/expenses?month=${month}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (view === "year") {
        setYearReport(data);
      } else {
        setEntries([...data.expenses, ...data.incomeEntries].sort((a: Entry, b: Entry) => b.date.localeCompare(a.date)));
        setSummary(data.summary);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [month, year, view]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.description, e.category, e.paidBy].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [entries, query]);

  const byDay = useMemo(() => {
    const groups: { day: string; items: Entry[]; net: number }[] = [];
    for (const e of filtered) {
      const day = new Date(e.date).toDateString();
      let g = groups.find((x) => x.day === day);
      if (!g) {
        g = { day, items: [], net: 0 };
        groups.push(g);
      }
      g.items.push(e);
      g.net += isIncome(e) ? e.amount : -e.amount;
    }
    return groups;
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Date", "Type", "Description", "Category", "Paid by / received by", "Method", "Amount"];
    const auto = summary
      ? [
          ["", "Money in", "Member fees (collected this month)", "Member fees", "", "", String(summary.income.fees)],
          ["", "Money in", "Court bookings (played this month)", "Court bookings", "", "", String(summary.income.bookings)],
          ["", "Money in", "Tournament entry fees", "Tournaments", "", "", String(summary.income.tournaments)],
        ]
      : [];
    const rows = entries.map((e) => [
      new Date(e.date).toLocaleDateString("en-IN"),
      isIncome(e) ? "Money in" : "Expense",
      e.description,
      e.category,
      e.paidBy,
      e.paymentMethod === "gpay" ? "UPI" : "Cash",
      String(e.amount),
    ]);
    const csv = [header, ...auto, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `money-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const incomeRows: Breakdown[] = summary
    ? [
        { name: "Member fees", total: summary.income.fees },
        { name: "Court bookings", total: summary.income.bookings },
        { name: "Tournament entries", total: summary.income.tournaments },
        ...summary.income.byCategory,
      ].filter((r) => r.total > 0).sort((a, b) => b.total - a.total)
    : [];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, pb: 12 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>Money</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="year">Year</ToggleButton>
          </ToggleButtonGroup>
          {view === "month" && (
            <Button size="small" startIcon={<Download />} onClick={exportCsv} disabled={entries.length === 0 && !summary?.income.total}>CSV</Button>
          )}
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, py: 0.5, mb: 2 }}>
        {view === "month" ? (
          <>
            <IconButton onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month"><ChevronLeft /></IconButton>
            <Typography fontWeight={700}>{monthLabel(month)}</Typography>
            <IconButton onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={month >= thisMonth()} aria-label="Next month"><ChevronRight /></IconButton>
          </>
        ) : (
          <>
            <IconButton onClick={() => setYear((y) => y - 1)} aria-label="Previous year"><ChevronLeft /></IconButton>
            <Typography fontWeight={700}>{year}</Typography>
            <IconButton onClick={() => setYear((y) => y + 1)} disabled={year >= Number(thisMonth().slice(0, 4))} aria-label="Next year"><ChevronRight /></IconButton>
          </>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading || (view === "month" ? !summary : !yearReport) ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : view === "year" && yearReport ? (
        <YearTable
          report={yearReport}
          onPick={(m) => {
            setMonth(m);
            setView("month");
          }}
        />
      ) : summary ? (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <StatTile label="Money in" value={rupees(summary.income.total)} valueColor="success.main" sub={vsLast(summary.income.total, summary.previousIncome)} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatTile label="Spent" value={rupees(summary.total)} sub={vsLast(summary.total, summary.previousTotal)} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatTile
                label={summary.net >= 0 ? "Saved this month" : "Short this month"}
                value={rupees(Math.abs(summary.net))}
                valueColor={summary.net >= 0 ? "success.main" : "error.main"}
                sub="money in − spent"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              {summary.reserve.tracked ? (
                <StatTile
                  label="Reserve cash"
                  value={rupees(summary.reserve.closing || 0)}
                  valueColor={(summary.reserve.closing || 0) >= 0 ? "text.primary" : "error.main"}
                  sub={`at month end · started at ${rupees(summary.reserve.opening || 0)}`}
                />
              ) : (
                <StatTile label="Reserve cash" value="–" sub={`tracked from ${monthLabel(summary.reserve.openingMonth, true)} ${summary.reserve.openingMonth.slice(0, 4)} (Settings)`} />
              )}
            </Grid>
          </Grid>

          {(summary.income.total > 0 || summary.total > 0) && (
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Stack spacing={1.5} sx={{ height: "100%" }}>
                <BreakdownBars title="Money in" rows={incomeRows} total={summary.income.total} color="success.main" />
                <BreakdownBars title="Spent by category" rows={summary.byCategory} total={summary.total} />
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack spacing={1.5} sx={{ height: "100%" }}>
                <BreakdownBars title="Paid by" rows={summary.byPerson} total={summary.total} />
                <BreakdownBars title="Cash vs UPI (spent)" rows={summary.byMethod} total={summary.total} />
              </Stack>
            </Grid>
          </Grid>
          )}

          <TextField
            fullWidth
            size="small"
            placeholder="Search this month"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            sx={{ mb: 2 }}
          />

          {byDay.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              No entries {query ? "match your search" : "this month"}. Fees, bookings and tournament entries are counted automatically.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {byDay.map((g) => (
                <Paper key={g.day} variant="outlined">
                  <Stack direction="row" justifyContent="space-between" sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>
                    <Typography variant="body2" fontWeight={700}>{dayLabel(g.items[0].date)}</Typography>
                    <Typography variant="body2" color={g.net >= 0 ? "success.main" : "text.secondary"}>{g.net > 0 ? "+" : ""}{rupees(g.net)}</Typography>
                  </Stack>
                  {g.items.map((e, i) => (
                    <React.Fragment key={e._id}>
                      {i > 0 && <Divider />}
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        onClick={() => setEditing(e)}
                        sx={{ px: 2, py: 1.25, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap>{e.description}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap component="div">
                            {isIncome(e) && <Chip label="Money in" size="small" color="success" variant="outlined" sx={{ mr: 0.75, height: 18, fontSize: 11 }} />}
                            {e.category} · {e.paidBy} · {e.paymentMethod === "gpay" ? "UPI" : "Cash"}
                          </Typography>
                        </Box>
                        <Typography fontWeight={700} color={isIncome(e) ? "success.main" : "text.primary"} sx={{ whiteSpace: "nowrap" }}>
                          {isIncome(e) ? "+" : "−"}{rupees(e.amount)}
                        </Typography>
                      </Stack>
                    </React.Fragment>
                  ))}
                </Paper>
              ))}
            </Stack>
          )}
        </>
      ) : null}

      <Fab
        color="primary"
        variant="extended"
        onClick={() => setEditing({})}
        sx={{ position: "fixed", right: 16, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <Add sx={{ mr: 1 }} /> Add
      </Fab>

      {editing && (
        <EntryDialog
          entry={editing}
          people={settings.expenses.people}
          categories={settings.expenses.categories}
          incomeCategories={settings.expenses.incomeCategories}
          fullScreen={fullScreen}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </Container>
  );
}

function YearTable({ report, onPick }: { report: YearReport; onPick: (month: string) => void }) {
  const current = thisMonth();
  const cell = { px: { xs: 1, sm: 2 }, whiteSpace: "nowrap" as const };
  const num = { ...cell, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" };
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}><StatTile label={`Money in ${report.year}`} value={rupees(report.totals.income)} valueColor="success.main" sub={`Fees ${rupees(report.totals.fees)} · Courts ${rupees(report.totals.bookings)}`} /></Grid>
        <Grid item xs={6} sm={3}><StatTile label={`Spent ${report.year}`} value={rupees(report.totals.spent)} /></Grid>
        <Grid item xs={6} sm={3}><StatTile label={report.totals.net >= 0 ? "Saved" : "Short"} value={rupees(Math.abs(report.totals.net))} valueColor={report.totals.net >= 0 ? "success.main" : "error.main"} /></Grid>
        <Grid item xs={6} sm={3}>
          {report.months[11].reserve === null ? (
            <StatTile label="Reserve cash" value="–" sub={`tracked from ${monthLabel(report.openingMonth, true)} ${report.openingMonth.slice(0, 4)}`} />
          ) : (
            <StatTile label="Reserve cash at year end" value={rupees(report.months[11].reserve)} sub={report.openingMonth && report.openingMonth.slice(0, 4) === String(report.year) ? `opening balance ${rupees(report.opening)} from ${monthLabel(report.openingMonth, true)}` : `started the year at ${rupees(report.opening)}`} />
          )}
        </Grid>
      </Grid>
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={cell}>Month</TableCell>
              <TableCell sx={num}>In</TableCell>
              <TableCell sx={num}>Out</TableCell>
              <TableCell sx={num}>Net</TableCell>
              <TableCell sx={num}>Reserve</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.months.map((r) => {
              const future = r.month > current;
              return (
                <TableRow
                  key={r.month}
                  hover={!future}
                  onClick={future ? undefined : () => onPick(r.month)}
                  sx={{ cursor: future ? "default" : "pointer", opacity: future ? 0.45 : 1, bgcolor: r.month === current ? "action.hover" : undefined }}
                >
                  <TableCell sx={cell}>{monthLabel(r.month, true)}</TableCell>
                  <TableCell sx={{ ...num, color: r.income ? "success.main" : "text.secondary" }}>{r.income ? rupees(r.income) : "–"}</TableCell>
                  <TableCell sx={{ ...num, color: r.spent ? "text.primary" : "text.secondary" }}>{r.spent ? rupees(r.spent) : "–"}</TableCell>
                  <TableCell sx={{ ...num, fontWeight: 600, color: r.net > 0 ? "success.main" : r.net < 0 ? "error.main" : "text.secondary" }}>{r.income || r.spent ? rupees(r.net) : "–"}</TableCell>
                  <TableCell sx={{ ...num, color: (r.reserve ?? 0) < 0 ? "error.main" : "text.primary" }}>{future || r.reserve === null ? "" : rupees(r.reserve)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow sx={{ "& td": { fontWeight: 800, borderTop: 2, borderColor: "divider" } }}>
              <TableCell sx={cell}>Total</TableCell>
              <TableCell sx={{ ...num, color: "success.main" }}>{rupees(report.totals.income)}</TableCell>
              <TableCell sx={num}>{rupees(report.totals.spent)}</TableCell>
              <TableCell sx={{ ...num, color: report.totals.net >= 0 ? "success.main" : "error.main" }}>{rupees(report.totals.net)}</TableCell>
              <TableCell sx={num} />
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
        In = member fees + court bookings + tournament entries + money-in entries. Reserve = opening balance from Settings plus every month&apos;s net. Tap a month to see its entries.
      </Typography>
    </>
  );
}

function EntryDialog({
  entry,
  people,
  categories,
  incomeCategories,
  fullScreen,
  onClose,
  onSaved,
}: {
  entry: Partial<Entry>;
  people: string[];
  categories: string[];
  incomeCategories: string[];
  fullScreen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !entry._id;
  const [type, setType] = useState<EntryType>(entry.type === "income" ? "income" : "expense");
  const [amount, setAmount] = useState(entry.amount ? String(entry.amount) : "");
  const [description, setDescription] = useState(entry.description || "");
  const [category, setCategory] = useState(entry.category || "");
  const [paidBy, setPaidBy] = useState(entry.paidBy || people[0] || "");
  const [method, setMethod] = useState<"cash" | "gpay">(entry.paymentMethod || "cash");
  const [date, setDate] = useState((entry.date ? new Date(entry.date) : new Date()).toLocaleDateString("en-CA"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const income = type === "income";
  const list = income ? incomeCategories : categories;
  const chosen = category || list[0] || "";

  const switchType = (t: EntryType) => {
    if (t === type) return;
    setType(t);
    setCategory("");
  };

  // Keep values from older entries selectable even if removed from Settings
  const categoryOptions = chosen && !list.includes(chosen) ? [...list, chosen] : list;
  const peopleOptions = paidBy && !people.includes(paidBy) ? [...people, paidBy] : people;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(isNew ? "/api/admin/expenses" : `/api/admin/expenses/${entry._id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: Number(amount), description, category: chosen, paidBy, paymentMethod: method, date }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSaved();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this entry?")) return;
    setSaving(true);
    const res = await fetch(`/api/admin/expenses/${entry._id}`, { method: "DELETE" });
    const data = await res.json();
    setSaving(false);
    if (data.success) onSaved();
    else setError(data.error || "Failed to delete");
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle>{isNew ? (income ? "Add money in" : "Add expense") : income ? "Edit money in" : "Edit expense"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <ToggleButtonGroup fullWidth exclusive color={income ? "success" : "primary"} value={type} onChange={(_, v) => v && switchType(v)}>
            <ToggleButton value="expense">Expense</ToggleButton>
            <ToggleButton value="income">Money in</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            autoFocus={isNew}
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputProps={{ inputMode: "decimal", style: { fontSize: 28, fontWeight: 700 } }}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
          />
          <TextField
            label={income ? "Where from?" : "What for?"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 200 }}
            placeholder={income ? "e.g. Land sale advance, sponsor for Diwali cup" : "e.g. Shuttle box, EB bill, cement for new court"}
          />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Category</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              {categoryOptions.map((c) => (
                <Chip key={c} label={c} color={chosen === c ? (income ? "success" : "primary") : "default"} variant={chosen === c ? "filled" : "outlined"} onClick={() => setCategory(c)} />
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>{income ? "Received by" : "Paid by"}</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              {peopleOptions.map((p) => (
                <Chip key={p} label={p} color={paidBy === p ? "primary" : "default"} variant={paidBy === p ? "filled" : "outlined"} onClick={() => setPaidBy(p)} />
              ))}
            </Stack>
          </Box>
          <ToggleButtonGroup fullWidth exclusive value={method} onChange={(_, v) => v && setMethod(v)}>
            <ToggleButton value="cash">Cash</ToggleButton>
            <ToggleButton value="gpay">UPI / bank</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {!isNew && (
          <IconButton color="error" onClick={remove} disabled={saving} aria-label="Delete entry">
            <DeleteOutline />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" color={income ? "success" : "primary"} size="large" onClick={save} disabled={saving || !(Number(amount) > 0) || !description.trim() || !chosen}>
          {saving ? <CircularProgress size={22} color="inherit" /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
