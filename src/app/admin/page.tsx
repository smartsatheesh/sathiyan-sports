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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  IconButton,
} from "@mui/material";
import { format } from "date-fns";
import {
  Dashboard,
  Edit,
  Delete,
  Refresh,
  CheckCircle,
  Check,
} from "@mui/icons-material";

// Time slots constant to match registration page format
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

interface Booking {
  _id: string;
  sport: string;
  court?: string;
  date: string;
  timeSlots: string[];
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentStatus: string;
  bookingStatus: string;
  createdAt: string;
}

interface User {
  _id: string;
  champId?: string;
  name: string;
  email: string;
  phone: string;
  mobile: string;
  gender?: string;
  preferredSport: string;
  preferredTimeSlot?: string;
  selectedCourt?: string;
  subscriptionType: string;
  paymentStatus: string;
  status: string;
  verifiedAt?: string;
  createdAt: string;
}

interface Stats {
  totalBookings: number;
  todaysBookings: number;
  totalRevenue: number;
  totalUsers: number;
}

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [tabValue, setTabValue] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    todaysBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  
  // Edit User Dialog states
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserFormData, setEditUserFormData] = useState({
    champId: '',
    name: '',
    email: '',
    mobile: '',
    gender: '',
    preferredSport: '',
    preferredTimeSlot: '',
    selectedCourt: '',
    subscriptionType: '',
    status: '',
    paymentStatus: ''
  });

  // ChampID validation states
  const [champIdValidation, setChampIdValidation] = useState<{
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isValid: null,
    message: ''
  });

  // Delete User Dialog states
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);

  // Authentication check
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login?callbackUrl=/admin");
      return;
    }
    
    if (session.user?.role !== "admin") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch bookings and users
      const [bookingsRes, usersRes] = await Promise.all([
        fetch('/api/admin/bookings?limit=100'),
        fetch('/api/admin/users?limit=100')
      ]);

      const bookingsData = await bookingsRes.json();
      const usersData = await usersRes.json();

      if (bookingsData.success) {
        setBookings(bookingsData.bookings);
      }

      if (usersData.success) {
        setUsers(usersData.users);
      }

      // Calculate stats
      const today = new Date().toDateString();
      const todaysBookings = bookingsData.bookings?.filter(
        (booking: Booking) => new Date(booking.date).toDateString() === today
      ).length || 0;

      const totalRevenue = bookingsData.bookings?.filter(
        (booking: Booking) => booking.paymentStatus === 'completed'
      ).reduce((sum: number, booking: Booking) => sum + booking.totalAmount, 0) || 0;

      setStats({
        totalBookings: bookingsData.bookings?.length || 0,
        todaysBookings,
        totalRevenue,
        totalUsers: usersData.users?.length || 0,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchData();
    }
  }, [session]);

  const handleEditUser = (user: User) => {
    console.log('Opening edit dialog for user:', user);
    console.log('Available TIME_SLOTS:', TIME_SLOTS);
    
    setSelectedUser(user);
    setEditUserFormData({
      champId: user.champId || '',
      name: user.name || '',
      email: user.email || '',
      mobile: user.phone || user.mobile || '',
      gender: user.gender || '',
      preferredSport: user.preferredSport || '',
      preferredTimeSlot: user.preferredTimeSlot || '',
      selectedCourt: user.selectedCourt || '',
      subscriptionType: user.subscriptionType || '',
      status: user.status || 'pending',
      paymentStatus: user.paymentStatus || 'pending'
    });
    
    // Reset ChampID validation to valid if user already has a ChampID
    if (user.champId) {
      setChampIdValidation({ 
        isChecking: false, 
        isValid: true, 
        message: 'Current ChampID' 
      });
    } else {
      setChampIdValidation({ 
        isChecking: false, 
        isValid: null, 
        message: '' 
      });
    }
    
    setEditUserDialogOpen(true);
  };

    const handleUserUpdate = async () => {
    if (!selectedUser) return;

    console.log('Starting user update...');
    console.log('Edit user form data:', editUserFormData);
    console.log('ChampID validation:', champIdValidation);

    try {
      // Validate ChampID if provided and changed
      if (editUserFormData.champId && 
          editUserFormData.champId !== (selectedUser.champId || '') && 
          champIdValidation.isValid !== true) {
        console.log('ChampID validation failed');
        setAlert({ 
          type: "error", 
          message: "Please provide a valid and available ChampID before saving" 
        });
        setTimeout(() => setAlert(null), 5000);
        return;
      }

      // Check for duplicate court bookings if this is a badminton user
      if (editUserFormData.preferredSport === 'Shuttle Badminton' && 
          editUserFormData.preferredTimeSlot && 
          editUserFormData.selectedCourt) {
        
        console.log('Checking court availability for badminton user...');
        
        // Check if there are already 4 users with same court, time slot and sport
        const availabilityResponse = await fetch('/api/check-court-availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeSlot: editUserFormData.preferredTimeSlot,
            requestedCourt: editUserFormData.selectedCourt,
            sport: 'Shuttle Badminton',
            excludeUserId: selectedUser._id // Exclude current user from count
          }),
        });

        const availabilityData = await availabilityResponse.json();
        console.log('Court availability check result:', availabilityData);

        if (!availabilityData.canBook) {
          setAlert({ 
            type: 'error', 
            message: `Court ${editUserFormData.selectedCourt} is fully booked for ${editUserFormData.preferredTimeSlot}. Maximum 4 slots per court. Please choose a different time slot or court.` 
          });
          setTimeout(() => setAlert(null), 5000);
          return;
        }
      }

      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          champId: editUserFormData.champId || undefined, // Only include if not empty
          name: editUserFormData.name,
          email: editUserFormData.email,
          mobile: editUserFormData.mobile,
          phone: editUserFormData.mobile,
          gender: editUserFormData.gender,
          preferredSport: editUserFormData.preferredSport,
          preferredTimeSlot: editUserFormData.preferredTimeSlot,
          selectedCourt: editUserFormData.selectedCourt,
          subscriptionType: editUserFormData.subscriptionType,
          status: editUserFormData.status,
          paymentStatus: editUserFormData.paymentStatus,
        }),
      });

      console.log('Update response status:', response.status);
      const data = await response.json();
      console.log('Update response data:', data);

      if (data.success) {
        setUsers(prev => prev.map(u => 
          u._id === selectedUser._id 
            ? { 
                ...u, 
                champId: editUserFormData.champId,
                name: editUserFormData.name,
                email: editUserFormData.email,
                mobile: editUserFormData.mobile,
                phone: editUserFormData.mobile,
                gender: editUserFormData.gender,
                preferredSport: editUserFormData.preferredSport,
                preferredTimeSlot: editUserFormData.preferredTimeSlot,
                selectedCourt: editUserFormData.selectedCourt,
                subscriptionType: editUserFormData.subscriptionType,
                status: editUserFormData.status,
                paymentStatus: editUserFormData.paymentStatus
              }
            : u
        ));
        setAlert({ 
          type: 'success', 
          message: 'User updated successfully!' 
        });
        
        setEditUserDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error(data.message || 'Failed to update user');
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to update user' 
      });
    }
    
    setTimeout(() => setAlert(null), 3000);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteUserDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.filter(u => u._id !== selectedUser._id));
        setAlert({ type: 'success', message: 'User deleted successfully!' });
        setDeleteUserDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error(data.message || 'Failed to delete user');
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to delete user' 
      });
    }

    setTimeout(() => setAlert(null), 3000);
  };

  // ChampID validation function
  const validateChampId = async (champId: string, currentUserId?: string) => {
    if (!champId) {
      setChampIdValidation({ isChecking: false, isValid: null, message: '' });
      return;
    }

    // Validate ChampID pattern (S + 5 digits starting from 25911)
    const champIdPattern = /^S\d{5,}$/;
    if (!champIdPattern.test(champId)) {
      setChampIdValidation({ 
        isChecking: false, 
        isValid: false, 
        message: 'ChampID must be in format S##### (e.g., S25911)' 
      });
      return;
    }

    const numberPart = parseInt(champId.substring(1));
    if (numberPart < 25911) {
      setChampIdValidation({ 
        isChecking: false, 
        isValid: false, 
        message: 'ChampID number must be 25911 or higher' 
      });
      return;
    }

    setChampIdValidation({ isChecking: true, isValid: null, message: 'Checking availability...' });

    try {
      const response = await fetch(`/api/admin/check-champid?champId=${encodeURIComponent(champId)}&currentUserId=${currentUserId || ''}`);
      const data = await response.json();

      if (response.ok) {
        setChampIdValidation({
          isChecking: false,
          isValid: data.available,
          message: data.available ? 'ChampID is available' : 'ChampID is already taken'
        });
      } else {
        throw new Error(data.message || 'Failed to check ChampID availability');
      }
    } catch (error) {
      console.error('Error validating ChampID:', error);
      setChampIdValidation({
        isChecking: false,
        isValid: false,
        message: 'Error checking ChampID availability'
      });
    }
  };

  // Booking management handlers
  const handleEditBooking = (booking: Booking) => {
    // TODO: Implement booking edit functionality
    console.log('Edit booking:', booking);
    setAlert({ type: "info", message: "Booking edit functionality will be implemented soon" });
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: "success", message: "Booking deleted successfully" });
        fetchData(); // Refresh the data
      } else {
        throw new Error(data.message || 'Failed to delete booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      setAlert({ type: "error", message: `Failed to delete booking: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleVerifyBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingStatus: 'confirmed',
          paymentStatus: 'paid' // Correct field value based on Booking model
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: "success", message: "Booking verified successfully" });
        fetchData(); // Refresh the data
      } else {
        throw new Error(data.message || 'Failed to verify booking');
      }
    } catch (error) {
      console.error('Error verifying booking:', error);
      setAlert({ type: "error", message: `Failed to verify booking: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'rejected':
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, mt: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>Loading dashboard data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
        <Alert severity="error" action={
          <Button color="inherit" onClick={fetchData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!session || session.user?.role !== "admin") {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
      {/* Alert Display */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 3 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        borderRadius: 3,
        p: 4,
        mb: 4,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Dashboard sx={{ fontSize: 48 }} />
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
            Sathiyan Sports Admin
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' }}>
            Coaching Excellence Dashboard
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { title: "Total Bookings", value: stats.totalBookings, color: "primary.main" },
          { title: "Today's Bookings", value: stats.todaysBookings, color: "success.main" },
          { title: "Total Revenue", value: `₹${stats.totalRevenue.toFixed(2)}`, color: "warning.main" },
          { title: "Total Users", value: stats.totalUsers, color: "info.main" },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <CardContent sx={{ textAlign: "center", flex: 1 }}>
                <Typography color="textSecondary" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography variant="h4" sx={{ color: stat.color, fontWeight: "bold" }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: "100%" }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Recent Bookings" />
          <Tab label="Users" />
          <Tab label="Settings" />
        </Tabs>

        {/* Bookings Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Sport</TableCell>
                  <TableCell>Court</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.slice(0, 10).map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>{booking.customerName}</TableCell>
                    <TableCell>{booking.sport}</TableCell>
                    <TableCell>{booking.court || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(booking.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.bookingStatus} 
                        color={getStatusColor(booking.bookingStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.paymentStatus} 
                        color={getStatusColor(booking.paymentStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>₹{booking.totalAmount}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleEditBooking(booking)}
                          title="Edit Booking"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteBooking(booking._id)}
                          title="Delete Booking"
                        >
                          <Delete />
                        </IconButton>
                        {booking.bookingStatus === 'pending' && (
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleVerifyBooking(booking._id)}
                            title="Verify Booking"
                          >
                            <Check />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">User Management</Typography>
            <Button variant="contained" startIcon={<Refresh />} onClick={fetchData}>
              Refresh
            </Button>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Champ ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Sport</TableCell>
                  <TableCell>Preferred Time Slot</TableCell>
                  <TableCell>Court</TableCell>
                  <TableCell>Subscription</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Chip 
                        label={user.champId || 'Legacy User'} 
                        size="small" 
                        color={user.champId ? "primary" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.mobile || user.phone}</TableCell>
                    <TableCell>{user.preferredSport || 'N/A'}</TableCell>
                    <TableCell>
                      {user.preferredTimeSlot ? (
                        <Chip 
                          label={user.preferredTimeSlot} 
                          size="small" 
                          color="secondary"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No time slot
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.selectedCourt ? (
                        <Chip label={user.selectedCourt} size="small" color="primary" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="textSecondary">No court</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={user.subscriptionType || 'None'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.status || 'pending'} 
                        color={getStatusColor(user.status || 'pending') as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.paymentStatus || 'pending'} 
                        color={getStatusColor(user.paymentStatus || 'pending') as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => handleEditUser(user)} startIcon={<Edit />}>
                        Edit
                      </Button>
                      <Button size="small" color="error" onClick={() => handleDeleteUser(user)} startIcon={<Delete />}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" sx={{ mb: 2 }}>System Settings</Typography>
          <Typography variant="body1">Settings panel coming soon...</Typography>
        </TabPanel>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onClose={() => setEditUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              {/* ChampID Field */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Champion ID"
                  placeholder="S25911"
                  value={editUserFormData.champId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditUserFormData(prev => ({ ...prev, champId: value }));
                    // Validate ChampID with debounce
                    setTimeout(() => {
                      validateChampId(value, selectedUser?._id);
                    }, 300);
                  }}
                  helperText={
                    champIdValidation.isChecking 
                      ? "Checking availability..." 
                      : champIdValidation.message || "Format: S##### (e.g., S25911)"
                  }
                  error={champIdValidation.isValid === false}
                  InputProps={{
                    style: { 
                      color: champIdValidation.isValid === true ? '#2e7d32' : 
                             champIdValidation.isValid === false ? '#d32f2f' : 'inherit'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editUserFormData.name}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editUserFormData.email}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mobile"
                  value={editUserFormData.mobile}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, mobile: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={editUserFormData.gender}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, gender: e.target.value }))}
                    label="Gender"
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Sport</InputLabel>
                  <Select
                    value={editUserFormData.preferredSport}
                    onChange={(e) => {
                      const newSport = e.target.value;
                      setEditUserFormData(prev => ({ 
                        ...prev, 
                        preferredSport: newSport,
                        selectedCourt: newSport === "Shuttle Badminton" ? prev.selectedCourt : "",
                        preferredTimeSlot: newSport === prev.preferredSport ? prev.preferredTimeSlot : ""
                      }));
                    }}
                    label="Preferred Sport"
                  >
                    <MenuItem value="Cricket">Cricket</MenuItem>
                    <MenuItem value="Football">Football</MenuItem>
                    <MenuItem value="Shuttle Badminton">Shuttle Badminton</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Time Slot</InputLabel>
                  <Select
                    value={editUserFormData.preferredTimeSlot}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, preferredTimeSlot: e.target.value }))}
                    label="Preferred Time Slot"
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Select a time slot</em>
                    </MenuItem>
                    {TIME_SLOTS.map((slot) => (
                      <MenuItem key={slot} value={slot}>
                        {slot}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {editUserFormData.preferredSport === "Shuttle Badminton" && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Selected Court</InputLabel>
                    <Select
                      value={editUserFormData.selectedCourt}
                      onChange={(e) => setEditUserFormData(prev => ({ ...prev, selectedCourt: e.target.value }))}
                      label="Selected Court"
                    >
                      <MenuItem value="S1">Court S1</MenuItem>
                      <MenuItem value="S2">Court S2</MenuItem>
                      <MenuItem value="S3">Court S3</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Subscription Type</FormLabel>
                  <RadioGroup
                    value={editUserFormData.subscriptionType}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, subscriptionType: e.target.value }))}
                    row
                  >
                    <FormControlLabel value="monthly" control={<Radio />} label="Monthly" />
                    <FormControlLabel value="quarterly" control={<Radio />} label="Quarterly" />
                    <FormControlLabel value="half yearly" control={<Radio />} label="Half Yearly" />
                    <FormControlLabel value="yearly" control={<Radio />} label="Yearly" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editUserFormData.status}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, status: e.target.value }))}
                    label="Status"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="verified">Verified</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={editUserFormData.paymentStatus}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    label="Payment Status"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUserUpdate} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserDialogOpen} onClose={() => setDeleteUserDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user? This action cannot be undone.
          </Typography>
          {selectedUser && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2">User Details:</Typography>
              <Typography variant="body2">Name: {selectedUser.name}</Typography>
              <Typography variant="body2">Email: {selectedUser.email}</Typography>
              <Typography variant="body2">Phone: {selectedUser.phone || selectedUser.mobile}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteUser} variant="contained" color="error">
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}