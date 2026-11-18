"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Edit, PhotoCamera, Refresh, WhatsApp, EmojiEvents } from "@mui/icons-material";
import { isOwner } from "@/app/lib/roles";
import { resizeImage } from "@/app/lib/resizeImage";

interface Customer {
  id: string;
  mobile: string;
  name: string;
  email: string;
  showOnLeaderboard: boolean;
  notes: string;
  photoUrl: string | null;
  bookings: number;
  cancelled: number;
  last30: number;
  thisWeek: number;
  spent: number;
  firstAt: string | null;
  lastAt: string | null;
  favouriteSport: string;
}

type Filter = "all" | "week" | "regulars" | "lapsed" | "new";
const FILTERS: { key: Filter; label: string; hint: string }[] = [
  { key: "all", label: "Everyone", hint: "" },
  { key: "week", label: "Booked this week", hint: "played in the last 7 days" },
  { key: "regulars", label: "Regulars", hint: "3+ bookings in the last 30 days" },
  { key: "lapsed", label: "Lapsed", hint: "3+ bookings ever, nothing in the last 30 days — worth an offer" },
  { key: "new", label: "New", hint: "first booking in the last 30 days" },
];

const DEFAULT_TEMPLATE =
  "Hi {name}! 👋 Thanks for playing at Sathiyan Sports — you've booked with us {bookings} times. " +
  "This week we have a special offer for our regulars: book 2 hours and get 30 minutes free. Reply to this message to grab your slot! 🏏⚽🏸";

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const when = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—");
const daysAgo = (d: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 864e5) : null);

