"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google,
  Facebook,
  Phone,
  Lock,
  Login as LoginIcon
} from '@mui/icons-material';
import Link from 'next/link';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    mobile: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push(callbackUrl);
      }
    };
    checkSession();
  }, [callbackUrl, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.mobile || !formData.password) {
      setError('Please enter both mobile number and password');
      return;
    }

    // Validate mobile number format (basic validation)
    const mobileRegex = /^[+]?[1-9]?[0-9]{7,15}$/;
    if (!mobileRegex.test(formData.mobile.replace(/\s/g, ''))) {
      setError('Please enter a valid mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', { mobile: formData.mobile, passwordLength: formData.password.length });
      
      const result = await signIn('credentials', {
        mobile: formData.mobile,
        password: formData.password,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        console.error('Login error:', result.error);
        setError(result.error);
      } else if (result?.ok) {
        console.log('Login successful, redirecting to:', callbackUrl);
        router.push(callbackUrl);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login exception:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    setError('');

    try {
      await signIn(provider, {
        callbackUrl: callbackUrl,
      });
    } catch (error) {
      setError(`${provider} login failed. Please try again.`);
      setSocialLoading('');
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: '#f5f5f5',
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
            background: 'white',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <LoginIcon 
              sx={{ 
                fontSize: 48, 
                color: 'primary.main', 
                mb: 2,
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                borderRadius: '50%',
                p: 1
              }} 
            />
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold',
                color: 'text.primary'
              }}
            >
              Welcome Back
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: 'text.secondary'
              }}
            >
              Sign in to access Sathiyan Sports Club
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          {/* Social Login Buttons */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Google />}
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoading !== ''}
                sx={{ 
                  py: 1.5,
                  borderColor: '#db4437',
                  color: '#db4437',
                  '&:hover': {
                    borderColor: '#db4437',
                    backgroundColor: 'rgba(219, 68, 55, 0.1)'
                  }
                }}
              >
                {socialLoading === 'google' ? (
                  <CircularProgress size={20} />
                ) : (
                  'Google'
                )}
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Facebook />}
                onClick={() => handleSocialLogin('facebook')}
                disabled={socialLoading !== ''}
                sx={{ 
                  py: 1.5,
                  borderColor: '#3b5998',
                  color: '#3b5998',
                  '&:hover': {
                    borderColor: '#3b5998',
                    backgroundColor: 'rgba(59, 89, 152, 0.1)'
                  }
                }}
              >
                {socialLoading === 'facebook' ? (
                  <CircularProgress size={20} />
                ) : (
                  'Facebook'
                )}
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3, borderColor: 'rgba(0, 0, 0, 0.12)' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500 
              }}
            >
              OR
            </Typography>
          </Divider>

          {/* Credentials Login Form */}
          <Box component="form" onSubmit={handleCredentialsLogin}>
            <TextField
              fullWidth
              label="Mobile Number"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone color="primary" />
                  </InputAdornment>
                ),
              }}
              placeholder="Enter your mobile number"
              helperText="Use the mobile number you registered with"
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="primary" />
                  </InputAdornment>
                ),
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
              placeholder="Enter your password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ 
                mt: 3, 
                mb: 2, 
                py: 1.5,
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a67d8, #6b46c1)',
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          {/* Links */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link href="/register" passHref>
                <MuiLink 
                  component="span" 
                  sx={{ 
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Register here
                </MuiLink>
              </Link>
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <Link href="/auth/forgot-password" passHref>
                <MuiLink 
                  component="span" 
                  sx={{ 
                    color: 'text.secondary',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Forgot Password?
                </MuiLink>
              </Link>
            </Typography>
          </Box>

          {/* Features Info */}
          <Card sx={{ mt: 4, bgcolor: 'rgba(102, 126, 234, 0.1)' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="primary.main" fontWeight="bold">
                🏆 What you get with login:
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                • Book sports slots and facilities<br/>
                • Access S3 Fitness Plans<br/>
                • Track your bookings and progress<br/>
                • Get exclusive member benefits
              </Typography>
            </CardContent>
          </Card>
        </Paper>
      </Container>
    </Box>
  );
}
