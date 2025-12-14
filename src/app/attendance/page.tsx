'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Alert, 
  CircularProgress, 
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  QrCodeScanner, 
  CheckCircle, 
  ExitToApp, 
  AccessTime,
  Person,
  Login,
  SportsCricket,
  Today
} from '@mui/icons-material';

interface ScanResult {
  success: boolean;
  action: 'login' | 'logout' | 'universal_scan' | 'already_present' | 'duplicate_not_allowed';
  message: string;
  requiresChampId?: boolean;
  data?: {
    champId: string;
    name: string;
    mobile?: string;
    loginTime?: string;
    logoutTime?: string;
    duration?: number;
    sessionId: string;
    canAttendMultiple?: boolean;
    lastAttendanceDate?: string;
  };
}

interface UserProfile {
  champId?: string;
  name: string;
  mobile: string;
  email: string;
  flexibleAttendance?: boolean;
}

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showChampIdInput, setShowChampIdInput] = useState(false);
  const [champIdInput, setChampIdInput] = useState('');
  const [mobileInput, setMobileInput] = useState('');
  const [showMobileInput, setShowMobileInput] = useState(false);
  const [showChampIdSelection, setShowChampIdSelection] = useState(false);
  const [availableChampIds, setAvailableChampIds] = useState<any[]>([]);
  const [selectedChampId, setSelectedChampId] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check user session and load profile
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      loadUserProfile();
      checkTodayAttendance();
    }
  }, [session, status]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        if (profile.champId) {
          setChampIdInput(profile.champId);
        }
        if (profile.mobile) {
          setMobileInput(profile.mobile);
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        if (data.attendance && data.attendance.length > 0) {
          setTodayAttendance(data.attendance[0]);
        }
      }
    } catch (error) {
      console.error('Failed to check today attendance:', error);
    }
  };

  const handleQuickAttendance = async () => {
    if (!userProfile?.champId) {
      setError('ChampID not found in profile. Please update your profile.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          champId: userProfile.champId,
          mobile: userProfile.mobile,
          quickAttendance: true
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setScanResult(result);
        checkTodayAttendance(); // Refresh today's attendance
      } else {
        setError(result.message || 'Failed to mark attendance');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      setError('');
      setIsScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setError('Unable to access camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualEntry = async () => {
    if (status === 'unauthenticated') {
      setShowLoginDialog(true);
      return;
    }
    setShowMobileInput(true);
  };

  const handleUniversalQRScan = (qrData: string) => {
    // Handle universal QR code detection
    if (qrData === 'SATHIYAN_SPORTS_ATTENDANCE') {
      if (status === 'authenticated' && userProfile?.champId) {
        // If user is logged in, try quick attendance
        handleQuickAttendance();
      } else {
        // Show mobile number input form
        setShowMobileInput(true);
        stopScanner();
      }
      return;
    }
    
    // Handle individual ChampID QR codes
    processAttendance(qrData);
  };

  const handleMobileSubmit = async () => {
    if (!mobileInput.trim()) {
      setError('Please enter your mobile number');
      return;
    }

    setLoading(true);
    try {
      // Check if mobile number exists and get associated ChampIDs
      const response = await fetch('/api/attendance/check-mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile: mobileInput.trim() }),
      });

      const result = await response.json();
      
      if (result.success) {
        if (result.users.length === 1) {
          // Single user found - proceed with attendance
          setSelectedChampId(result.users[0].champId);
          await processAttendance(result.users[0].champId, mobileInput.trim());
        } else if (result.users.length > 1) {
          // Multiple users with same mobile - show selection
          setAvailableChampIds(result.users);
          setShowMobileInput(false);
          setShowChampIdSelection(true);
        } else {
          setError('No user found with this mobile number. Please register first.');
        }
      } else {
        setError(result.message || 'Mobile number not found');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChampIdSelection = async () => {
    if (!selectedChampId) {
      setError('Please select a ChampID');
      return;
    }

    setShowChampIdSelection(false);
    await processAttendance(selectedChampId, mobileInput.trim());
  };

  const handleChampIdSubmit = async () => {
    if (!champIdInput.trim()) {
      setError('Please enter your ChampID');
      return;
    }
    
    if (!mobileInput.trim()) {
      setError('Please enter your mobile number');
      return;
    }
    
    setShowChampIdInput(false);
    await processAttendance(champIdInput.trim(), mobileInput.trim());
    setChampIdInput('');
    setMobileInput('');
  };

  const processAttendance = async (champIdOrQrData: string, mobile?: string) => {
    setLoading(true);
    setError('');
    
    try {
      const requestBody: any = {};
      
      // Check if this is QR data or ChampID
      if (champIdOrQrData === 'SATHIYAN_SPORTS_ATTENDANCE') {
        requestBody.qrData = champIdOrQrData;
      } else {
        requestBody.champId = champIdOrQrData;
        if (mobile) {
          requestBody.mobile = mobile;
        }
      }
      
      const response = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (result.action === 'universal_scan' && result.requiresChampId) {
          setShowChampIdInput(true);
          stopScanner();
          return;
        }
        setScanResult(result);
        stopScanner();
        checkTodayAttendance(); // Refresh today's attendance
      } else {
        setError(result.message || 'Failed to process attendance');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // QR Code detection logic (simplified - in production you'd use a proper QR library)
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // In a real implementation, you'd use a QR code detection library here
    // For now, we'll simulate QR detection by looking for a pattern or using jsQR
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Here you would use jsQR or similar library to decode the QR code
      // const code = jsQR(imageData.data, imageData.width, imageData.height);
      // if (code) {
      //   handleUniversalQRScan(code.data);
      // }
    } catch (error) {
      console.log('QR detection error:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning && videoRef.current) {
      interval = setInterval(detectQRCode, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning]);

  const resetScan = () => {
    setScanResult(null);
    setError('');
    setShowChampIdInput(false);
    setShowMobileInput(false);
    setShowChampIdSelection(false);
    setChampIdInput('');
    setMobileInput('');
    setSelectedChampId('');
    setAvailableChampIds([]);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            <QrCodeScanner sx={{ mr: 2, verticalAlign: 'middle' }} />
            Attendance System
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Scan your QR code or enter mobile number to mark attendance
          </Typography>
        </Box>

        {/* Quick Attendance for Logged-in Users */}
        {status === 'authenticated' && userProfile && (
          <Card sx={{ mb: 3, bgcolor: 'primary.light', borderRadius: 2 }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Person sx={{ color: 'primary.dark', mr: 1 }} />
                    <Typography variant="h6" color="primary.dark">
                      Welcome, {userProfile.name}!
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    ChampID: {userProfile.champId || 'Not Set'} | Mobile: {userProfile.mobile}
                  </Typography>
                  {todayAttendance && (
                    <Box mt={1}>
                      <Chip 
                        icon={<Today />}
                        label={`Today's Attendance: ${formatTime(todayAttendance.loginTime)}`}
                        color="success"
                        size="small"
                      />
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} md={4} textAlign="center">
                  {userProfile.champId && (
                    <>
                      {!todayAttendance || userProfile.flexibleAttendance ? (
                        <Button
                          variant="contained"
                          size="large"
                          onClick={handleQuickAttendance}
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={20} /> : <SportsCricket />}
                          sx={{ minWidth: 160 }}
                        >
                          {loading ? 'Marking...' : 'Mark Attendance'}
                        </Button>
                      ) : (
                        <Box>
                          <Chip 
                            label="Already Marked Today" 
                            color="success" 
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption" display="block" color="text.secondary">
                            {!userProfile.flexibleAttendance && 'Contact admin for flexible attendance'}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                  {!userProfile.champId && (
                    <Button
                      variant="outlined"
                      onClick={() => router.push('/profile')}
                      color="warning"
                    >
                      Update ChampID
                    </Button>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Login prompt for unauthenticated users */}
        {status === 'unauthenticated' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>For easy attendance marking:</strong> Log in to your account
            </Typography>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<Login />}
              onClick={() => router.push('/auth/login')}
              sx={{ mt: 1 }}
            >
              Login
            </Button>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {scanResult && (
          <Card sx={{ mb: 3, bgcolor: scanResult.action === 'login' ? 'success.light' : 'info.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                {scanResult.action === 'login' ? (
                  <CheckCircle sx={{ color: 'success.dark', mr: 1 }} />
                ) : (
                  <ExitToApp sx={{ color: 'info.dark', mr: 1 }} />
                )}
                <Typography variant="h6" color={scanResult.action === 'login' ? 'success.dark' : 'info.dark'}>
                  {scanResult.action === 'login' ? 'Checked In' : 'Checked Out'}
                </Typography>
              </Box>
              
              <Typography variant="body1" sx={{ mb: 1 }}>
                {scanResult.message}
              </Typography>
              
              {scanResult.data && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    <Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    ChampID: {scanResult.data.champId}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    <AccessTime sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {scanResult.action === 'login' 
                      ? `Logged in at: ${formatTime(scanResult.data.loginTime!)}`
                      : `Session: ${formatTime(scanResult.data.loginTime!)} - ${formatTime(scanResult.data.logoutTime!)} (${formatDuration(scanResult.data.duration!)})`
                    }
                  </Typography>
                </Box>
              )}
              
              <Button 
                variant="contained" 
                onClick={resetScan} 
                sx={{ mt: 2 }}
                size="small"
              >
                Mark Another Attendance
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mobile Number Input Dialog */}
        {showMobileInput && (
          <Card sx={{ mb: 3, bgcolor: 'info.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person sx={{ color: 'info.dark' }} />
                Enter Your Mobile Number
              </Typography>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                QR code detected! Please enter your mobile number to mark attendance.
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <TextField
                    label="Mobile Number"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value.replace(/[^0-9]/g, ''))}
                    variant="outlined"
                    size="small"
                    fullWidth
                    autoFocus
                    disabled={loading}
                    helperText="Enter your registered mobile number (10 digits)"
                    inputProps={{ maxLength: 10, pattern: '[0-9]*' }}
                  />
                </Grid>
              </Grid>
              
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={resetScan}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleMobileSubmit}
                  disabled={!mobileInput.trim() || mobileInput.length !== 10 || loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                  {loading ? 'Checking...' : 'Find Account'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ChampID Selection Dialog (for multiple users with same mobile) */}
        {showChampIdSelection && (
          <Card sx={{ mb: 3, bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person sx={{ color: 'warning.dark' }} />
                Multiple Accounts Found
              </Typography>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                We found multiple accounts with mobile number {mobileInput}. Please select your account:
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {availableChampIds.map((user) => (
                  <Grid item xs={12} key={user.champId}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: selectedChampId === user.champId ? 'primary.light' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => setSelectedChampId(user.champId)}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <input
                            type="radio"
                            checked={selectedChampId === user.champId}
                            onChange={() => setSelectedChampId(user.champId)}
                            style={{ margin: 0 }}
                          />
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {user.champId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.name} • {user.champType || 'Member'}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={resetScan}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleChampIdSelection}
                  disabled={!selectedChampId || loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                  {loading ? 'Processing...' : 'Mark Attendance'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ChampID Input Dialog (backup for individual QR codes) */}
        {showChampIdInput && (
          <Card sx={{ mb: 3, bgcolor: 'info.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person sx={{ color: 'info.dark' }} />
                Enter Your Details
              </Typography>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                QR code detected! Please enter your ChampID and mobile number to mark attendance.
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="ChampID"
                    value={champIdInput}
                    onChange={(e) => setChampIdInput(e.target.value.toUpperCase())}
                    variant="outlined"
                    size="small"
                    fullWidth
                    autoFocus
                    disabled={loading}
                    helperText="Your unique Champion ID"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Mobile Number"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={loading}
                    helperText="Your registered mobile number"
                    inputProps={{ maxLength: 10 }}
                  />
                </Grid>
              </Grid>
              
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={resetScan}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleChampIdSubmit}
                  disabled={!champIdInput.trim() || !mobileInput.trim() || loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                  {loading ? 'Processing...' : 'Mark Attendance'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {!scanResult && !showChampIdInput && !showMobileInput && !showChampIdSelection && (
          <Box>
            {!isScanning ? (
              <Box textAlign="center" mb={4}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={startScanner}
                  sx={{ mb: 2, mr: 2 }}
                  startIcon={<QrCodeScanner />}
                >
                  Start QR Scanner
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleManualEntry}
                  sx={{ mb: 2 }}
                >
                  Enter Mobile Number
                </Button>
                
                <Typography variant="body2" color="text.secondary" mt={2}>
                  Scan QR code or enter your mobile number to mark attendance
                </Typography>
              </Box>
            ) : (
              <Box>
                <Box position="relative" mb={3}>
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      border: '2px solid #1976d2',
                      borderRadius: '8px'
                    }}
                    playsInline
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  
                  {loading && (
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      sx={{ transform: 'translate(-50%, -50%)' }}
                    >
                      <CircularProgress />
                    </Box>
                  )}
                </Box>
                
                <Box textAlign="center">
                  <Button
                    variant="outlined"
                    onClick={stopScanner}
                    sx={{ mr: 2 }}
                  >
                    Stop Scanner
                  </Button>
                  
                  <Button
                    variant="text"
                    onClick={handleManualEntry}
                  >
                    Enter ChampID Manually
                  </Button>
                </Box>
                
                <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
                  Position your QR code within the camera frame
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        <Box textAlign="center">
          <Typography variant="h6" gutterBottom>
            How it works:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            1. Scan your QR code or enter your mobile number<br/>
            2. If multiple accounts found, select your ChampID<br/>
            3. First scan marks your check-in time<br/>
            4. Second scan marks your check-out time<br/>
            5. Automatic logout after 1 hour if you forget to check out
          </Typography>
        </Box>
      </Paper>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)}>
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            To use the attendance system, please log in to your account first.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            After logging in, you can mark attendance with just one click using your saved profile.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLoginDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setShowLoginDialog(false);
              router.push('/auth/login');
            }}
            startIcon={<Login />}
          >
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}