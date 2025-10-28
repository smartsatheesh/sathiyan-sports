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
    password: '',
    champId: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const [error, setError] = useState('');
  const [userOptions, setUserOptions] = useState<Array<{champId: string, name: string, hasPassword: boolean}>>([]);
  const [showUserSelection, setShowUserSelection] = useState(false);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      console.log('Attempting login with:', { 
        mobile: formData.mobile, 
        champId: formData.champId,
        passwordLength: formData.password.length 
      });
      
      const result = await signIn('credentials', {
        mobile: formData.mobile,
        password: formData.password,
        champId: formData.champId || '',
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        console.error('Login error:', result.error);
        
        // Check if error indicates multiple users
        if (result.error.startsWith('MULTIPLE_USERS:')) {
          const userOptionsStr = result.error.replace('MULTIPLE_USERS:', '');
          try {
            const options = JSON.parse(userOptionsStr);
            setUserOptions(options);
            setShowUserSelection(true);
            setError('Multiple accounts found with this mobile number. Please select your account below:');
          } catch (parseError) {
            console.error('Error parsing user options:', parseError);
            setError('Multiple accounts found. Please contact support.');
          }
        } else {
          setError(result.error);
        }
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

  const handleUserSelection = (champId: string) => {
    setFormData(prev => ({ ...prev, champId }));
    setShowUserSelection(false);
    setError('');
    // Automatically retry login with selected user
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
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
    <Box className="login-container">
      <Container maxWidth="sm">
        <Paper 
          elevation={24} 
          className="login-paper"
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <LoginIcon className="login-icon" />
            <Typography 
              variant="h4" 
              gutterBottom 
              className="login-title"
            >
              Welcome Back
            </Typography>
            <Typography 
              variant="body1" 
              className="login-subtitle"
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

          {/* User Selection for Multiple Users */}
          {showUserSelection && userOptions.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Your Account
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Multiple accounts found with this mobile number. Please select your account:
              </Typography>
              <Grid container spacing={2}>
                {userOptions.map((user, index) => (
                  <Grid item xs={12} key={user.champId}>
                    <Card 
                      sx={{ 
                        cursor: user.hasPassword ? 'pointer' : 'not-allowed',
                        opacity: user.hasPassword ? 1 : 0.6,
                        border: '1px solid',
                        borderColor: user.hasPassword ? 'primary.main' : 'grey.300',
                        '&:hover': {
                          borderColor: user.hasPassword ? 'primary.dark' : 'grey.300',
                          boxShadow: user.hasPassword ? 2 : 0
                        }
                      }}
                      onClick={() => user.hasPassword && handleUserSelection(user.champId)}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {user.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ChampID: {user.champId}
                            </Typography>
                          </Box>
                          {!user.hasPassword && (
                            <Typography variant="caption" color="error">
                              Social Login Only
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Button
                variant="text"
                onClick={() => {
                  setShowUserSelection(false);
                  setUserOptions([]);
                  setFormData(prev => ({ ...prev, champId: '' }));
                }}
                sx={{ mt: 2 }}
              >
                Back to Login
              </Button>
            </Box>
          )}

          {/* Social Login Buttons */}
          {!showUserSelection && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Google />}
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoading !== ''}
                className="login-social-button"
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
                className="login-social-button"
              >
                {socialLoading === 'facebook' ? (
                  <CircularProgress size={20} />
                ) : (
                  'Facebook'
                )}
              </Button>
            </Grid>
          </Grid>

          <Divider className="login-divider">
            <Typography 
              variant="body2" 
              className="login-divider-text"
            >
              OR
            </Typography>
          </Divider>

          {/* Credentials Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
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
              className="login-submit-button"
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>
            </>
          )}

          {/* Links */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link href="/register" passHref>
                <MuiLink 
                  component="span" 
                  className="login-link"
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
          <Card className="login-features-card">
            <CardContent sx={{ py: 2 }}>
              <Typography variant="subtitle2" gutterBottom className="login-features-title">
                🏆 What you get with login:
              </Typography>
              <Typography variant="body2" component="div" className="login-features-list">
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
