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

interface FitnessEnrollment {
  _id: string;
  enrollmentId: string;
  planName: string;
  planCategory: 'strength' | 'speed' | 'stamina';
  planLevel: 'beginner' | 'intermediate' | 'advanced';
  userName: string;
  userEmail: string;
  userPhone: string;
  enrollmentDate: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  totalAmount: number;
  progressPercentage: number;
  currentWeek: number;
}

interface Stats {
  totalBookings: number;
  todaysBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalFitnessEnrollments: number;
  activeFitnessEnrollments: number;
  totalFitnessRevenue: number;
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
  const [fitnessEnrollments, setFitnessEnrollments] = useState<FitnessEnrollment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    todaysBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalFitnessEnrollments: 0,
    activeFitnessEnrollments: 0,
    totalFitnessRevenue: 0,
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
  
  // Pagination states
  const [bookingsPage, setBookingsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [fitnessEnrollmentsPage, setFitnessEnrollmentsPage] = useState(1);
  const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [loadingMoreFitnessEnrollments, setLoadingMoreFitnessEnrollments] = useState(false);
  const [hasMoreBookings, setHasMoreBookings] = useState(true);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [hasMoreFitnessEnrollments, setHasMoreFitnessEnrollments] = useState(true);

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
      // Fetch dashboard stats and recent data
      const statsResponse = await fetch('/api/admin/dashboard-stats');
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        // Set the stats from the dedicated endpoint
        setStats(statsData.stats);
        
        // Set recent bookings, users, and fitness enrollments for display
        setBookings(statsData.recentBookings || []);
        setUsers(statsData.recentUsers || []);
        setFitnessEnrollments(statsData.recentFitnessEnrollments || []);
      } else {
        throw new Error(statsData.message || 'Failed to fetch dashboard data');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Dashboard fetch error:', err);
      
      // Fallback: try the old method with high limits
      try {
        console.log('Attempting fallback data fetch...');
        
        // Fetch ALL bookings for stats (use high limit to get all records)
        const bookingsResponse = await fetch('/api/admin/bookings?limit=1000');
        const bookingsData = await bookingsResponse.json();
        
        // Fetch ALL users for stats (use high limit to get all records)
        const usersResponse = await fetch('/api/admin/users?limit=1000');
        const usersData = await usersResponse.json();
        
        if (bookingsData.success && usersData.success) {
          setBookings(bookingsData.bookings);
          setUsers(usersData.users);

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
            totalUsers: usersData.users.length,
            totalFitnessEnrollments: 0,
            activeFitnessEnrollments: 0,
            totalFitnessRevenue: 0,
          });
          
          setError(null); // Clear error if fallback succeeds
        }
      } catch (fallbackErr) {
        console.error('Fallback fetch also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to load more bookings
  const loadMoreBookings = async () => {
    if (loadingMoreBookings || !hasMoreBookings) return;
    
    setLoadingMoreBookings(true);
    try {
      const nextPage = bookingsPage + 1;
      const response = await fetch(`/api/admin/bookings?page=${nextPage}&limit=10`);
      const data = await response.json();
      
      if (data.success && data.bookings.length > 0) {
        setBookings(prev => [...prev, ...data.bookings]);
        setBookingsPage(nextPage);
        
        // Check if there are more pages
        if (nextPage >= data.pagination.pages) {
          setHasMoreBookings(false);
        }
      } else {
        setHasMoreBookings(false);
      }
    } catch (error) {
      console.error('Error loading more bookings:', error);
    } finally {
      setLoadingMoreBookings(false);
    }
  };

  // Function to load more users
  const loadMoreUsers = async () => {
    if (loadingMoreUsers || !hasMoreUsers) return;
    
    setLoadingMoreUsers(true);
    try {
      const nextPage = usersPage + 1;
      const response = await fetch(`/api/admin/users?page=${nextPage}&limit=10`);
      const data = await response.json();
      
      if (data.success && data.users.length > 0) {
        setUsers(prev => [...prev, ...data.users]);
        setUsersPage(nextPage);
        
        // Check if there are more pages
        if (nextPage >= data.pagination.pages) {
          setHasMoreUsers(false);
        }
      } else {
        setHasMoreUsers(false);
      }
    } catch (error) {
      console.error('Error loading more users:', error);
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  // Function to load more fitness enrollments
  const loadMoreFitnessEnrollments = async () => {
    if (loadingMoreFitnessEnrollments || !hasMoreFitnessEnrollments) return;
    
    setLoadingMoreFitnessEnrollments(true);
    try {
      const nextPage = fitnessEnrollmentsPage + 1;
      const response = await fetch(`/api/admin/fitness-enrollments?page=${nextPage}&limit=10`);
      const data = await response.json();
      
      if (data.success && data.enrollments && data.enrollments.length > 0) {
        setFitnessEnrollments(prev => [...prev, ...data.enrollments]);
        setFitnessEnrollmentsPage(nextPage);
        
        // Check if there are more pages
        if (nextPage >= data.pagination.pages) {
          setHasMoreFitnessEnrollments(false);
        }
      } else {
        setHasMoreFitnessEnrollments(false);
      }
    } catch (error) {
      console.error('Error loading more fitness enrollments:', error);
      setHasMoreFitnessEnrollments(false);
    } finally {
      setLoadingMoreFitnessEnrollments(false);
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

      {/* Sir Alex Sports Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        mb: 4,
        background: 'var(--primary-gradient)',
        borderRadius: '20px',
        padding: '2rem',
        color: 'white',
        boxShadow: '0 4px 16px var(--shadow-color)'
      }}>
        <img 
          src="/sir-alex-anime.png" 
          alt="Sir Alex Ferguson Sports" 
          style={{ 
            height: '60px', 
            width: '60px', 
            borderRadius: '12px', 
            marginRight: '1rem',
            border: '3px solid rgba(255,255,255,0.3)'
          }} 
        />
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: "white",
              mb: 0.5,
            }}
          >
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
          {
            title: "Fitness Enrollments",
            value: stats.totalFitnessEnrollments,
            color: "secondary.main",
          },
          {
            title: "Active Fitness Plans",
            value: stats.activeFitnessEnrollments,
            color: "success.main",
          },
          {
            title: "Fitness Revenue",
            value: `$${stats.totalFitnessRevenue.toFixed(2)}`,
            color: "warning.main",
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
        
        {/* Coach Admin Access Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              bgcolor: "linear-gradient(135deg, #00ACC1 0%, #0097A7 100%)",
              color: "white",
              cursor: "pointer",
              transition: "transform 0.2s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 10px 25px rgba(0, 172, 193, 0.4)"
              }
            }}
            onClick={() => router.push('/coach/admin')}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "2rem", mb: 1 }}>
                🤖
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                Coach Admin
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                AI Training Plans & Analytics
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Reports Analytics Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              bgcolor: "linear-gradient(135deg, #20b2aa 0%, #008080 100%)",
              color: "white",
              cursor: "pointer",
              transition: "transform 0.2s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 10px 25px rgba(32, 178, 170, 0.4)"
              }
            }}
            onClick={() => router.push('/admin/reports')}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "2rem", mb: 1 }}>
                📊
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                Reports & Analytics
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Coach Performance & Athlete Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
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
          <Tab label="Fitness Enrollments" />
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
          
          {/* Load More Bookings Button */}
          {hasMoreBookings && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={loadMoreBookings}
                disabled={loadingMoreBookings}
                startIcon={loadingMoreBookings ? <CircularProgress size={20} /> : null}
              >
                {loadingMoreBookings ? 'Loading...' : 'Load More Bookings'}
              </Button>
            </Box>
          )}
          
          {!hasMoreBookings && bookings.length > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                All bookings loaded ({bookings.length} total)
              </Typography>
            </Box>
          )}
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
          
          {/* Load More Users Button */}
          {hasMoreUsers && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={loadMoreUsers}
                disabled={loadingMoreUsers}
                startIcon={loadingMoreUsers ? <CircularProgress size={20} /> : null}
              >
                {loadingMoreUsers ? 'Loading...' : 'Load More Users'}
              </Button>
            </Box>
          )}
          
          {!hasMoreUsers && users.length > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                All users loaded ({users.length} total)
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Enrollment ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fitnessEnrollments.map((enrollment) => (
                  <TableRow key={enrollment._id}>
                    <TableCell>{enrollment.enrollmentId.slice(-8)}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {enrollment.userName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {enrollment.userEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{enrollment.planName}</TableCell>
                    <TableCell>
                      <Chip
                        label={enrollment.planCategory}
                        color={
                          enrollment.planCategory === 'strength' ? 'primary' :
                          enrollment.planCategory === 'speed' ? 'success' : 'warning'
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={enrollment.planLevel}
                        color={
                          enrollment.planLevel === 'beginner' ? 'success' :
                          enrollment.planLevel === 'intermediate' ? 'warning' : 'error'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>${enrollment.totalAmount}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress
                          variant="determinate"
                          value={enrollment.progressPercentage}
                          size={24}
                          color={enrollment.progressPercentage > 75 ? 'success' : 'primary'}
                        />
                        <Typography variant="caption">
                          {enrollment.progressPercentage}% (Week {enrollment.currentWeek})
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={enrollment.status}
                        color={getStatusColor(enrollment.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={enrollment.paymentStatus}
                        color={getStatusColor(enrollment.paymentStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(enrollment.enrollmentDate), "dd/MM/yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Load More Fitness Enrollments Button */}
          {hasMoreFitnessEnrollments && fitnessEnrollments.length >= 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={loadMoreFitnessEnrollments}
                disabled={loadingMoreFitnessEnrollments}
              >
                {loadingMoreFitnessEnrollments ? 'Loading...' : 'Load More Fitness Enrollments'}
              </Button>
            </Box>
          )}
          
          {!hasMoreFitnessEnrollments && fitnessEnrollments.length > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                All fitness enrollments loaded ({fitnessEnrollments.length} total)
              </Typography>
            </Box>
          )}
          
          {fitnessEnrollments.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FitnessCenter sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No fitness enrollments found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Fitness enrollments will appear here once users start enrolling in plans.
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
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
