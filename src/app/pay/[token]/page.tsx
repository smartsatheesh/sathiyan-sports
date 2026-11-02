"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { CheckCircle, HourglassTop } from "@mui/icons-material";
import UpiPaymentDialog from "@/app/components/UpiPaymentDialog";

interface Summary {
  firstName: string;
  champId: string;
  champType: string;
  sport: string;
  program: string;
  paidTill: string | null;
  nextStart: string;
  awaitingVerification: boolean;
  options: { months: number; amount: number }[];
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function MemberPayPage({ params }: { params: { token: string } }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [months, setMonths] = useState(1);
  const [paying, setPaying] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/fees/pay?t=${encodeURIComponent(params.token)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message || "Could not load your details");
    }
  }, [params.token]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Container maxWidth="xs" sx={{ py: 6 }}>
        <Alert severity="error">{error}. Please ask the academy for a new link.</Alert>
      </Container>
    );
  }

  if (!summary) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  const selected = summary.options.find((o) => o.months === months) || summary.options[0];
  const isActive = summary.paidTill && new Date(summary.paidTill) >= new Date();
  const until = new Date(summary.nextStart);
  until.setMonth(until.getMonth() + months);

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 3, md: 6 } }}>
      <Typography variant="h5" fontWeight={800}>Hi {summary.firstName} 👋</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {summary.program} · {summary.champType === "kids" ? "Kids" : "Adult"} · {summary.champId}
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {summary.paidTill ? (
          <Typography>
            {isActive ? "Paid till " : "Membership ended on "}
            <b>{fmt(summary.paidTill)}</b>
          </Typography>
        ) : (
          <Typography>No payment recorded yet.</Typography>
        )}
      </Paper>

      {submitted || summary.awaitingVerification ? (
        <Alert icon={submitted ? <CheckCircle /> : <HourglassTop />} severity={submitted ? "success" : "info"}>
          {submitted
            ? "Thank you! We will confirm your payment shortly."
            : "We have your payment and are verifying it. No need to pay again."}
        </Alert>
      ) : (
        <>
          <Typography fontWeight={700} sx={{ mb: 1 }}>Choose your plan</Typography>
          <Grid container spacing={1.25} sx={{ mb: 2 }}>
            {summary.options.map((o) => (
              <Grid item xs={6} key={o.months}>
                <Paper
                  variant="outlined"
                  onClick={() => setMonths(o.months)}
                  sx={{
                    p: 1.5,
                    textAlign: "center",
                    cursor: "pointer",
                    borderColor: months === o.months ? "primary.main" : "divider",
                    borderWidth: months === o.months ? 2 : 1,
                    bgcolor: months === o.months ? "action.selected" : "background.paper",
                  }}
                >
                  <Typography fontWeight={700}>{o.months} month{o.months > 1 ? "s" : ""}</Typography>
                  <Typography variant="h6" color="primary.main" fontWeight={800}>₹{o.amount.toLocaleString("en-IN")}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Covers {fmt(summary.nextStart)} to {fmt(until.toISOString())}
          </Typography>

          <Button fullWidth size="large" variant="contained" sx={{ py: 1.5 }} onClick={() => setPaying(true)}>
            Pay ₹{selected.amount.toLocaleString("en-IN")} by UPI
          </Button>
        </>
      )}

      <Stack sx={{ mt: 4 }} alignItems="center">
        <Typography variant="caption" color="text.secondary">Sathiyan Sports · www.sathiyansports.fit</Typography>
      </Stack>

      <UpiPaymentDialog
        open={paying}
        amount={selected.amount}
        note={`Fee ${summary.champId} ${months}m`}
        title="Pay membership fee"
        submitUtr={async (utr) => {
          const res = await fetch("/api/fees/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ t: params.token, months, utr }),
          });
          const data = await res.json();
          if (data.success) setSubmitted(true);
          return data;
        }}
        onClose={() => setPaying(false)}
      />
    </Container>
  );
}
