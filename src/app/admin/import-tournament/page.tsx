"use client";
import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';

export default function ImportTournamentPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ minHeight: '400px' }}>
          <Typography variant="h4" color="textSecondary">
            Tournament Import Feature - Coming Soon
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}