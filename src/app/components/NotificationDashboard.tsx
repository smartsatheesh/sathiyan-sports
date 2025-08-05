"use client";
import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';

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
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function NotificationDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  
  // Test form state
  const [testUser, setTestUser] = useState({
    name: 'Test User',
    phone: '+919876543210',
    email: 'test@example.com',
    preferences: {
      sms: true,
      push: false,
      whatsapp: true,
    },
  });

  const [testResults, setTestResults] = useState<any>(null);

  const handleTestNotification = async (testType: string) => {
    setLoading(true);
    setAlert(null);

    try {
      const response = await fetch('/api/test-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType,
          user: testUser,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlert({ type: 'success', message: `Test notification "${testType}" sent successfully!` });
        setTestResults(data);
      } else {
        setAlert({ type: 'error', message: data.error || 'Failed to send test notification' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error: Failed to send test notification' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        📱 Notification Dashboard
      </Typography>
      
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      <Paper elevation={3}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="🧪 Test Notifications" />
          <Tab label="📊 Analytics" />
          <Tab label="⚙️ Configuration" />
        </Tabs>

        {/* Test Notifications Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Test User Configuration */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Test User Configuration
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Name"
                    value={testUser.name}
                    onChange={(e) => setTestUser({ ...testUser, name: e.target.value })}
                    margin="normal"
                  />
                  
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={testUser.phone}
                    onChange={(e) => setTestUser({ ...testUser, phone: e.target.value })}
                    margin="normal"
                    helperText="Include country code (e.g., +919876543210)"
                  />
                  
                  <TextField
                    fullWidth
                    label="Email"
                    value={testUser.email}
                    onChange={(e) => setTestUser({ ...testUser, email: e.target.value })}
                    margin="normal"
                  />

                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Notification Preferences:
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={testUser.preferences.sms}
                        onChange={(e) => setTestUser({
                          ...testUser,
                          preferences: { ...testUser.preferences, sms: e.target.checked }
                        })}
                      />
                    }
                    label="📱 SMS Notifications"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={testUser.preferences.push}
                        onChange={(e) => setTestUser({
                          ...testUser,
                          preferences: { ...testUser.preferences, push: e.target.checked }
                        })}
                      />
                    }
                    label="🔔 Push Notifications"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={testUser.preferences.whatsapp}
                        onChange={(e) => setTestUser({
                          ...testUser,
                          preferences: { ...testUser.preferences, whatsapp: e.target.checked }
                        })}
                      />
                    }
                    label="💬 WhatsApp Notifications"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Test Actions */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Test Notification Types
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleTestNotification('booking_confirmation')}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      🎾 Test Booking Confirmation
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => handleTestNotification('payment_reminder')}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      ⏰ Test Payment Reminder
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleTestNotification('payment_success')}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      ✅ Test Payment Success
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleTestNotification('booking_cancellation')}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      ❌ Test Booking Cancellation
                    </Button>
                    
                    <Divider />
                    
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleTestNotification('all')}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      🚀 Test All Notifications
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Test Results */}
            {testResults && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📋 Test Results
                    </Typography>
                    
                    <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto' }}>
                        {JSON.stringify(testResults, null, 2)}
                      </pre>
                    </Paper>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    📱 SMS Statistics
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    --
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Coming soon: SMS delivery analytics
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success.main">
                    💬 WhatsApp Statistics
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    --
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Coming soon: WhatsApp delivery analytics
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="warning.main">
                    🔔 Push Statistics
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    --
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Coming soon: Push notification analytics
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Configuration Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Configuration is managed through environment variables. 
                See the <strong>NOTIFICATION_SETUP.md</strong> file for detailed setup instructions.
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📱 SMS Service (Twilio)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Not Configured'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Required variables:
                  </Typography>
                  <ul style={{ fontSize: '14px', margin: '8px 0' }}>
                    <li>TWILIO_ACCOUNT_SID</li>
                    <li>TWILIO_AUTH_TOKEN</li>
                    <li>TWILIO_PHONE_NUMBER</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    💬 WhatsApp Business API
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {process.env.WHATSAPP_ACCESS_TOKEN ? '✅ Configured' : '❌ Not Configured'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Required variables:
                  </Typography>
                  <ul style={{ fontSize: '14px', margin: '8px 0' }}>
                    <li>WHATSAPP_ACCESS_TOKEN</li>
                    <li>WHATSAPP_PHONE_NUMBER_ID</li>
                    <li>WHATSAPP_VERIFY_TOKEN</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔔 Firebase Push Notifications
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {process.env.FIREBASE_PROJECT_ID ? '✅ Configured' : '❌ Not Configured'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Required variables:
                  </Typography>
                  <ul style={{ fontSize: '14px', margin: '8px 0' }}>
                    <li>FIREBASE_PROJECT_ID</li>
                    <li>FIREBASE_CLIENT_EMAIL</li>
                    <li>FIREBASE_PRIVATE_KEY</li>
                    <li>VAPID_PUBLIC_KEY</li>
                    <li>VAPID_PRIVATE_KEY</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Container>
  );
}
