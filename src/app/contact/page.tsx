"use client";

import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Alert,
  CircularProgress,
  Snackbar
} from "@mui/material";
import { useState } from "react";

interface FormData {
  name: string;
  email: string;
  mobile: string;
  message: string;
}

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    mobile: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.mobile.trim() || !formData.message.trim()) {
      setAlert({
        open: true,
        message: 'Please fill in all fields',
        severity: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setAlert({
          open: true,
          message: data.message,
          severity: 'success'
        });
        // Reset form
        setFormData({
          name: '',
          email: '',
          mobile: '',
          message: ''
        });
      } else {
        setAlert({
          open: true,
          message: data.message || 'Failed to send message',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setAlert({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <Container maxWidth="sm">
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
        noValidate
        autoComplete="off"
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Contact Us
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Have a question or need assistance? We'd love to hear from you!
        </Typography>

        <TextField 
          label="Name" 
          variant="outlined" 
          fullWidth 
          required 
          value={formData.name}
          onChange={handleInputChange('name')}
          disabled={loading}
          />
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          required
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          disabled={loading}
        />
        <TextField
          label="Mobile Number"
          variant="outlined"
          fullWidth
          required
          type="tel"
          value={formData.mobile}
          onChange={handleInputChange('mobile')}
          disabled={loading}
          placeholder="Enter your mobile number"
        />
        <TextField
          label="Message"
          variant="outlined"
          fullWidth
          required
          multiline
          rows={4}
          value={formData.message}
          onChange={handleInputChange('message')}
          disabled={loading}
          placeholder="Tell us how we can help you..."
        />

        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          type="submit"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{ mt: 2 }}
        >
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </Box>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
