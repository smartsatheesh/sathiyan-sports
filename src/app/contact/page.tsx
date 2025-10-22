"use client";

import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Alert,
  CircularProgress,
  Snackbar,
  Grid,
  Divider
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.mobile || !formData.message) {
      setAlert({
        open: true,
        message: 'Please fill in all required fields',
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

      const result = await response.json();

      if (response.ok) {
        setAlert({
          open: true,
          message: result.message || 'Message sent successfully! We will get back to you soon.',
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
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      setAlert({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{
          fontWeight: 800,
          color: "primary.main",
          mb: 4,
        }}
      >
        Get In Touch
      </Typography>
      
      <Box className="divonabout">
        <div className="about-page">
          <div className="about-container">
            <Grid container spacing={6} alignItems="flex-start">
          {/* Contact Form */}
          <Grid item xs={12} md={7}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                p: 4,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              noValidate
              autoComplete="off"
            >
              <Typography 
                variant="h5" 
                component="h2" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: '#2E7D32',
                  mb: 3
                }}
              >
                Send us a Message
              </Typography>

              <TextField
                label="Name"
                variant="outlined"
                fullWidth
                required
                value={formData.name}
                onChange={handleInputChange('name')}
                disabled={loading}
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Email"
                type="email"
                variant="outlined"
                fullWidth
                required
                value={formData.email}
                onChange={handleInputChange('email')}
                disabled={loading}
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Mobile"
                type="tel"
                variant="outlined"
                fullWidth
                required
                value={formData.mobile}
                onChange={handleInputChange('mobile')}
                disabled={loading}
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Message"
                multiline
                rows={4}
                variant="outlined"
                fullWidth
                required
                value={formData.message}
                onChange={handleInputChange('message')}
                disabled={loading}
                sx={{ mb: 3 }}
              />
              
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  background: 'linear-gradient(45deg, #2E7D32, #388E3C)',
                  py: 1.5,
                  fontWeight: 'bold',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1B5E20, #2E7D32)',
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Send Message"}
              </Button>
            </Box>
          </Grid>

          {/* WhatsApp QR Code Section */}
          <Grid item xs={12} md={5}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography 
                variant="h5" 
                component="h2" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: '#2E7D32',
                  mb: 3
                }}
              >
                Join Our WhatsApp Community
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  mb: 4,
                  color: 'text.secondary',
                  lineHeight: 1.6
                }}
              >
                Connect with fellow sports enthusiasts, get updates about events, 
                book slots, and stay informed about our latest offerings.
              </Typography>
              <Box
                component="a"
                href="https://chat.whatsapp.com/LosEvhkOJui4hrMUh4mUFV"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    transition: 'transform 0.3s ease'
                  }
                }}
              >
                <Box
                  sx={{
                    width: 200,
                    height: 200,
                    backgroundColor: 'white',
                    borderRadius: 3,
                    p: 2,
                    border: '3px solid #25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(37, 211, 102, 0.2)',
                  }}
                >
                  <img
                    src="/WhatsAppQR.jpeg"
                    alt="Join WhatsApp Community - Sathiyan Sports"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#25D366', 
                    mt: 2, 
                    display: 'block',
                    fontWeight: 'bold',
                    textAlign: 'center' 
                  }}
                >
                  📱 Scan with WhatsApp Camera
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Additional Contact Info */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: '#2E7D32',
                  mb: 2
                }}
              >
                Quick Contact
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                📞 +91 8811090194 / 9787020525
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ✉️ info@sathiyansports.com
              </Typography>
              <Typography variant="body2">
                📍 Perungudi, Madurai, Tamil Nadu
              </Typography>
            </Box>
          </Grid>
        </Grid>
          </div>
        </div>
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
