"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Add, DeleteOutline, ExpandLess, ExpandMore, Refresh, Search, WhatsApp } from "@mui/icons-material";
import { waNumber } from "@/app/lib/pricing";

type FeeState = "overdue" | "lapsed" | "due_soon" | "paid" | "awaiting_verification" | "never_paid";

interface Member {
  userId: string;
  champId: string;
  name: string;
  mobile: string;
  champType: string;
  sport: string;
  paidTill: string | null;
  daysLeft: number | null;
  state: FeeState;
  monthlyFee: number;
  planFees: Record<number, number>;
  feeReminderAt: string | null;
  payLink: string;
}

type TabKey = "due" | "soon" | "paid" | "lapsed" | "all";

const MONTH_OPTIONS = [1, 3, 6, 12];
const DAY = 24 * 60 * 60 * 1000;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function statusOf(m: Member): { label: string; color: "error" | "warning" | "success" | "info" | "default" } {
  switch (m.state) {
    case "overdue":
      return { label: `Overdue ${Math.abs(m.daysLeft || 0)} day${Math.abs(m.daysLeft || 0) === 1 ? "" : "s"} · since ${fmtDate(m.paidTill)}`, color: "error" };
    case "lapsed":
      return { label: `No payment since ${fmtDate(m.paidTill)}`, color: "default" };
    case "due_soon":
      return { label: m.daysLeft === 0 ? "Due today" : `Due in ${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"} · ${fmtDate(m.paidTill)}`, color: "warning" };
    case "awaiting_verification":
      return { label: "Paid online — verify in Payments", color: "info" };
    case "never_paid":
      return { label: "No payment recorded yet", color: "default" };
    default:
      return { label: `Paid till ${fmtDate(m.paidTill)}`, color: "success" };
  }
}

function reminderText(m: Member): string {
  const first = m.name.split(" ")[0] || "there";
  const whose = m.champType === "kids" ? `${first}'s` : "your";
  const greeting = m.champType === "kids" ? "Hi" : `Hi ${first}`;
  const when =
    m.state === "overdue"
      ? `was due on ${fmtDate(m.paidTill)}`
      : m.state === "due_soon"
        ? `is due on ${fmtDate(m.paidTill)}`
        : "is pending";
  return `${greeting}, a friendly reminder from Sathiyan Sports 🏸⚽\n\n${whose[0].toUpperCase() + whose.slice(1)} monthly fee of ${rupees(m.monthlyFee)} ${when}.\n\nPay easily by UPI here:\n${m.payLink}\n\nThank you!`;
}

const daysAgo = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : null);

function nextStart(paidTill: string | null): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (paidTill) {
    const end = new Date(paidTill);
    if (end.getTime() >= today.getTime() - 30 * DAY) return end.toISOString().slice(0, 10);
  }
  return today.toISOString().slice(0, 10);
}

