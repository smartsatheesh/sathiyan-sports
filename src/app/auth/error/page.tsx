"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert
} from '@mui/material';
import { Error as ErrorIcon, ArrowBack } from '@mui/icons-material';
import Link from 'next/link';

const errorMessages = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.'
};

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  const errorMessage = errorMessages[error as keyof typeof errorMessages] || errorMessages.Default;

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={10} 
          sx={{ 
            p: 4,
            borderRadius: 3,
            textAlign: 'center'
          }}
        >
          <ErrorIcon 
            sx={{ 
              fontSize: 64, 
              color: 'error.main', 
              mb: 2
            }} 
          />
          
          <Typography variant="h4" gutterBottom color="error.main" fontWeight="bold">
            Authentication Error
          </Typography>
          
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            {errorMessage}
          </Alert>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Please try signing in again. If the problem persists, contact support.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => router.back()}
            >
              Go Back
            </Button>
            
            <Link href="/auth/login">
              <Button variant="contained">
                Try Again
              </Button>
            </Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
