'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Stepper, 
  Step, 
  StepLabel,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const steps = ['Enter Mobile', 'Verify OTP', 'Reset Password'];

export default function ForgotPasswordPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();

  const validateMobile = (phone: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSendOTP = async () => {
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
        setSuccess('OTP sent to your WhatsApp number');
        setActiveStep(1);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile, otp }),
      });

      const data = await response.json();

      if (data.success) {
        setResetToken(data.resetToken); // Store the reset token
        setSuccess('OTP verified successfully');
        setActiveStep(2);
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          resetToken, 
          mobile, 
          newPassword,
          confirmPassword 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
              Enter your registered mobile number to receive OTP via WhatsApp
            </Typography>
            <TextField
              fullWidth
              label="Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile number"
              variant="outlined"
              sx={{ mb: 3 }}
              inputProps={{ maxLength: 10 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleSendOTP}
              disabled={loading || !validateMobile(mobile)}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Send OTP'}
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
              Enter the 6-digit OTP sent to your WhatsApp
            </Typography>
            <TextField
              fullWidth
              label="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              variant="outlined"
              sx={{ mb: 3 }}
              inputProps={{ maxLength: 6 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              sx={{ py: 1.5, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setActiveStep(0)}
              disabled={loading}
            >
              Back
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
              Create your new password
            </Typography>
            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              variant="outlined"
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleResetPassword}
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Reset Password'}
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom textAlign="center">
            Reset Password
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {renderStepContent()}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link 
              href="/auth/login" 
              underline="hover"
              sx={{ fontSize: '0.9rem' }}
            >
              Remember your password? Sign In
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
