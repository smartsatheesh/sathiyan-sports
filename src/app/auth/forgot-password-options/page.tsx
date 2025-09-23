'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import { useRouter } from 'next/navigation';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`forgot-password-tabpanel-${index}`}
      aria-labelledby={`forgot-password-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ForgotPasswordOptionsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const validateMobile = (phone: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleWhatsAppReset = async () => {
    if (!validateMobile(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        
        // Show WhatsApp URL if available
        if (data.whatsappUrl) {
          setSuccess(prevSuccess => 
            prevSuccess + `\n\n📱 Or click here to send manually: ${data.whatsappUrl}`
          );
        }
        
        // Redirect to multi-step page
        setTimeout(() => {
          router.push('/auth/forgot-password');
        }, 2000);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailReset = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        setSuccess(data.message || 'If the email exists, a reset link has been sent');
      } else {
        setError(data.message || 'Failed to send reset link');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ padding: 4 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            align="center"
            sx={{ color: '#333', fontWeight: 'bold' }}
          >
            Reset Password
          </Typography>
          
          <Typography 
            variant="body2" 
            align="center" 
            color="textSecondary"
            sx={{ mb: 3 }}
          >
            Choose how you'd like to reset your password
          </Typography>

          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            centered
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="📱 WhatsApp/Mobile" />
            <Tab label="📧 Email" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {success}
            </Alert>
          )}

          <TabPanel value={tabValue} index={0}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              We'll send an OTP to your WhatsApp number
            </Typography>
            
            <TextField
              fullWidth
              label="Mobile Number"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              sx={{ mb: 3 }}
              helperText="Example: 9876543210"
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleWhatsAppReset}
              disabled={loading}
              sx={{
                backgroundColor: '#25d366',
                '&:hover': {
                  backgroundColor: '#20c25a',
                },
                py: 1.5,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                '📱 Send OTP via WhatsApp'
              )}
            </Button>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              We'll send a reset link to your email address
            </Typography>
            
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleEmailReset}
              disabled={loading}
              sx={{
                backgroundColor: '#1976d2',
                py: 1.5,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                '📧 Send Reset Link'
              )}
            </Button>
          </TabPanel>

          <Box textAlign="center" mt={3}>
            <Link 
              href="/auth/login" 
              variant="body2"
              sx={{ 
                color: '#667eea',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              ← Back to Login
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
