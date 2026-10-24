"use client";

import React, { useEffect, useState } from "react";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";

interface FeeSummary {
  subscribed: boolean;
  paidTill: string | null;
  awaitingVerification: boolean;
  options: { months: number; amount: number }[];
}

// Member's own fee status with a shortcut to their UPI pay page.
export default function MembershipFeeCard() {
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    fetch("/api/fees/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSummary(d.summary);
          setToken(d.payToken);
        }
      })
      .catch(() => {});
  }, []);

  if (!summary || !summary.subscribed) return null;

  const paidTill = summary.paidTill ? new Date(summary.paidTill) : null;
  const daysLeft = paidTill ? Math.ceil((paidTill.getTime() - Date.now()) / 86_400_000) : null;
  const due = daysLeft === null || daysLeft <= 7;
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
        <div>
          <Typography variant="h6">Membership fee</Typography>
          {summary.awaitingVerification ? (
            <Alert severity="info" sx={{ mt: 1 }}>Your payment is being verified.</Alert>
          ) : (
            <Typography color={due ? "error.main" : "text.secondary"}>
              {!paidTill
                ? "No payment recorded yet"
                : daysLeft! < 0
                  ? `Expired on ${fmt(paidTill)}`
                  : `Paid till ${fmt(paidTill)}`}
            </Typography>
          )}
        </div>
        {!summary.awaitingVerification && (
          <Button component={Link} href={`/pay/${token}`} variant={due ? "contained" : "outlined"} size="large">
            {due ? `Pay ₹${summary.options[0]?.amount.toLocaleString("en-IN")}` : "Pay in advance"}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
