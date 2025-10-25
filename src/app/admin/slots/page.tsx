"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Dashboard,
  Settings,
  CalendarToday,
  TrendingUp,
  People,
  SportsTennis,
  AccessTime,
  Edit,
  Delete,
  Refresh,
} from "@mui/icons-material";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";

interface SlotData {
  timeSlot: string;
  court: string;
  dayOfWeek: string;
  users: Array<{
    _id: string;
    name: string;
    email: string;
    mobile: string;
    registeredAt: string;
  }>;
  capacity: number;
  occupied: number;
  available: number;
}

interface CourtConfig {
  courtId: string;
  name: string;
  maxCapacity: number;
  isActive: boolean;
}

export default function SlotTrackingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // States
  const [loading, setLoading] = useState(true);
  const [slotData, setSlotData] = useState<SlotData[]>([]);
  const [courtConfigs, setCourtConfigs] = useState<CourtConfig[]>([
    { courtId: 'S1', name: 'Court S1', maxCapacity: 4, isActive: true },
    { courtId: 'S2', name: 'Court S2', maxCapacity: 4, isActive: true },
    { courtId: 'S3', name: 'Court S3', maxCapacity: 4, isActive: true },
  ]);
  const [viewType, setViewType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
  const [stats, setStats] = useState({
    totalSlots: 0,
    occupiedSlots: 0,
    availableSlots: 0,
    occupancyRate: 0,
    peakHours: '',
    mostPopularCourt: '',
  });

  // Time slots constant
  const TIME_SLOTS = [
    "06:00 AM - 07:00 AM",
    "07:00 AM - 08:00 AM",
    "08:00 AM - 09:00 AM",
    "09:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "12:00 PM - 01:00 PM",
    "01:00 PM - 02:00 PM",
    "02:00 PM - 03:00 PM",
    "03:00 PM - 04:00 PM",
    "04:00 PM - 05:00 PM",
    "05:00 PM - 06:00 PM",
    "06:00 PM - 07:00 PM",
    "07:00 PM - 08:00 PM",
    "08:00 PM - 09:00 PM",
    "09:00 PM - 10:00 PM",
  ];

  const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Check authentication
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || session.user?.role !== "admin") {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // Load slot data
  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchSlotData();
    }
  }, [session, selectedDate, viewType]);

  const fetchSlotData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/slots/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          viewType,
          date: selectedDate.toISOString(),
          courts: courtConfigs.filter(c => c.isActive).map(c => c.courtId),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSlotData(data.slots || []);
        calculateStats(data.slots || []);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to fetch slot data' });
      }
    } catch (error) {
      console.error('Error fetching slot data:', error);
      setAlert({ type: 'error', message: 'Failed to fetch slot data' });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (slots: SlotData[]) => {
    const totalSlots = slots.reduce((sum, slot) => sum + slot.capacity, 0);
    const occupiedSlots = slots.reduce((sum, slot) => sum + slot.occupied, 0);
    const availableSlots = totalSlots - occupiedSlots;
    const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

    // Find peak hours
    const hourCounts: { [hour: string]: number } = {};
    slots.forEach(slot => {
      const hour = slot.timeSlot.split(' - ')[0];
      hourCounts[hour] = (hourCounts[hour] || 0) + slot.occupied;
    });
    const peakHours = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b, Object.keys(hourCounts)[0] || ''
    );

    // Find most popular court
    const courtCounts: { [court: string]: number } = {};
    slots.forEach(slot => {
      courtCounts[slot.court] = (courtCounts[slot.court] || 0) + slot.occupied;
    });
    const mostPopularCourt = Object.keys(courtCounts).reduce((a, b) => 
      courtCounts[a] > courtCounts[b] ? a : b, Object.keys(courtCounts)[0] || ''
    );

    setStats({
      totalSlots,
      occupiedSlots,
      availableSlots,
      occupancyRate,
      peakHours,
      mostPopularCourt,
    });
  };

  const handleConfigSave = async () => {
    try {
      const response = await fetch('/api/admin/court-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courts: courtConfigs }),
      });

      const data = await response.json();
      if (data.success) {
        setAlert({ type: 'success', message: 'Court configuration updated successfully' });
        fetchSlotData(); // Refresh data
        setConfigDialogOpen(false);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to update configuration' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update configuration' });
    }
  };

  const getOccupancyColor = (occupancyRate: number) => {
    if (occupancyRate >= 100) return '#f44336'; // Red - Full
    if (occupancyRate >= 75) return '#ff9800'; // Orange - High
    if (occupancyRate >= 50) return '#ffc107'; // Yellow - Medium
    if (occupancyRate >= 25) return '#4caf50'; // Green - Low
    return '#2196f3'; // Blue - Very Low
  };

  if (status === "loading" || loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!session || session.user?.role !== "admin") {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Dashboard color="primary" />
          Slot Tracking Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setConfigDialogOpen(true)}
          >
            Court Config
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchSlotData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>View Type</InputLabel>
              <Select
                value={viewType}
                onChange={(e) => setViewType(e.target.value as 'weekly' | 'monthly')}
                label="View Type"
              >
                <MenuItem value="weekly">Weekly View</MenuItem>
                <MenuItem value="monthly">Monthly View</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              type="date"
              label="Select Date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="primary">
              {viewType === 'weekly' 
                ? `Week of ${format(startOfWeek(selectedDate), 'MMM dd')} - ${format(endOfWeek(selectedDate), 'MMM dd, yyyy')}`
                : `${format(selectedDate, 'MMMM yyyy')}`
              }
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total Slots
              </Typography>
              <Typography variant="h4">
                {stats.totalSlots}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Occupied
              </Typography>
              <Typography variant="h4" color="error">
                {stats.occupiedSlots}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Available
              </Typography>
              <Typography variant="h4" color="success">
                {stats.availableSlots}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Occupancy Rate
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ color: getOccupancyColor(stats.occupancyRate) }}
              >
                {stats.occupancyRate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Peak Hours
              </Typography>
              <Typography variant="h6">
                {stats.peakHours || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Popular Court
              </Typography>
              <Typography variant="h6">
                {stats.mostPopularCourt || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Slot Details Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SportsTennis />
          Slot Details
        </Typography>
        
        {slotData.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time Slot</TableCell>
                  <TableCell>Court</TableCell>
                  <TableCell>Day</TableCell>
                  <TableCell>Occupancy</TableCell>
                  <TableCell>Users</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slotData.map((slot, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime fontSize="small" />
                        {slot.timeSlot}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={`Court ${slot.court}`} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ textTransform: 'capitalize' }}>
                        {slot.dayOfWeek}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={`${slot.occupied}/${slot.capacity}`}
                          size="small"
                          sx={{ 
                            bgcolor: getOccupancyColor((slot.occupied / slot.capacity) * 100),
                            color: 'white'
                          }}
                        />
                        <Typography variant="caption">
                          ({Math.round((slot.occupied / slot.capacity) * 100)}%)
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {slot.users.map((user, userIndex) => (
                          <Tooltip key={userIndex} title={`${user.name} - ${user.email}`}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                              {user.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary">
                        <Edit fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              No slot data available for the selected period
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Try selecting a different date range or ensure users have registered slots
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Court Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Court Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Configure the maximum capacity for each court and enable/disable courts.
          </Typography>
          
          <Grid container spacing={2}>
            {courtConfigs.map((court, index) => (
              <Grid item xs={12} sm={6} key={court.courtId}>
                <Paper sx={{ p: 2, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{court.name}</Typography>
                    <Button
                      variant={court.isActive ? "contained" : "outlined"}
                      color={court.isActive ? "success" : "primary"}
                      size="small"
                      onClick={() => {
                        const newConfigs = [...courtConfigs];
                        newConfigs[index].isActive = !newConfigs[index].isActive;
                        setCourtConfigs(newConfigs);
                      }}
                    >
                      {court.isActive ? "Active" : "Inactive"}
                    </Button>
                  </Box>
                  <TextField
                    label="Max Capacity"
                    type="number"
                    value={court.maxCapacity}
                    onChange={(e) => {
                      const newConfigs = [...courtConfigs];
                      newConfigs[index].maxCapacity = parseInt(e.target.value) || 4;
                      setCourtConfigs(newConfigs);
                    }}
                    fullWidth
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfigSave} variant="contained">Save Configuration</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}