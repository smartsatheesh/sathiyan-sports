'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  QrCode,
  Download,
  Print,
  Search,
  SelectAll
} from '@mui/icons-material';

interface User {
  _id: string;
  name: string;
  champId: string;
  email: string;
  phone: string;
}

interface QRCodeData {
  champId: string;
  name: string;
  qrCodeUrl: string;
}

export default function QRGeneratorPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (data.success) {
        // Filter users who have champId
        const usersWithChampId = data.users.filter((user: User) => user.champId);
        setUsers(usersWithChampId);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (champId: string, name: string) => {
    try {
      const response = await fetch(`/api/attendance/qr?champId=${champId}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          champId,
          name,
          qrCodeUrl: data.data.qrCodeUrl
        };
      }
      return null;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  };

  const generateSelectedQRCodes = async () => {
    if (selectedUsers.size === 0) return;
    
    setGenerating(true);
    const codes: QRCodeData[] = [];
    
    for (const userId of selectedUsers) {
      const user = users.find(u => u._id === userId);
      if (user) {
        const qrData = await generateQRCode(user.champId, user.name);
        if (qrData) {
          codes.push(qrData);
        }
      }
    }
    
    setQrCodes(codes);
    setGenerating(false);
  };

  const generateAllQRCodes = async () => {
    setGenerating(true);
    const codes: QRCodeData[] = [];
    
    for (const user of filteredUsers) {
      const qrData = await generateQRCode(user.champId, user.name);
      if (qrData) {
        codes.push(qrData);
      }
    }
    
    setQrCodes(codes);
    setGenerating(false);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u._id)));
    }
  };

  const printAllQRCodes = () => {
    if (qrCodes.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrCodesHTML = qrCodes.map(qr => `
        <div class="qr-card">
          <h3>${qr.name}</h3>
          <p><strong>ChampID:</strong> ${qr.champId}</p>
          <img src="${qr.qrCodeUrl}" alt="QR Code for ${qr.champId}" />
          <p class="instruction">Scan for attendance</p>
        </div>
      `).join('');
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Attendance QR Codes</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
              }
              .qr-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 20px;
              }
              .qr-card {
                border: 2px solid #333;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .qr-card h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 18px;
              }
              .qr-card p {
                margin: 5px 0;
                color: #666;
                font-size: 14px;
              }
              .qr-card img {
                width: 200px;
                height: 200px;
                margin: 10px 0;
              }
              .instruction {
                font-size: 12px !important;
                font-style: italic;
              }
              h1 {
                text-align: center;
                margin-bottom: 30px;
                color: #333;
              }
              @media print {
                .qr-grid {
                  grid-template-columns: repeat(2, 1fr);
                }
                .qr-card {
                  margin-bottom: 20px;
                }
              }
            </style>
          </head>
          <body>
            <h1>Attendance QR Codes - ${new Date().toLocaleDateString('en-GB')}</h1>
            <div class="qr-grid">
              ${qrCodesHTML}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const downloadQRCodes = () => {
    // Create a zip file would be ideal, but for simplicity, we'll download individual images
    qrCodes.forEach((qr, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = qr.qrCodeUrl;
        link.download = `${qr.champId}_${qr.name.replace(/\s+/g, '_')}_QR.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // Delay downloads to avoid browser blocking
    });
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.champId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        <QrCode sx={{ mr: 2, verticalAlign: 'middle' }} />
        QR Code Generator
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Generate and print attendance QR codes for users
      </Typography>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<SelectAll />}
                onClick={selectAllUsers}
              >
                {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
              </Button>
              
              <Button
                variant="contained"
                onClick={generateSelectedQRCodes}
                disabled={generating || selectedUsers.size === 0}
              >
                {generating ? 'Generating...' : `Generate QR Codes (${selectedUsers.size})`}
              </Button>
              
              <Button
                variant="outlined"
                onClick={generateAllQRCodes}
                disabled={generating}
              >
                Generate All QR Codes
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* User Selection */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Users ({filteredUsers.length})
        </Typography>
        
        <Grid container spacing={2}>
          {filteredUsers.map(user => (
            <Grid item xs={12} sm={6} md={4} key={user._id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: selectedUsers.has(user._id) ? '2px solid primary.main' : '1px solid divider',
                  bgcolor: selectedUsers.has(user._id) ? 'primary.light' : 'background.paper'
                }}
                onClick={() => toggleUserSelection(user._id)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2">
                        {user.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.champId}
                      </Typography>
                    </Box>
                    {selectedUsers.has(user._id) && (
                      <Chip label="Selected" color="primary" size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Generated QR Codes */}
      {qrCodes.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Generated QR Codes ({qrCodes.length})
            </Typography>
            
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={printAllQRCodes}
              >
                Print All
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={downloadQRCodes}
              >
                Download All
              </Button>
            </Box>
          </Box>
          
          <Grid container spacing={3}>
            {qrCodes.map(qr => (
              <Grid item xs={12} sm={6} md={4} key={qr.champId}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {qr.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {qr.champId}
                    </Typography>
                    
                    <img 
                      src={qr.qrCodeUrl}
                      alt={`QR Code for ${qr.champId}`}
                      style={{ 
                        width: '150px', 
                        height: '150px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        margin: '8px 0'
                      }}
                    />
                    
                    <Typography variant="caption" display="block" color="text.secondary">
                      Scan for attendance
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {generating && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Box display="flex" alignItems="center">
            <CircularProgress size={20} sx={{ mr: 2 }} />
            Generating QR codes... This may take a moment.
          </Box>
        </Alert>
      )}
    </Container>
  );
}