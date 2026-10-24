"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Search, WhatsApp } from "@mui/icons-material";
import { waNumber } from "@/app/lib/pricing";

interface Row {
  _id: string;
  name: string;
  champId: string;
  mobile?: string;
  phone?: string;
  champType?: string;
  resetRequestedAt?: string;
}

export default function PasswordResetsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());

  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/password-resets${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setRows(data.users || []);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendLink = async (row: Row) => {
    setBusy(row._id);
    setError("");
    // Open the tab synchronously so mobile browsers don't block it as a popup
    const win = window.open("", "_blank");
    try {
      const res = await fetch("/api/admin/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row._id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const text = `Hi ${data.user.name}, here is your Sathiyan Sports password reset link (ChampID ${data.user.champId}). It works once and expires in ${data.expiresInHours} hours:\n\n${data.link}`;
      const url = `https://wa.me/${waNumber(data.user.mobile || "")}?text=${encodeURIComponent(text)}`;
      if (win) win.location.href = url;
      else window.location.href = url;
      setSent((s) => new Set(s).add(row._id));
    } catch (e: any) {
      win?.close();
      setError(e.message || "Could not create link");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 } }}>
      <Typography variant="h5" fontWeight={800}>Password resets</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Members who tapped “Forgot password”. Send each a one-time link on WhatsApp. Search to help anyone else.
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder="Search name, ChampID or mobile"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load(query)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
          endAdornment: query && (
            <Button size="small" onClick={() => load(query)}>Search</Button>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
          {query ? "No members found." : "No pending requests."}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((r) => (
            <Card key={r._id} variant="outlined">
              <CardContent sx={{ pb: "12px !important" }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.champId} · {r.mobile || r.phone}
                      {r.resetRequestedAt && ` · asked ${new Date(r.resetRequestedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}`}
                    </Typography>
                  </Box>
                  <Button
                    variant={sent.has(r._id) ? "outlined" : "contained"}
                    startIcon={busy === r._id ? <CircularProgress size={16} color="inherit" /> : <WhatsApp />}
                    disabled={busy === r._id || !(r.mobile || r.phone)}
                    onClick={() => sendLink(r)}
                    sx={sent.has(r._id) ? {} : { bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5b" } }}
                  >
                    {sent.has(r._id) ? "Resend" : "Send link"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
