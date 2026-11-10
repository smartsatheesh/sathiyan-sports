"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { CheckCircle, Cancel, ContentCopy, Refresh, WhatsApp } from "@mui/icons-material";
import { waNumber } from "@/app/lib/pricing";
import { useSession } from "next-auth/react";

type Status = "submitted" | "confirmed" | "rejected";

interface PaymentRow {
  _id: string;
  kind: "booking" | "subscription" | "tournament";
  reference: string;
  payerName: string;
  payerPhone: string;
  amount: number;
  utr?: string;
  rejectedUtr?: string;
  status: Status;
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  createdAt: string;
  club?: string;
}

const KIND_LABEL: Record<PaymentRow["kind"], string> = {
  booking: "Court booking",
  subscription: "Membership fee",
  tournament: "Tournament entry",
};

function receiptMessage(p: PaymentRow, from: string): string {
  return `Hi ${p.payerName || ""}, we have received your payment of ₹${p.amount} for ${KIND_LABEL[p.kind].toLowerCase()} (${p.reference}). UPI ref: ${p.utr}. Thank you! – ${from}`;
}

function rejectMessage(p: PaymentRow, from: string): string {
  return `Hi ${p.payerName || ""}, we could not find your UPI payment of ₹${p.amount} for ${p.reference} (ref ${p.rejectedUtr || p.utr}). Please check the reference number or reply here with a screenshot. – ${from}`;
}

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<Status>("submitted");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [justDecided, setJustDecided] = useState<PaymentRow | null>(null);
  // The owner can narrow the list to one club; club admins only ever see their own club's fees
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "admin";
  const [club, setClub] = useState("all");
  const [clubs, setClubs] = useState<{ slug: string; name: string }[]>([]);
  const clubName = (slug?: string) =>
    !slug || slug === "sathiyan" ? "Sathiyan Sports" : clubs.find((c) => c.slug === slug)?.name || "Sathiyan Sports";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payments?status=${tab}&club=${encodeURIComponent(club)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRows(data.payments);
      setPendingCount(data.pendingCount);
      setClubs(data.clubs || []);
    } catch (e: any) {
      setError(e.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [tab, club]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (row: PaymentRow, action: "confirm" | "reject") => {
    setBusyId(row._id);
    setError("");
    try {
      const res = await fetch(`/api/admin/payments/${row._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[row._id] || "" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setJustDecided(data.payment);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
      setPendingCount((c) => Math.max(0, c - 1));
    } catch (e: any) {
      setError(e.message || "Failed to update payment");
    } finally {
      setBusyId(null);
    }
  };

  const waLink = (p: PaymentRow) =>
    `https://wa.me/${waNumber(p.payerPhone)}?text=${encodeURIComponent(
      p.status === "rejected" ? rejectMessage(p, clubName(p.club)) : receiptMessage(p, clubName(p.club))
    )}`;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Verify payments</Typography>
          <Typography variant="body2" color="text.secondary">
            Match each UPI reference with your bank / UPI app, then confirm.
          </Typography>
        </Box>
        <IconButton onClick={load} aria-label="Refresh"><Refresh /></IconButton>
      </Stack>

      {isOwner && clubs.length > 1 && (
        <TextField select fullWidth size="small" label="Club" value={club} onChange={(e) => setClub(e.target.value)} sx={{ mb: 2 }}>
          <MenuItem value="all">All clubs</MenuItem>
          {clubs.map((c) => (
            <MenuItem key={c.slug} value={c.slug}>{c.name}</MenuItem>
          ))}
        </TextField>
      )}

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setJustDecided(null); }} variant="fullWidth" sx={{ mb: 2 }}>
        <Tab value="submitted" label={`To verify${pendingCount ? ` (${pendingCount})` : ""}`} />
        <Tab value="confirmed" label="Confirmed" />
        <Tab value="rejected" label="Rejected" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {justDecided && (
        <Alert
          severity={justDecided.status === "confirmed" ? "success" : "warning"}
          sx={{ mb: 2 }}
          onClose={() => setJustDecided(null)}
          action={
            justDecided.payerPhone ? (
              <Button color="inherit" size="small" startIcon={<WhatsApp />} href={waLink(justDecided)} target="_blank" rel="noopener noreferrer">
                Notify
              </Button>
            ) : undefined
          }
        >
          {justDecided.status === "confirmed" ? "Confirmed" : "Rejected"} ₹{justDecided.amount} from {justDecided.payerName || "customer"}.
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
          {tab === "submitted" ? "All caught up — nothing to verify." : "No payments here yet."}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((p) => (
            <Card key={p._id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{p.payerName || "Unknown"}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.payerPhone}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}>
                      <Chip size="small" label={KIND_LABEL[p.kind]} />
                      {isOwner && p.club && p.club !== "sathiyan" && <Chip size="small" color="secondary" label={clubName(p.club)} />}
                      {p.reference && <Chip size="small" variant="outlined" label={p.reference} />}
                    </Stack>
                  </Box>
                  <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ whiteSpace: "nowrap" }}>
                    ₹{p.amount.toLocaleString("en-IN")}
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                  <Typography variant="body2">
                    UTR: <b style={{ fontFamily: "monospace", fontSize: "1rem" }}>{p.utr || p.rejectedUtr || "—"}</b>
                  </Typography>
                  {(p.utr || p.rejectedUtr) && (
                    <Tooltip title="Copy">
                      <IconButton size="small" onClick={() => navigator.clipboard?.writeText(p.utr || p.rejectedUtr || "")}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Submitted {new Date(p.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  {p.decidedBy && ` · ${p.status} by ${p.decidedBy}`}
                  {p.note && ` · ${p.note}`}
                </Typography>

                {p.status === "submitted" ? (
                  <>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Note (optional)"
                      value={notes[p._id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [p._id]: e.target.value }))}
                      sx={{ mt: 1.5 }}
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        disabled={busyId === p._id}
                        onClick={() => decide(p, "reject")}
                      >
                        Reject
                      </Button>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        startIcon={busyId === p._id ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
                        disabled={busyId === p._id}
                        onClick={() => decide(p, "confirm")}
                      >
                        Confirm
                      </Button>
                    </Stack>
                  </>
                ) : (
                  p.payerPhone && (
                    <Button size="small" startIcon={<WhatsApp />} href={waLink(p)} target="_blank" rel="noopener noreferrer" sx={{ mt: 1, color: "#128C7E" }}>
                      Message on WhatsApp
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