export default function CustomersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", email: "", notes: "", showOnLeaderboard: true, photo: undefined as string | null | undefined });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !isOwner(session.user?.role)) {
      router.push("/auth/login?callbackUrl=/admin/customers");
      return;
    }
    load();
  }, [session, status]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("customerCampaignTemplate");
      if (saved) setTemplate(saved);
    } catch {}
  }, []);

  const load = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      if (data.success) setCustomers(data.customers);
      else setError(data.error || "Failed to load customers");
    } catch {
      setError("Failed to load customers");
    }
  };

  const rows = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.mobile.includes(q) && !c.email.toLowerCase().includes(q)) return false;
      const ago = daysAgo(c.lastAt);
      const firstAgo = daysAgo(c.firstAt);
      switch (filter) {
        case "week": return c.thisWeek > 0;
        case "regulars": return c.last30 >= 3;
        case "lapsed": return c.bookings >= 3 && (ago === null || ago > 30);
        case "new": return firstAgo !== null && firstAgo <= 30;
        default: return true;
      }
    });
  }, [customers, search, filter]);

  const waLink = (c: Customer) => {
    const text = template.replace(/\{name\}/g, c.name.split(" ")[0] || "there").replace(/\{bookings\}/g, String(c.bookings));
    return `https://wa.me/91${c.mobile}?text=${encodeURIComponent(text)}`;
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email, notes: c.notes, showOnLeaderboard: c.showOnLeaderboard, photo: undefined });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body: any = { name: form.name, email: form.email, notes: form.notes, showOnLeaderboard: form.showOnLeaderboard };
      if (form.photo !== undefined) body.photo = form.photo;
      const res = await fetch(`/api/admin/customers/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save");
      setCustomers((list) => (list || []).map((c) => (c.id === editing.id ? { ...c, ...data.customer } : c)));
      setEditing(null);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const list = customers || [];
    return { customers: list.length, week: list.filter((c) => c.thisWeek > 0).length, regulars: list.filter((c) => c.last30 >= 3).length, lapsed: list.filter((c) => c.bookings >= 3 && (daysAgo(c.lastAt) ?? 999) > 30).length };
  }, [customers]);

  if (status === "loading" || !customers) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        {error ? <Alert severity="error">{error}</Alert> : <CircularProgress />}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="h4" fontWeight={800}>Customers</Typography>
        <Button startIcon={<Refresh />} onClick={load}>Refresh</Button>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 2.5 }}>
        Everyone who has booked a slot, saved automatically from their bookings. Typing a known mobile on the booking page fills their details in. The top bookers of the last 7 days appear on the home page as booking champs (names and masked numbers only).
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {[
          { label: "Customers", value: totals.customers },
          { label: "Booked this week", value: totals.week },
          { label: "Regulars (3+ in 30 days)", value: totals.regulars },
          { label: "Lapsed (offer them!)", value: totals.lapsed },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="h5" fontWeight={800}>{s.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
        <Typography fontWeight={800} sx={{ mb: 1 }}>Campaign message</Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={template}
          onChange={(e) => { setTemplate(e.target.value); try { localStorage.setItem("customerCampaignTemplate", e.target.value); } catch {} }}
          helperText="Tap the WhatsApp button on a row to send this to that customer. {name} and {bookings} are filled in for each person. Use the filters to pick who gets it (for example Lapsed, or Regulars)."
        />
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <TextField size="small" label="Search name, mobile or email" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 260 }} />
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {FILTERS.map((f) => (
            <Tooltip title={f.hint} key={f.key}>
              <Chip label={f.label} color={filter === f.key ? "primary" : "default"} onClick={() => setFilter(f.key)} />
            </Tooltip>
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: "auto" } }}>{rows.length} shown</Typography>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell align="center">Bookings</TableCell>
              <TableCell align="center">Last 30 days</TableCell>
              <TableCell align="center">This week</TableCell>
              <TableCell>Last booked</TableCell>
              <TableCell>Plays</TableCell>
              <TableCell align="right">Booked value</TableCell>
              <TableCell align="center">Champ</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: "text.secondary" }}>No customers match.</TableCell></TableRow>
            )}
            {rows.map((c, i) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar src={c.photoUrl || undefined} sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 800 }}>{(c.name || "?")[0].toUpperCase()}</Avatar>
                    <Box>
                      <Typography fontWeight={700} sx={{ lineHeight: 1.2 }}>{c.name || "(no name)"}{filter === "week" && i < 3 ? " 🏆" : ""}</Typography>
                      {c.email && <Typography variant="caption" color="text.secondary">{c.email}</Typography>}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{c.mobile}</TableCell>
                <TableCell align="center"><strong>{c.bookings}</strong>{c.cancelled ? <Typography variant="caption" color="text.secondary"> ({c.cancelled} cancelled)</Typography> : null}</TableCell>
                <TableCell align="center">{c.last30}</TableCell>
                <TableCell align="center">{c.thisWeek ? <Chip size="small" color="warning" label={c.thisWeek} /> : "–"}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {when(c.lastAt)}
                  {daysAgo(c.lastAt) !== null && daysAgo(c.lastAt)! > 30 && c.bookings >= 3 && <Chip size="small" label="lapsed" sx={{ ml: 0.5 }} />}
                </TableCell>
                <TableCell>{c.favouriteSport || "—"}</TableCell>
                <TableCell align="right">{rupees(c.spent)}</TableCell>
                <TableCell align="center">
                  <Tooltip title={c.showOnLeaderboard ? "May appear as a booking champ on the home page" : "Hidden from the home page"}>
                    <EmojiEvents fontSize="small" sx={{ color: c.showOnLeaderboard ? "#ffc400" : "action.disabled" }} />
                  </Tooltip>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <Tooltip title="Send the campaign message on WhatsApp">
                    <IconButton size="small" color="success" component="a" href={waLink(c)} target="_blank" rel="noopener"><WhatsApp fontSize="small" /></IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit customer · {editing?.mobile}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={form.photo === undefined ? editing?.photoUrl || undefined : form.photo || undefined} sx={{ width: 72, height: 72, fontSize: 28, fontWeight: 800 }}>
                {(form.name || "?")[0].toUpperCase()}
              </Avatar>
              <Stack spacing={0.5}>
                <Button component="label" size="small" variant="outlined" startIcon={<PhotoCamera />}>
                  {editing?.photoUrl || form.photo ? "Change photo" : "Add photo"}
                  <input hidden type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const photo = await resizeImage(f, 320, 0.8); setForm((p) => ({ ...p, photo })); }} />
                </Button>
                {(editing?.photoUrl || form.photo) && form.photo !== null && (
                  <Button size="small" color="error" onClick={() => setForm((p) => ({ ...p, photo: null }))}>Remove photo</Button>
                )}
              </Stack>
            </Stack>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
            <TextField label="Notes (only you see these)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth multiline minRows={2} />
            <FormControlLabel control={<Switch checked={form.showOnLeaderboard} onChange={(e) => setForm({ ...form, showOnLeaderboard: e.target.checked })} />} label="May appear as a booking champ on the home page" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
