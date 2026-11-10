"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Box, Button, CircularProgress, Container, Paper, Typography } from "@mui/material";
import { OpenInNew } from "@mui/icons-material";
import ClubForm, { ClubFormValues } from "../../components/ClubForm";

// A club admin edits their own club: profile, UPI ID, WhatsApp and coaching fees.
export default function ClubSettingsPage() {
  const [club, setClub] = useState<ClubFormValues | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/club")
      .then((r) => r.json())
      .then((d) => (d.success ? setClub(d.club) : setError(d.error)))
      .catch(() => setError("Failed to load your club"));
  }, []);

  const save = async (values: ClubFormValues) => {
    const d = await fetch("/api/admin/club", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).then((r) => r.json());
    return d.success ? null : d.error || "Failed to save";
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 } }}>
      <Typography variant="h5" fontWeight={800}>Club settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your fees and UPI ID are used for your members&apos; registrations, reminders and pay links.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {!club && !error && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
      {club && (
        <>
          <Button component={Link} href={`/club/${club.slug}`} target="_blank" startIcon={<OpenInNew />} sx={{ mb: 2 }}>
            View your club page
          </Button>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <ClubForm initial={club} submitLabel="Save" onSubmit={save} />
          </Paper>
        </>
      )}
    </Container>
  );
}
