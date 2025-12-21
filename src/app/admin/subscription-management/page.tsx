"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Container, Paper, Typography, Box, Button } from '@mui/material';

export default function SubscriptionManagementPage() {
  const router = useRouter();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ minHeight: '400px', gap: 3 }}>
          <Typography variant="h4" color="textSecondary" textAlign="center">
            Subscription Management
          </Typography>
          <Typography variant="h6" color="textSecondary" textAlign="center">
            This page has been moved to a new location
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => router.push('/admin/subscriptions')}
            size="large"
          >
            Go to New Subscription Management Page
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}