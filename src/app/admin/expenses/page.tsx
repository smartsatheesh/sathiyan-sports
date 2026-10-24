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

interface Expense {
  _id: string;
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
  byCategory: Breakdown[];
  byPerson: Breakdown[];
  byMethod: Breakdown[];
  income: { fees: number; bookings: number; total: number };
  net: number;
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function StatTile({ label, value, sub, valueColor }: { label: string; value: string; sub?: React.ReactNode; valueColor?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, height: "100%" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", sm: "1.75rem" }, color: valueColor || "text.primary", lineHeight: 1.3, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary" component="div">{sub}</Typography>}
    </Paper>
  );
}

// Ranked horizontal bars, one hue (magnitude). Label and value are always visible as text.
function BreakdownBars({ title, rows, total }: { title: string; rows: Breakdown[]; total: number }) {
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
                  <Box
                    sx={{
                      height: "100%",
                      width: `${Math.max((r.total / max) * 100, 2)}%`,
                      bgcolor: "primary.main",
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export default function ExpensesPage() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { settings } = useSiteSettings();

  const [month, setMonth] = useState(thisMonth());

  // Allow deep links like /admin/expenses?month=2025-11
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("month");
    if (m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m)) setMonth(m);
  }, []);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Partial<Expense> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/expenses?month=${month}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setExpenses(data.expenses);
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) =>
      [e.description, e.category, e.paidBy].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [expenses, query]);

  const byDay = useMemo(() => {
    const groups: { day: string; items: Expense[]; total: number }[] = [];
    for (const e of filtered) {
      const day = new Date(e.date).toDateString();
      let g = groups.find((x) => x.day === day);
      if (!g) {
        g = { day, items: [], total: 0 };
        groups.push(g);
      }
      g.items.push(e);
      g.total += e.amount;
    }
    return groups;
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Date", "Description", "Category", "Paid by", "Method", "Amount"];
    const rows = expenses.map((e) => [
      new Date(e.date).toLocaleDateString("en-IN"),
      e.description,
      e.category,
      e.paidBy,
      e.paymentMethod === "gpay" ? "UPI" : "Cash",
      String(e.amount),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const delta = summary ? summary.total - summary.previousTotal : 0;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, pb: 12 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>Expenses</Typography>
        <Button size="small" startIcon={<Download />} onClick={exportCsv} disabled={expenses.length === 0}>CSV</Button>
      </Stack>

      <Paper variant="outlined" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, py: 0.5, mb: 2 }}>
        <IconButton onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month"><ChevronLeft /></IconButton>
        <Typography fontWeight={700}>{monthLabel(month)}</Typography>
        <IconButton onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={month >= thisMonth()} aria-label="Next month"><ChevronRight /></IconButton>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading || !summary ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={4}>
              <StatTile
                label="Spent"
                value={rupees(summary.total)}
                sub={summary.previousTotal ? `${delta >= 0 ? "▲" : "▼"} ${rupees(Math.abs(delta))} vs last month` : undefined}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatTile
                label="Money in"
                value={rupees(summary.income.total)}
                sub={`Fees ${rupees(summary.income.fees)} · Courts ${rupees(summary.income.bookings)}`}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatTile
                label={summary.net >= 0 ? "Saved" : "Short"}
                value={rupees(Math.abs(summary.net))}
                valueColor={summary.net >= 0 ? "success.main" : "error.main"}
                sub="money in − spent"
              />
            </Grid>
          </Grid>

          {summary.total > 0 && (
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <BreakdownBars title="By category" rows={summary.byCategory} total={summary.total} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack spacing={1.5} sx={{ height: "100%" }}>
                <BreakdownBars title="Paid by" rows={summary.byPerson} total={summary.total} />
                <BreakdownBars title="Cash vs UPI" rows={summary.byMethod} total={summary.total} />
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
              No expenses {query ? "match your search" : "this month"}.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {byDay.map((g) => (
                <Paper key={g.day} variant="outlined">
                  <Stack direction="row" justifyContent="space-between" sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>
                    <Typography variant="body2" fontWeight={700}>{dayLabel(g.items[0].date)}</Typography>
                    <Typography variant="body2" color="text.secondary">{rupees(g.total)}</Typography>
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
                            {e.category} · {e.paidBy} · {e.paymentMethod === "gpay" ? "UPI" : "Cash"}
                          </Typography>
                        </Box>
                        <Typography fontWeight={700} sx={{ whiteSpace: "nowrap" }}>{rupees(e.amount)}</Typography>
                      </Stack>
                    </React.Fragment>
                  ))}
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}

      <Fab
        color="primary"
        variant="extended"
        onClick={() => setEditing({})}
        sx={{ position: "fixed", right: 16, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <Add sx={{ mr: 1 }} /> Add expense
      </Fab>

      {editing && (
        <ExpenseDialog
          expense={editing}
          people={settings.expenses.people}
          categories={settings.expenses.categories}
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

function ExpenseDialog({
  expense,
  people,
  categories,
  fullScreen,
  onClose,
  onSaved,
}: {
  expense: Partial<Expense>;
  people: string[];
  categories: string[];
  fullScreen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !expense._id;
  const [amount, setAmount] = useState(expense.amount ? String(expense.amount) : "");
  const [description, setDescription] = useState(expense.description || "");
  const [category, setCategory] = useState(expense.category || categories[0] || "");
  const [paidBy, setPaidBy] = useState(expense.paidBy || people[0] || "");
  const [method, setMethod] = useState<"cash" | "gpay">(expense.paymentMethod || "cash");
  const [date, setDate] = useState((expense.date ? new Date(expense.date) : new Date()).toLocaleDateString("en-CA"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Keep values from older entries selectable even if removed from Settings
  const categoryOptions = category && !categories.includes(category) ? [...categories, category] : categories;
  const peopleOptions = paidBy && !people.includes(paidBy) ? [...people, paidBy] : people;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(isNew ? "/api/admin/expenses" : `/api/admin/expenses/${expense._id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), description, category, paidBy, paymentMethod: method, date }),
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
    if (!window.confirm("Delete this expense?")) return;
    setSaving(true);
    const res = await fetch(`/api/admin/expenses/${expense._id}`, { method: "DELETE" });
    const data = await res.json();
    setSaving(false);
    if (data.success) onSaved();
    else setError(data.error || "Failed to delete");
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle>{isNew ? "Add expense" : "Edit expense"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <TextField
            autoFocus={isNew}
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputProps={{ inputMode: "decimal", style: { fontSize: 28, fontWeight: 700 } }}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
          />
          <TextField
            label="What for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 200 }}
            placeholder="e.g. Shuttle box, electricity, salary"
          />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Category</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              {categoryOptions.map((c) => (
                <Chip key={c} label={c} color={category === c ? "primary" : "default"} variant={category === c ? "filled" : "outlined"} onClick={() => setCategory(c)} />
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Paid by</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              {peopleOptions.map((p) => (
                <Chip key={p} label={p} color={paidBy === p ? "primary" : "default"} variant={paidBy === p ? "filled" : "outlined"} onClick={() => setPaidBy(p)} />
              ))}
            </Stack>
          </Box>
          <ToggleButtonGroup fullWidth exclusive value={method} onChange={(_, v) => v && setMethod(v)}>
            <ToggleButton value="cash">Cash</ToggleButton>
            <ToggleButton value="gpay">UPI</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {!isNew && (
          <IconButton color="error" onClick={remove} disabled={saving} aria-label="Delete expense">
            <DeleteOutline />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" size="large" onClick={save} disabled={saving || !(Number(amount) > 0) || !description.trim()}>
          {saving ? <CircularProgress size={22} color="inherit" /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
