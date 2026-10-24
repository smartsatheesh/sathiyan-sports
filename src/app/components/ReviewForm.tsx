"use client";

import React, { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Rating, Stack, TextField, Typography } from "@mui/material";

// A member's own review: stars + a few words. Goes to the admin for approval.
export default function ReviewForm({ compact = false }: { compact?: boolean }) {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reviews?mine=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.review) {
          setRating(d.review.rating);
          setText(d.review.text);
          setStatus(d.review.status);
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMessage(data.message);
      setStatus("pending");
    } catch (e: any) {
      setError(e.message || "Could not save your review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {!compact && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          How has your experience been at Sathiyan Sports? Your words help other families find us.
        </Typography>
      )}
      <Rating value={rating} onChange={(_, v) => setRating(v)} size="large" sx={{ fontSize: 44, mb: 1 }} />
      <TextField
        fullWidth
        multiline
        minRows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. The coaches are patient and my son loves the evening badminton sessions."
        inputProps={{ maxLength: 300 }}
        helperText={`${text.length}/300 · Shown with your first name and initial`}
      />
      {status === "approved" && !message && <Alert severity="success" sx={{ mt: 1.5 }}>Your review is live on our website. Thank you!</Alert>}
      {status === "pending" && !message && <Alert severity="info" sx={{ mt: 1.5 }}>Waiting for approval.</Alert>}
      {message && <Alert severity="success" sx={{ mt: 1.5 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button variant="contained" size="large" onClick={save} disabled={saving || !rating || text.trim().length < 10}>
          {saving ? <CircularProgress size={22} color="inherit" /> : status ? "Update review" : "Post review"}
        </Button>
      </Stack>
    </Box>
  );
}
