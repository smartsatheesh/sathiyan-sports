"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { AutoAwesome } from "@mui/icons-material";

interface Row {
  _id: string;
  userName?: string;
  createdAt: string;
  ticks: number;
  plan: { title: string };
  inputs: { sport: string; goal: string; age: string; days: string };
}

// Staff view: every member's recent AI plans and how much they've completed.
export default function CoachAdminPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/coach/plans?all=1")
      .then((r) => r.json())
      .then((d) => setRows(d.plans || []))
      .catch(() => setRows([]));
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <AutoAwesome color="primary" />
        <Typography variant="h5" fontWeight={800}>Members' AI plans</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Tap a plan to see it exactly as the member does.
      </Typography>

      {!rows ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>No plans yet.</Typography>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((r) => (
            <Card key={r._id} variant="outlined">
              <CardActionArea component={Link} href={`/coach?plan=${r._id}`} sx={{ p: 1.75 }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{r.userName || "Member"}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{r.plan?.title}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}>
                  <Chip size="small" label={r.inputs?.sport} />
                  <Chip size="small" variant="outlined" label={`${r.inputs?.days} days/week`} />
                  <Chip size="small" variant="outlined" label={`Age ${r.inputs?.age}`} />
                  <Chip size="small" color={r.ticks ? "success" : "default"} label={`${r.ticks} exercises done`} />
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
