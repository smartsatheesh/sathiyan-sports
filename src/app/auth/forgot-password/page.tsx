"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LockReset, WhatsApp } from "@mui/icons-material";
import { useSiteSettings } from "../../hooks/useSiteSettings";
import { waNumber } from "../../lib/pricing";

export default function ForgotPasswordPage() {
  const { settings } = useSiteSettings();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const valid = mobile.replace(/\D/g, "").length === 10;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setDone(data.message);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const whatsappUrl = `https://wa.me/${waNumber(settings.whatsappNumber)}?text=${encodeURIComponent(
    `Hi, I forgot my Sathiyan Sports password. My registered mobile number is ${mobile || "<your number>"}.`
  )}`;

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 4, md: 8 } }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <LockReset color="primary" sx={{ fontSize: 48 }} />
          <Typography variant="h5" fontWeight={800}>Forgot password?</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Enter your registered mobile number. We will send you a reset link on WhatsApp.
          </Typography>
        </Stack>

        {done ? (
          <Stack spacing={2}>
            <Alert severity="success">{done}</Alert>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              In a hurry? Message us and we will send it right away.
            </Typography>
          </Stack>
        ) : (
          <Box component="form" onSubmit={submit}>
            <TextField
              fullWidth
              label="Mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              inputProps={{ inputMode: "tel", autoComplete: "tel" }}
              InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
              sx={{ mb: 2 }}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Button fullWidth type="submit" size="large" variant="contained" disabled={!valid || loading} sx={{ py: 1.4 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : "Request reset link"}
            </Button>
          </Box>
        )}

        <Button
          fullWidth
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<WhatsApp />}
          sx={{ mt: 2, color: "#128C7E" }}
        >
          Chat with us on WhatsApp
        </Button>

        <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
          <Link href="/auth/login">Back to login</Link>
        </Typography>
      </Paper>
    </Container>
  );
}
