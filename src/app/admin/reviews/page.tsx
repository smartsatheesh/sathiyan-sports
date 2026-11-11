"use client";

import React, { useEffect, useState } from "react";
import { SITE_URL } from "@/app/lib/site";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Rating,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { CheckCircle, VisibilityOff, WhatsApp } from "@mui/icons-material";

interface Review {
  _id: string;
  displayName: string;
  label?: string;
  rating: number;
  text: string;
  status: "pending" | "approved" | "hidden";
  updatedAt: string;
}

const ASK_MESSAGE =
  `Hi everyone! 🙏 If you enjoy training at Sathiyan Sports, could you leave us a short review? It takes 30 seconds and helps other families find us:\n\n${SITE_URL}/review\n\nThank you! 🏸⚽🏏`;

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [tab, setTab] = useState<Review["status"]>("pending");
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .catch(() => setError("Failed to load reviews"));

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (r: Review, status: "approved" | "hidden") => {
    setReviews((list) => list?.map((x) => (x._id === r._id ? { ...x, status } : x)) || null);
    const res = await fetch(`/api/admin/reviews/${r._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!(await res.json()).success) {
      setError("Could not update review");
      load();
    }
  };

  const visible = (reviews || []).filter((r) => r.status === tab);
  const count = (s: Review["status"]) => (reviews || []).filter((r) => r.status === s).length;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 } }}>
      <Typography variant="h5" fontWeight={800}>Reviews</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Real reviews from members. Approved ones appear on the homepage.
      </Typography>

      <Button
        fullWidth
        variant="contained"
        startIcon={<WhatsApp />}
        href={`https://wa.me/?text=${encodeURIComponent(ASK_MESSAGE)}`}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ mb: 2, bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5b" }, py: 1.2 }}
      >
        Ask members for reviews
      </Button>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
        <Tab value="pending" label={`To approve (${count("pending")})`} />
        <Tab value="approved" label={`Live (${count("approved")})`} />
        <Tab value="hidden" label="Hidden" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!reviews ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : visible.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
          {tab === "pending" ? "No new reviews. Tap the green button to ask your members!" : "Nothing here yet."}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {visible.map((r) => (
            <Card key={r._id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={700}>{r.displayName}</Typography>
                    {r.label && <Typography variant="caption" color="text.secondary">{r.label}</Typography>}
                  </Box>
                  <Rating value={r.rating} readOnly size="small" />
                </Stack>
                <Typography sx={{ mt: 1 }}>“{r.text}”</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  {r.status !== "approved" && (
                    <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => setStatus(r, "approved")}>
                      Approve
                    </Button>
                  )}
                  {r.status !== "hidden" && (
                    <Button size="small" variant="outlined" color="inherit" startIcon={<VisibilityOff />} onClick={() => setStatus(r, "hidden")}>
                      Hide
                    </Button>
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Chip size="small" label={new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