export default function AdminFeesPage() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [members, setMembers] = useState<Member[]>([]);
  const [collected, setCollected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [tab, setTab] = useState<TabKey>("due");
  const [group, setGroup] = useState<"all" | "kids" | "adult">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, any[]>>({});

  const [recordFor, setRecordFor] = useState<Member | null>(null);
  const [queue, setQueue] = useState<Member[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/fees");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMembers(data.members);
      setCollected(data.collectedThisMonth);
    } catch (e: any) {
      setError(e.message || "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inGroup = (m: Member) => group === "all" || (group === "kids" ? m.champType === "kids" : m.champType !== "kids");
  const isDue = (m: Member) => m.state === "overdue" || m.state === "never_paid";

  const counts = useMemo(() => {
    const g = members.filter(inGroup);
    return {
      due: g.filter(isDue),
      soon: g.filter((m) => m.state === "due_soon"),
      lapsed: g.filter((m) => m.state === "lapsed"),
      awaiting: g.filter((m) => m.state === "awaiting_verification"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, group]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter(inGroup)
      .filter((m) => {
        if (tab === "due") return isDue(m) || m.state === "awaiting_verification";
        if (tab === "soon") return m.state === "due_soon";
        if (tab === "paid") return m.state === "paid";
        if (tab === "lapsed") return m.state === "lapsed";
        return true;
      })
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.champId.toLowerCase().includes(q) || m.mobile.includes(q))
      .sort((a, b) => (a.daysLeft ?? -9999) - (b.daysLeft ?? -9999));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, tab, group, query]);

  const openReminder = async (m: Member) => {
    window.open(`https://wa.me/${waNumber(m.mobile)}?text=${encodeURIComponent(reminderText(m))}`, "_blank", "noopener,noreferrer");
    setMembers((prev) => prev.map((x) => (x.userId === m.userId ? { ...x, feeReminderAt: new Date().toISOString() } : x)));
    fetch(`/api/admin/fees/${m.userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reminded" }),
    }).catch(() => {});
  };

  const toggleHistory = async (m: Member) => {
    if (expanded === m.userId) {
      setExpanded(null);
      return;
    }
    setExpanded(m.userId);
    if (!history[m.userId]) {
      const res = await fetch(`/api/admin/fees/${m.userId}`);
      const data = await res.json();
      setHistory((h) => ({ ...h, [m.userId]: data.history || [] }));
    }
  };

  const markLeft = async (m: Member) => {
    if (!window.confirm(`Mark ${m.name} as left? They will no longer appear here. To bring them back, set Subscribed to Yes in Admin → Users.`)) return;
    const res = await fetch(`/api/admin/fees/${m.userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markLeft" }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error || "Could not update");
      return;
    }
    setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
    setToast(`${m.name} marked as left`);
  };

  const deletePeriod = async (m: Member, subId: string) => {
    if (!window.confirm("Delete this payment period? Use this only for entries made by mistake.")) return;
    const res = await fetch(`/api/admin/fees/${m.userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deletePeriod", subscriptionId: subId }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error || "Could not delete");
      return;
    }
    setHistory((h) => ({ ...h, [m.userId]: (h[m.userId] || []).filter((p) => p._id !== subId) }));
    load();
  };

  const dueTotal = counts.due.reduce((sum, m) => sum + m.monthlyFee, 0);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Membership fees</Typography>
          <Typography variant="body2" color="text.secondary">Kids and adults, all in one place</Typography>
        </Box>
        <IconButton onClick={load} aria-label="Refresh"><Refresh /></IconButton>
      </Stack>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: "Overdue", value: counts.due.length, sub: rupees(dueTotal), color: "error.main", onClick: () => setTab("due") },
          { label: "Due this week", value: counts.soon.length, sub: "send reminders", color: "warning.main", onClick: () => setTab("soon") },
          { label: "Collected this month", value: rupees(collected), sub: `${counts.awaiting.length} to verify`, color: "success.main", onClick: undefined },
        ].map((t) => (
          <Grid item xs={4} key={t.label}>
            <Paper
              variant="outlined"
              onClick={t.onClick}
              sx={{ p: { xs: 1.25, sm: 2 }, height: "100%", cursor: t.onClick ? "pointer" : "default" }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: "block" }}>{t.label}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.15rem", sm: "1.6rem" }, color: t.color }}>{t.value}</Typography>
              <Typography variant="caption" color="text.secondary">{t.sub}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {counts.due.length + counts.soon.length > 0 && (
        <Button
          fullWidth
          variant="contained"
          startIcon={<WhatsApp />}
          sx={{ mb: 2, bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5b" }, py: 1.2 }}
          onClick={() => setQueue([...counts.due, ...counts.soon].filter((m) => m.mobile))}
        >
          Send reminders ({counts.due.length + counts.soon.length})
        </Button>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search name, ChampID or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        />
        <ToggleButtonGroup size="small" exclusive value={group} onChange={(_, v) => v && setGroup(v)} sx={{ flexShrink: 0 }}>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="kids">Kids</ToggleButton>
          <ToggleButton value="adult">Adults</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2 }}>
        <Tab value="due" label={`Due (${counts.due.length + counts.awaiting.length})`} />
        <Tab value="soon" label={`This week (${counts.soon.length})`} />
        <Tab value="paid" label="Paid" />
        <Tab value="lapsed" label={`Lapsed (${counts.lapsed.length})`} />
        <Tab value="all" label="All" />
      </Tabs>

      {tab === "lapsed" && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No payment for over 45 days. Record a payment if they are still training, otherwise mark them as left.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast("")}>{toast}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : visible.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
          {tab === "due" ? "Nobody is overdue 🎉" : "No members here."}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {visible.map((m) => {
            const st = statusOf(m);
            const reminded = daysAgo(m.feeReminderAt);
            return (
              <Card key={m.userId} variant="outlined">
                <CardContent sx={{ pb: "12px !important" }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: m.champType === "kids" ? "secondary.main" : "primary.main", width: 40, height: 40 }}>
                      {m.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>{m.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {m.champId} · {m.sport || "—"} · {m.champType === "kids" ? "Kids" : "Adult"}
                      </Typography>
                    </Box>
                    <Typography fontWeight={800} sx={{ whiteSpace: "nowrap" }}>
                      {rupees(m.monthlyFee)}<Typography component="span" variant="caption" color="text.secondary">/mo</Typography>
                    </Typography>
                  </Stack>

                  <Chip size="small" color={st.color} label={st.label} sx={{ mt: 1.25, maxWidth: "100%" }} />
                  {reminded !== null && m.state !== "paid" && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      reminded {reminded === 0 ? "today" : `${reminded}d ago`}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                    <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setRecordFor(m)} sx={{ flex: 1, whiteSpace: "nowrap" }}>
                      Payment
                    </Button>
                    {m.state === "lapsed" && (
                      <Button size="small" color="inherit" onClick={() => markLeft(m)} sx={{ flex: 1 }}>
                        Mark as left
                      </Button>
                    )}
                    {m.mobile && m.state !== "paid" && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<WhatsApp />}
                        onClick={() => openReminder(m)}
                        sx={{ flex: 1, color: "#128C7E", borderColor: "#25D366" }}
                      >
                        Remind
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => toggleHistory(m)} aria-label="Payment history">
                      {expanded === m.userId ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Stack>

                  <Collapse in={expanded === m.userId} unmountOnExit>
                    <Box sx={{ mt: 1.5 }}>
                      {!history[m.userId] ? (
                        <CircularProgress size={20} />
                      ) : history[m.userId].length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No payments yet.</Typography>
                      ) : (
                        <Stack spacing={0.75}>
                          {history[m.userId].map((p) => (
                            <Stack key={p._id} direction="row" alignItems="center" spacing={1} sx={{ fontSize: 13 }}>
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>{rupees(p.amount || 0)}</Typography>
                              <Chip
                                size="small"
                                label={p.paymentStatus === "Paid" ? (p.paymentMethod || "Paid") : p.paymentStatus}
                                color={p.paymentStatus === "Paid" ? "success" : "default"}
                                variant="outlined"
                              />
                              <IconButton size="small" onClick={() => deletePeriod(m, p._id)} aria-label="Delete period">
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Stack>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {recordFor && (
        <RecordPaymentDialog
          member={recordFor}
          fullScreen={fullScreen}
          onClose={() => setRecordFor(null)}
          onSaved={(msg) => {
            setRecordFor(null);
            setToast(msg);
            setHistory((h) => {
              const { [recordFor.userId]: _, ...rest } = h;
              return rest;
            });
            load();
          }}
        />
      )}

      {queue && (
        <ReminderQueue
          members={queue}
          fullScreen={fullScreen}
          onSend={openReminder}
          onClose={() => setQueue(null)}
        />
      )}
    </Container>
  );
}

function RecordPaymentDialog({
  member,
  fullScreen,
  onClose,
  onSaved,
}: {
  member: Member;
  fullScreen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(String(member.planFees[1]));
  const [method, setMethod] = useState<"cash" | "upi">("cash");
  const [utr, setUtr] = useState("");
  const [startDate, setStartDate] = useState(nextStart(member.paidTill));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickMonths = (m: number) => {
    setMonths(m);
    setAmount(String(member.planFees[m]));
  };

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
  }, [startDate, months]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.userId, months, amount: Number(amount), method, utr: method === "upi" ? utr : undefined, startDate }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSaved(`Recorded ${rupees(Number(amount))} for ${member.name} — paid till ${fmtDate(endDate)}`);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle>
        Record payment
        <Typography variant="body2" color="text.secondary">{member.name} · {member.champId}</Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Plan</Typography>
            <Grid container spacing={1}>
              {MONTH_OPTIONS.map((m) => (
                <Grid item xs={6} key={m}>
                  <Paper
                    variant="outlined"
                    onClick={() => pickMonths(m)}
                    sx={{
                      p: 1.25,
                      textAlign: "center",
                      cursor: "pointer",
                      borderColor: months === m ? "primary.main" : "divider",
                      borderWidth: months === m ? 2 : 1,
                      bgcolor: months === m ? "action.selected" : "background.paper",
                    }}
                  >
                    <Typography fontWeight={700}>{m} month{m > 1 ? "s" : ""}</Typography>
                    <Typography variant="body2" color="text.secondary">{rupees(member.planFees[m])}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          <TextField
            label="Amount received"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            inputProps={{ min: 0, inputMode: "numeric" }}
            helperText="Change it for discounts or special rates"
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>Paid by</Typography>
            <ToggleButtonGroup fullWidth exclusive value={method} onChange={(_, v) => v && setMethod(v)}>
              <ToggleButton value="cash">Cash</ToggleButton>
              <ToggleButton value="upi">UPI</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {method === "upi" && (
            <TextField
              label="UPI reference (optional)"
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/[^\d\s]/g, ""))}
              inputProps={{ inputMode: "numeric", maxLength: 16 }}
              helperText="12-digit UTR — prevents the same payment being recorded twice"
            />
          )}

          <TextField
            label="Period starts"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText={`Paid till ${fmtDate(endDate)}`}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" size="large" onClick={save} disabled={saving || !(Number(amount) >= 0) || !startDate}>
          {saving ? <CircularProgress size={22} color="inherit" /> : `Save ${rupees(Number(amount) || 0)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// WhatsApp can't send in bulk for free, so walk through the list one tap per member.
function ReminderQueue({
  members,
  fullScreen,
  onSend,
  onClose,
}: {
  members: Member[];
  fullScreen: boolean;
  onSend: (m: Member) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const m = members[index];
  const done = index >= members.length;

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle>
        Send reminders
        <Typography variant="body2" color="text.secondary">
          {done ? "All done" : `${index + 1} of ${members.length}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {done ? (
          <Typography sx={{ py: 4, textAlign: "center" }}>All reminders opened ✅</Typography>
        ) : (
          <Stack spacing={1.5}>
            <Typography fontWeight={700}>{m.name}</Typography>
            <Typography variant="body2" color="text.secondary">{statusOf(m).label}</Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#e7fbe9", whiteSpace: "pre-wrap", fontSize: 14 }}>
              {reminderText(m)}
            </Paper>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {done ? (
          <Button fullWidth variant="contained" onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button onClick={() => setIndex((i) => i + 1)}>Skip</Button>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={<WhatsApp />}
              sx={{ bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5b" } }}
              onClick={() => {
                onSend(m);
                setIndex((i) => i + 1);
              }}
            >
              Open WhatsApp
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
