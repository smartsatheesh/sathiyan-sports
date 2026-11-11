"use client";

import React from "react";
import { Container, Paper, Typography } from "@mui/material";
import ReviewForm from "../components/ReviewForm";

// Shareable link (<site>/review) the academy sends to members on WhatsApp.
export default function ReviewPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>Rate Sathiyan Sports ⭐</Typography>
        <ReviewForm />
      </Paper>
    </Container>
  );
}
