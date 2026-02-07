'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  QrCode,
  Download,
  Print,
  Place,
  Info
} from '@mui/icons-material';

export default function UniversalQRPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const generateUniversalQR = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/attendance/universal-qr');
      const data = await response.json();
      
      if (data.success) {
        setQrCodeUrl(data.data.qrCodeUrl);
      } else {
        setError('Failed to generate universal QR code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = 'sathiyan_sports_attendance_qr.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const printQRCode = () => {
    if (qrCodeUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Universal Attendance QR Code</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 40px; 
                  margin: 0;
                }
                .qr-container { 
                  border: 3px solid #1976d2; 
                  border-radius: 15px; 
                  padding: 40px; 
                  display: inline-block; 
                  background: #f5f5f5;
                  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                img { 
                  width: 400px; 
                  height: 400px;
                  margin: 20px 0;
                }
                h1 { 
                  color: #1976d2; 
                  margin-bottom: 20px;
                  font-size: 36px;
                }
                h2 {
                  color: #333;
                  margin: 15px 0;
                  font-size: 24px;
                }
                p { 
                  color: #666; 
                  font-size: 18px;
                  margin: 10px 0;
                }
                .instructions {
                  background: #e3f2fd;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                  border-left: 4px solid #1976d2;
                }
                .footer {
                  margin-top: 30px;
                  font-size: 14px;
                  color: #999;
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <h1>🏓 Sathiyan Sports</h1>
                <h2>Attendance QR Code</h2>
                <img src="${qrCodeUrl}" alt="Universal Attendance QR Code" />
                <div class="instructions">
                  <p><strong>📱 How to Mark Attendance:</strong></p>
                  <p>1. Scan this QR code with your phone camera</p>
                  <p>2. Enter your ChampID when prompted</p>
                  <p>3. Your attendance will be marked automatically</p>
                </div>
                <p><strong>📍 Post this QR code at the turf entrance</strong></p>
                <div class="footer">
                  <p>Generated on ${new Date().toLocaleDateString('en-GB')}</p>
                  <p>For support, contact admin</p>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  useEffect(() => {
    generateUniversalQR();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            <Place sx={{ mr: 2, verticalAlign: 'middle', fontSize: 40 }} />
            Universal Attendance QR Code
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate a single QR code to post at your turf entrance
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box textAlign="center" py={4}>
            <CircularProgress size={60} />
            <Typography variant="body1" mt={2}>
              Generating universal QR code...
            </Typography>
          </Box>
        ) : qrCodeUrl ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <QrCode />
                Universal Attendance QR Code
              </Typography>
              
              <Box sx={{ my: 3 }}>
                <img 
                  src={qrCodeUrl} 
                  alt="Universal Attendance QR Code"
                  style={{ 
                    width: '300px', 
                    height: '300px',
                    border: '2px solid #ddd',
                    borderRadius: '8px'
                  }} 
                />
              </Box>
              
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  <Info sx={{ verticalAlign: 'middle', mr: 1 }} />
                  How it works:
                </Typography>
                <Typography variant="body2">
                  • Post this QR code at your turf entrance<br/>
                  • Anyone can scan it to mark attendance<br/>
                  • Users will be prompted to enter their ChampID<br/>
                  • Attendance is tracked automatically with login/logout
                </Typography>
              </Alert>
              
              <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<Print />}
                  onClick={printQRCode}
                  size="large"
                >
                  Print QR Code
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={downloadQRCode}
                  size="large"
                >
                  Download Image
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={generateUniversalQR}
                  size="large"
                >
                  Regenerate
                </Button>
              </Box>
              
              <Typography variant="body2" color="text.secondary" mt={3}>
                <strong>Tip:</strong> Print this in A4 size and laminate for weather protection
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box textAlign="center">
            <Typography variant="body1" color="text.secondary">
              Unable to generate QR code. Please try again.
            </Typography>
            <Button 
              variant="contained" 
              onClick={generateUniversalQR}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Box>
        )}

        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Setup Instructions:
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            1. <strong>Print the QR code</strong> - Use the print button above for best quality
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            2. <strong>Post at entrance</strong> - Place where everyone entering can see it
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            3. <strong>Add instructions</strong> - Consider adding a sign explaining the process
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            4. <strong>Weather protection</strong> - Laminate for outdoor use
          </Typography>
          
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>All set!</strong> Anyone can now scan this code and enter their ChampID to mark attendance.
              Monitor attendance in real-time from the admin dashboard.
            </Typography>
          </Alert>
        </Box>
      </Paper>
    </Container>
  );
}