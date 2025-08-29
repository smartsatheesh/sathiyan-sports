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
  Avatar,
} from "@mui/material";
import { format } from "date-fns";
import {
  Dashboard,
  People,
  BookOnline,
  ContactMail,
  FitnessCenter,
  Refresh,
  Visibility,
  Security,
} from "@mui/icons-material";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface Booking {
  _id: string;
  sport: string;
  court?: string; // Optional court selection for Shuttle Badminton
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
  name: string;
  email: string;
  phone: string;
  mobile: string;
  preferredSport: string;
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

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
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
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState({
    bookingStatus: '',
    paymentStatus: ''
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // Authentication check
  useEffect(() => {
    if (status === "loading") return; // Still loading
    
    if (!session) {
      router.push("/auth/login?callbackUrl=/admin");
      return;
    }
    
    if (session.user?.role !== "admin") {
      router.push("/"); // Redirect non-admin users to home
      return;
    }
  }, [session, status, router]);

  // Define fetchData function before the useEffect that uses it
  // This function fetches admin dashboard data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch bookings
      const bookingsResponse = await fetch('/api/admin/bookings');
      const bookingsData = await bookingsResponse.json();
      
      if (bookingsData.success) {
        setBookings(bookingsData.bookings);
      } else {
        throw new Error('Failed to fetch bookings');
      }

      // Fetch users
      const usersResponse = await fetch('/api/admin/users');
      const usersData = await usersResponse.json();
      
      if (usersData.success) {
        setUsers(usersData.users);
      } else {
        console.log('Failed to fetch users:', usersData.message);
      }

      // Calculate stats after both bookings and users are fetched
      const today = new Date().toDateString();
      const todaysBookings = bookingsData.bookings.filter(
        (booking: Booking) => new Date(booking.date).toDateString() === today
      ).length;

      const totalRevenue = bookingsData.bookings
        .filter((booking: Booking) => booking.paymentStatus === 'completed')
        .reduce((sum: number, booking: Booking) => sum + booking.totalAmount, 0);

      setStats({
        totalBookings: bookingsData.bookings.length,
        todaysBookings,
        totalRevenue,
        totalUsers: usersData.success ? usersData.users.length : 0,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data effect - now after fetchData is defined
  useEffect(() => {
    fetchData();
  }, []);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Show nothing while redirecting
  if (!session || session.user?.role !== "admin") {
    return null;
  }

  const handleBookingUpdate = async () => {
    if (!selectedBooking) return;

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBooking._id,
          status: updateStatus.bookingStatus || undefined,
          paymentStatus: updateStatus.paymentStatus || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh data
        await fetchData();
        setDialogOpen(false);
        setSelectedBooking(null);
        setUpdateStatus({ bookingStatus: '', paymentStatus: '' });
      } else {
        throw new Error(data.message || 'Failed to update booking');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update booking');
    }
  };

  // Quick approve function
  const handleQuickApprove = async (booking: Booking) => {
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking._id,
          status: 'confirmed',
          paymentStatus: 'paid',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh data
        await fetchData();
        setAlert({ type: 'success', message: `Booking ${booking._id.slice(-8)} approved successfully!` });
      } else {
        throw new Error(data.message || 'Failed to approve booking');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve booking');
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setUpdateStatus({
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus
    });
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'completed':
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
      case 'failed':
      case 'rejected':
        return 'error';
      case 'suspended':
        return 'default';
      default:
        return 'default';
    }
  };

  // User verification function
  const handleUserVerification = async (userId: string, action: 'verify' | 'reject' | 'suspend') => {
    try {
      const response = await fetch('/api/admin/users/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh data
        await fetchData();
        setAlert({ 
          type: 'success', 
          message: `User ${action}ed successfully!` 
        });
        
        // Clear alert after 3 seconds
        setTimeout(() => setAlert(null), 3000);
      } else {
        throw new Error(data.message || `Failed to ${action} user`);
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err instanceof Error ? err.message : `Failed to ${action} user` 
      });
      
      // Clear alert after 5 seconds
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>Loading dashboard data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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

      <Typography
        variant="h3"
        align="center"
        gutterBottom
        sx={{
          fontWeight: 800,
          color: "primary.main",
          mb: 4,
        }}
      >
        Admin Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: "Total Bookings",
            value: stats.totalBookings,
            color: "primary.main",
          },
          {
            title: "Today's Bookings",
            value: stats.todaysBookings,
            color: "success.main",
          },
          {
            title: "Total Revenue",
            value: `$${stats.totalRevenue.toFixed(2)}`,
            color: "warning.main",
          },
          {
            title: "Total Users",
            value: stats.totalUsers,
            color: "info.main",
          },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "white",
              }}
            >
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ color: stat.color, fontWeight: "bold" }}
                >
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Paper elevation={3} sx={{ borderRadius: 2, bgcolor: "white" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Recent Bookings" />
          <Tab label="Users" />
          <Tab label="Settings" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Booking ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Sport</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>{booking._id.slice(-8)}</TableCell>
                    <TableCell>{booking.customerName}</TableCell>
                    <TableCell>{booking.sport}</TableCell>
                    <TableCell>
                      {booking.sport === "Shuttle Badminton" && booking.court ? (
                        <Chip label={`Court ${booking.court}`} size="small" color="primary" />
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(booking.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{booking.timeSlots.join(', ')}</TableCell>
                    <TableCell>
                      <Chip
                        label={booking.paymentStatus}
                        color={getStatusColor(booking.paymentStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.bookingStatus}
                        color={getStatusColor(booking.bookingStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                        {(booking.bookingStatus === 'pending' || booking.paymentStatus === 'pending_verification') && (
                          <Button 
                            size="small" 
                            color="success"
                            variant="contained"
                            onClick={() => handleQuickApprove(booking)}
                            sx={{ fontSize: '0.7rem', py: 0.5 }}
                          >
                            ✅ Approve
                          </Button>
                        )}
                        <Button 
                          size="small" 
                          color="primary"
                          variant="outlined"
                          onClick={() => handleViewBooking(booking)}
                          sx={{ fontSize: '0.7rem', py: 0.5 }}
                        >
                          👁️ View
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Preferred Sport</TableCell>
                  <TableCell>Subscription</TableCell>
                  <TableCell>User Status</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>{user._id.slice(-8)}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || user.mobile}</TableCell>
                    <TableCell>{user.preferredSport || 'N/A'}</TableCell>
                    <TableCell>{user.subscriptionType || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.status || 'pending'}
                        color={getStatusColor(user.status || 'pending') as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.paymentStatus}
                        color={getStatusColor(user.paymentStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {(!user.status || user.status === 'pending') && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleUserVerification(user._id, 'verify')}
                              sx={{ fontSize: '0.7rem', py: 0.5, minWidth: 'auto', px: 1 }}
                            >
                              ✓ Verify
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleUserVerification(user._id, 'reject')}
                              sx={{ fontSize: '0.7rem', py: 0.5, minWidth: 'auto', px: 1 }}
                            >
                              ✗ Reject
                            </Button>
                          </>
                        )}
                        {user.status === 'verified' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleUserVerification(user._id, 'suspend')}
                            sx={{ fontSize: '0.7rem', py: 0.5, minWidth: 'auto', px: 1 }}
                          >
                            ⏸ Suspend
                          </Button>
                        )}
                        {(user.status === 'rejected' || user.status === 'suspended') && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleUserVerification(user._id, 'verify')}
                            sx={{ fontSize: '0.7rem', py: 0.5, minWidth: 'auto', px: 1 }}
                          >
                            🔄 Reactivate
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography>Settings content goes here</Typography>
        </TabPanel>
      </Paper>

      {/* Booking Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Booking ID
                  </Typography>
                  <Typography variant="body1">{selectedBooking._id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Customer
                  </Typography>
                  <Typography variant="body1">{selectedBooking.customerName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{selectedBooking.customerEmail}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{selectedBooking.customerPhone}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Sport
                  </Typography>
                  <Typography variant="body1">{selectedBooking.sport}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedBooking.date), 'MMMM dd, yyyy')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Time Slots
                  </Typography>
                  <Typography variant="body1">{selectedBooking.timeSlots.join(', ')}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Amount
                  </Typography>
                  <Typography variant="body1">${selectedBooking.totalAmount}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Booking Status</InputLabel>
                    <Select
                      value={updateStatus.bookingStatus}
                      onChange={(e) => setUpdateStatus(prev => ({ ...prev, bookingStatus: e.target.value }))}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="confirmed">Confirmed</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={updateStatus.paymentStatus}
                      onChange={(e) => setUpdateStatus(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                      <MenuItem value="refunded">Refunded</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Created At
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedBooking.createdAt), 'MMMM dd, yyyy at h:mm a')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBookingUpdate} variant="contained" color="primary">
            Update Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
