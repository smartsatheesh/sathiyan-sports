'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  DialogActions,
  Checkbox,
  Tabs,
  Tab,
} from '@mui/material';
import { format } from 'date-fns';
import {
  Refresh,
  Download,
  AccessTime,
  People,
  TrendingUp,
  Warning,
  CheckCircle,
  ExitToApp,
  History,
  SaveOutlined
} from '@mui/icons-material';

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

interface Student {
  _id: string;
  champId: string;
  name: string;
  email: string;
  sport: string;
  timeSlot: string;
  isPresent: boolean;
  notes: string;
}

interface Filters {
  sports: string[];
  timeSlots: string[];
}

export default function AdminAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState<Filters>({ sports: [], timeSlots: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0 });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filterChampId, setFilterChampId] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userHistory, setUserHistory] = useState<AttendanceRecord[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin/attendance");
      return;
    }
    if (session.user?.role !== "admin" && session.user?.role !== "coach") {
      router.push("/");
    }
  }, [session, status, router]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedSport && { sport: selectedSport }),
        ...(selectedTimeSlot && { timeSlot: selectedTimeSlot }),
      });
      const response = await fetch(`/api/attendance/record?${params}`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.students || []);
        setFilters(data.filters || { sports: [], timeSlots: [] });
        setSelectAll(false);
        updateSummary(data.students || []);
        setMessage(`Loaded ${data.students?.length || 0} students`);
        setMessageType("info");
      } else {
        setMessage(data.error || "Failed to load students");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Error loading students");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const updateSummary = (studentList: Student[]) => {
    const total = studentList.length;
    const present = studentList.filter((s) => s.isPresent).length;
    setSummary({ total, present, absent: total - present });
  };

  const toggleStudent = (index: number) => {
    const updated = [...students];
    updated[index].isPresent = !updated[index].isPresent;
    setStudents(updated);
    updateSummary(updated);
  };

  const handleSelectAll = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    const updated = students.map((s) => ({ ...s, isPresent: newState }));
    setStudents(updated);
    updateSummary(updated);
  };

  const updateNotes = (index: number, notes: string) => {
    const updated = [...students];
    updated[index].notes = notes;
    setStudents(updated);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/attendance/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          attendanceRecords: students.map((s) => ({
            champId: s.champId,
            studentName: s.name,
            studentEmail: s.email,
            sport: s.sport,
            timeSlot: s.timeSlot,
            isPresent: s.isPresent,
            notes: s.notes,
          })),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ Attendance saved for ${data.count} students on ${selectedDate}`);
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to save attendance");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Error saving attendance");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (selectedDate && tabValue === 0) fetchStudents();
  }, [selectedDate, selectedSport, selectedTimeSlot, tabValue]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/attendance/stats?date=${selectedDate}`);
      const result = await response.json();
      if (result.success) setStats(result.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate, limit: '100' });
      if (filterChampId) params.append('champId', filterChampId);
      const response = await fetch(`/api/attendance?${params}`);
      const result = await response.json();
      if (result.success) setRecords(result.data);
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
      const response = await fetch('/api/attendance/auto-logout', { method: 'POST' });
      const result = await response.json();
      if (result.success) await Promise.all([fetchStats(), fetchRecords()]);
    } catch (error) {
      console.error('Error processing auto-logout:', error);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['ChampID', 'Login Time', 'Logout Time', 'Duration', 'Status', 'Date'],
      ...records.map((r) => [r.champId, new Date(r.loginTime).toLocaleString(), r.logoutTime ? new Date(r.logoutTime).toLocaleString() : '-', r.duration || '-', r.status, r.date])
    ].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString();
  const formatDuration = (m: number) => {
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
  };

  useEffect(() => {
    if (tabValue === 1 && selectedDate) {
      setStatsLoading(true);
      Promise.all([fetchStats(), fetchRecords()]).then(() => setStatsLoading(false));
    }
  }, [selectedDate, filterChampId, tabValue]);

  if (status === "loading") return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>📋 Attendance Management</Typography>
        <Typography variant="subtitle2" color="text.secondary">Role: {session?.user?.role} • {session?.user?.name}</Typography>
      </Box>

      {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}

      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label="📅 Bulk Mark Attendance" />
          <Tab label="📊 Attendance Stats" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Select Date & Filters</Typography>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth label="Date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sport</InputLabel>
                    <Select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)} label="Sport">
                      <MenuItem value="">All Sports</MenuItem>
                      {filters.sports.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Time Slot</InputLabel>
                    <Select value={selectedTimeSlot} onChange={(e) => setSelectedTimeSlot(e.target.value)} label="Time Slot">
                      <MenuItem value="">All Times</MenuItem>
                      {filters.timeSlots.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button variant="outlined" fullWidth onClick={fetchStudents} disabled={loading} startIcon={<Refresh />}>Reload</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {students.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}><Card><CardContent sx={{ textAlign: "center" }}><Typography color="textSecondary" variant="body2">Total Students</Typography><Typography variant="h4" sx={{ color: "primary.main" }}>{summary.total}</Typography></CardContent></Card></Grid>
              <Grid item xs={12} sm={4}><Card><CardContent sx={{ textAlign: "center" }}><Typography color="textSecondary" variant="body2">Present</Typography><Typography variant="h4" sx={{ color: "success.main" }}>{summary.present}</Typography></CardContent></Card></Grid>
              <Grid item xs={12} sm={4}><Card><CardContent sx={{ textAlign: "center" }}><Typography color="textSecondary" variant="body2">Absent</Typography><Typography variant="h4" sx={{ color: "error.main" }}>{summary.absent}</Typography></CardContent></Card></Grid>
            </Grid>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : students.length === 0 ? (
            <Alert severity="info">No students found for selected date and filters</Alert>
          ) : (
            <Paper sx={{ mb: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableRow><TableCell><Checkbox checked={selectAll} onChange={handleSelectAll} /></TableCell><TableCell>ChampID</TableCell><TableCell>Name</TableCell><TableCell>Sport</TableCell><TableCell>Time Slot</TableCell><TableCell>Status</TableCell><TableCell>Notes</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((s, i) => (
                      <TableRow key={s._id} sx={{ backgroundColor: s.isPresent ? "rgba(76, 175, 80, 0.05)" : "rgba(244, 67, 54, 0.05)" }}>
                        <TableCell><Checkbox checked={s.isPresent} onChange={() => toggleStudent(i)} /></TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{s.champId}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.sport}</TableCell>
                        <TableCell>{s.timeSlot}</TableCell>
                        <TableCell><Chip label={s.isPresent ? "Present" : "Absent"} color={s.isPresent ? "success" : "error"} size="small" /></TableCell>
                        <TableCell><TextField size="small" variant="outlined" value={s.notes} onChange={(e) => updateNotes(i, e.target.value)} placeholder="Add notes..." sx={{ maxWidth: "150px" }} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ p: 2, display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={() => setSelectAll(false)} disabled={summary.present === 0}>Clear All</Button>
                <Button variant="outlined" color="success" onClick={handleSelectAll} disabled={summary.present === summary.total}>Select All</Button>
                <Button variant="contained" color="success" onClick={saveAttendance} disabled={saving || students.length === 0} startIcon={<SaveOutlined />}>{saving ? "Saving..." : "Save Attendance"}</Button>
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Box mb={4}>
            <Grid container spacing={2} alignItems="center" mb={3}>
              <Grid item xs={12} md={3}><TextField label="Date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} fullWidth size="small" /></Grid>
              <Grid item xs={12} md={3}><TextField label="Filter by ChampID" value={filterChampId} onChange={(e) => setFilterChampId(e.target.value)} fullWidth size="small" /></Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" gap={1}>
                  <Button variant="contained" startIcon={<Refresh />} onClick={() => Promise.all([fetchStats(), fetchRecords()])} disabled={statsLoading}>Refresh</Button>
                  <Button variant="outlined" startIcon={<Download />} onClick={exportData}>Export CSV</Button>
                  <Button variant="outlined" startIcon={<Warning />} onClick={handleAutoLogout} color="warning">Auto Logout</Button>
                  <Button variant={autoRefresh ? "contained" : "outlined"} onClick={() => setAutoRefresh(!autoRefresh)} size="small">Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}</Button>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {statsLoading && stats === null ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              {stats && (
                <Grid container spacing={3} mb={4}>
                  <Grid item xs={12} md={3}><Card><CardContent><Box display="flex" alignItems="center"><People sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} /><Box><Typography color="text.secondary" gutterBottom>Currently Active</Typography><Typography variant="h4">{stats.summary.currentlyActive}</Typography></Box></Box></CardContent></Card></Grid>
                  <Grid item xs={12} md={3}><Card><CardContent><Box display="flex" alignItems="center"><CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} /><Box><Typography color="text.secondary" gutterBottom>Total Sessions Today</Typography><Typography variant="h4">{stats.summary.totalToday}</Typography></Box></Box></CardContent></Card></Grid>
                  <Grid item xs={12} md={3}><Card><CardContent><Box display="flex" alignItems="center"><AccessTime sx={{ fontSize: 40, color: 'info.main', mr: 2 }} /><Box><Typography color="text.secondary" gutterBottom>Avg Session Time</Typography><Typography variant="h4">{formatDuration(stats.summary.averageSessionTime)}</Typography></Box></Box></CardContent></Card></Grid>
                  <Grid item xs={12} md={3}><Card><CardContent><Box display="flex" alignItems="center"><TrendingUp sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} /><Box><Typography color="text.secondary" gutterBottom>Total Time Today</Typography><Typography variant="h4">{formatDuration(stats.summary.totalTimeToday)}</Typography></Box></Box></CardContent></Card></Grid>
                </Grid>
              )}

              <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Attendance Records ({records.length})</Typography>
                  {statsLoading && <CircularProgress size={24} />}
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow sx={{ backgroundColor: "#f5f5f5" }}><TableCell>ChampID</TableCell><TableCell>Login Time</TableCell><TableCell>Logout Time</TableCell><TableCell>Duration</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell><Typography variant="subtitle2">{r.champId}</Typography></TableCell>
                          <TableCell>{formatTime(r.loginTime)}</TableCell>
                          <TableCell>{r.logoutTime ? (<Box>{formatTime(r.logoutTime)}{r.isAutoLogout && <Chip label="Auto" size="small" color="warning" sx={{ ml: 1 }} />}</Box>) : <Chip label="Active" color="success" size="small" />}</TableCell>
                          <TableCell>{r.duration ? formatDuration(r.duration) : '-'}</TableCell>
                          <TableCell><Chip label={r.status} color={r.status === 'active' ? 'success' : 'default'} size="small" /></TableCell>
                          <TableCell><Tooltip title="View History"><IconButton size="small" onClick={() => fetchUserHistory(r.champId)}><History /></IconButton></Tooltip></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}

          <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Attendance History - {selectedUser}</DialogTitle>
            <DialogContent>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Login</TableCell><TableCell>Logout</TableCell><TableCell>Duration</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                  <TableBody>
                    {userHistory.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{formatTime(r.loginTime)}</TableCell>
                        <TableCell>{r.logoutTime ? formatTime(r.logoutTime) : '-'}</TableCell>
                        <TableCell>{r.duration ? formatDuration(r.duration) : '-'}</TableCell>
                        <TableCell><Chip label={r.status} size="small" color={r.status === 'active' ? 'success' : 'default'} /></TableCell>
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
        </Box>
      )}
    </Container>
  );
}
