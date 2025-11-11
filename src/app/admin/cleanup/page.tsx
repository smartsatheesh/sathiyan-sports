"use client";

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  Box,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { CleaningServices, CheckCircle, Error } from '@mui/icons-material';

const CleanupPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const runCleanup = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/cleanup-user-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Cleanup failed');
      }
    } catch (err) {
      setError('Failed to run cleanup script');
      console.error('Cleanup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          🔧 Database Cleanup Tool
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ mb: 3 }}>
          This tool will update all existing users in the database to set their preferred slots to "-" (hyphen) 
          and update their status to "registered" with payment status as "completed".
        </Typography>

        <Card sx={{ mb: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              What this script does:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              <li>Sets all users' preferredTimeSlot to "-"</li>
              <li>Sets all users' selectedCourt to "-"</li>
              <li>Updates user status to "registered"</li>
              <li>Updates payment status to "completed"</li>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            icon={<Error />}
          >
            {error}
          </Alert>
        )}

        {result && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            icon={<CheckCircle />}
          >
            <Typography variant="h6" gutterBottom>
              Cleanup Completed Successfully!
            </Typography>
            <Box>
              <Typography>✅ Slots updated for {result.slotsUpdated} users</Typography>
              <Typography>✅ Status updated for {result.statusUpdated} users</Typography>
            </Box>
          </Alert>
        )}

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={runCleanup}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CleaningServices />}
            sx={{ 
              minWidth: 200,
              bgcolor: loading ? undefined : 'warning.main',
              '&:hover': {
                bgcolor: 'warning.dark'
              }
            }}
          >
            {loading ? 'Running Cleanup...' : 'Run Cleanup Script'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
          ⚠️ This operation will modify all user records in the database. Make sure you have a backup before proceeding.
        </Typography>
      </Paper>
    </Container>
  );
};

export default CleanupPage;