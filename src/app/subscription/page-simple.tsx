"use client";
import React from "react";
import { Container, Paper, Typography, Box } from "@mui/material";
import { HealthAndSafety } from "@mui/icons-material";

const SubscriptionPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={4}>
          <HealthAndSafety color="primary" sx={{ mr: 2, fontSize: 40 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Pay for Your Health
          </Typography>
        </Box>
        
        <Typography variant="body1">
          Subscription page is loading...
        </Typography>
      </Paper>
    </Container>
  );
};

export default SubscriptionPage;