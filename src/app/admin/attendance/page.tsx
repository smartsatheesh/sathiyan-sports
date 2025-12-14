'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Refresh,
  Download,
  Visibility,
  AccessTime,
  People,
  TrendingUp,
  Warning,
  CheckCircle,
  ExitToApp,
  History
} from '@mui/icons-material';

interface AttendanceStats {
  date: string;
  dailyStats: {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    totalDuration: number;
    averageDuration: number;
    autoLogouts: number;
  };
  activeUsers: Array<{
    champId: string;
    loginTime: string;
    duration: number;
    sessionId: string;
  }>;
  recentActivity: Array<{
    champId: string;
    action: 'login' | 'logout';
    time: string;
    duration?: number;
    isAutoLogout?: boolean;
  }>;
  weeklyStats: Array<{
    _id: string;
    totalSessions: number;
    completedSessions: number;
    totalDuration: number;
    uniqueUserCount: number;
  }>;
  hourlyDistribution: Array<{
    _id: number;
    count: number;
  }>;
  summary: {
    currentlyActive: number;
    totalToday: number;
    averageSessionTime: number;
    totalTimeToday: number;
  };
}

interface AttendanceRecord {
  _id: string;
  champId: string;
  loginTime: string;
  logoutTime?: string;
  duration?: number;
  status: 'active' | 'completed';
  isAutoLogout?: boolean;
  date: string;
}

export default function AdminAttendancePage() {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterChampId, setFilterChampId] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userHistory, setUserHistory] = useState<AttendanceRecord[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/attendance/stats?date=${selectedDate}`);
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        limit: '100'
      });
      
      if (filterChampId) {
        params.append('champId', filterChampId);
      }
      
      const response = await fetch(`/api/attendance?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setRecords(result.data);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  const fetchUserHistory = async (champId: string) => {
    try {
      const response = await fetch(`/api/attendance?champId=${champId}&limit=30`);
      const result = await response.json();
      
      if (result.success) {
        setUserHistory(result.data);
        setSelectedUser(champId);
        setViewDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching user history:', error);
    }
  };

  const handleAutoLogout = async () => {
    try {
      const response = await fetch('/api/attendance/auto-logout', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        await refreshData();
      }
    } catch (error) {
      console.error('Error processing auto-logout:', error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchRecords()]);
    setLoading(false);
  };

  const exportData = () => {
    const csvContent = [
      ['ChampID', 'Login Time', 'Logout Time', 'Duration (minutes)', 'Status', 'Date', 'Auto Logout'],
      ...records.map(record => [
        record.champId,
        new Date(record.loginTime).toLocaleString(),
        record.logoutTime ? new Date(record.logoutTime).toLocaleString() : '-',
        record.duration || '-',
        record.status,
        record.date,
        record.isAutoLogout ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  useEffect(() => {
    refreshData();
  }, [selectedDate, filterChampId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStats();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedDate]);

  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Attendance Management
        </Typography>
        
        <Grid container spacing={2} alignItems="center" mb={3}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              label="Filter by ChampID"
              value={filterChampId}
              onChange={(e) => setFilterChampId(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={refreshData}
                disabled={loading}
              >
                Refresh
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={exportData}
              >
                Export CSV
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Warning />}
                onClick={handleAutoLogout}
                color="warning"
              >
                Auto Logout
              </Button>
              
              <Button
                variant={autoRefresh ? "contained" : "outlined"}
                onClick={() => setAutoRefresh(!autoRefresh)}
                size="small"
              >
                Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {stats && (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <People sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Currently Active
                      </Typography>
                      <Typography variant="h4">
                        {stats.summary.currentlyActive}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Total Sessions Today
                      </Typography>
                      <Typography variant="h4">
                        {stats.summary.totalToday}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <AccessTime sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Avg Session Time
                      </Typography>
                      <Typography variant="h4">
                        {formatDuration(stats.summary.averageSessionTime)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Total Time Today
                      </Typography>
                      <Typography variant="h4">
                        {formatDuration(stats.summary.totalTimeToday)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3} mb={4}>
            {/* Currently Active Users */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Currently Active ({stats.activeUsers.length})
                </Typography>
                
                {stats.activeUsers.length > 0 ? (
                  <Box>
                    {stats.activeUsers.map((user, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle2">
                                {user.champId}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                In for {formatDuration(user.duration)}
                              </Typography>
                            </Box>
                            <Chip 
                              label={formatTime(user.loginTime)} 
                              size="small" 
                              color="success"
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">No users currently active</Alert>
                )}
              </Paper>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                
                {stats.recentActivity.length > 0 ? (
                  <Box>
                    {stats.recentActivity.slice(0, 10).map((activity, index) => (
                      <Box key={index} display="flex" alignItems="center" py={0.5}>
                        {activity.action === 'login' ? (
                          <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        ) : (
                          <ExitToApp sx={{ color: 'info.main', mr: 1, fontSize: 20 }} />
                        )}
                        
                        <Box flexGrow={1}>
                          <Typography variant="body2">
                            {activity.champId} {activity.action === 'login' ? 'checked in' : 'checked out'}
                            {activity.isAutoLogout && ' (auto)'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(activity.time)}
                            {activity.duration && ` • ${formatDuration(activity.duration)}`}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">No recent activity</Alert>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* Attendance Records Table */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Attendance Records ({records.length})
          </Typography>
          {loading && <CircularProgress size={24} />}
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ChampID</TableCell>
                <TableCell>Login Time</TableCell>
                <TableCell>Logout Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record._id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {record.champId}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatTime(record.loginTime)}</TableCell>
                  <TableCell>
                    {record.logoutTime ? (
                      <Box>
                        {formatTime(record.logoutTime)}
                        {record.isAutoLogout && (
                          <Chip label="Auto" size="small" color="warning" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    ) : (
                      <Chip label="Active" color="success" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {record.duration ? formatDuration(record.duration) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={record.status} 
                      color={record.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View History">
                      <IconButton
                        size="small"
                        onClick={() => fetchUserHistory(record.champId)}
                      >
                        <History />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* User History Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Attendance History - {selectedUser}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Login</TableCell>
                  <TableCell>Logout</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userHistory.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{formatTime(record.loginTime)}</TableCell>
                    <TableCell>
                      {record.logoutTime ? formatTime(record.logoutTime) : '-'}
                    </TableCell>
                    <TableCell>
                      {record.duration ? formatDuration(record.duration) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={record.status} 
                        size="small"
                        color={record.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}