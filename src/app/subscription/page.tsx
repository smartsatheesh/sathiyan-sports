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
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  Fab,
} from "@mui/material";
import {
  Payment,
  PhoneAndroid,
  CheckCircle,
  HealthAndSafety,
  FitnessCenter,
  LocalHospital,
  Star,
  AccessTime,
  Chat,
  Edit,
  Delete,
  ArrowBack,
  Refresh,
  FilterList,
  GetApp,
  TrendingUp,
  Add,
} from "@mui/icons-material";
import { format } from "date-fns";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  champId: string;
  game: string;
  slot: string;
  subscribed: 'Yes' | 'No';
  champType?: 'kids' | 'adult' | 'veteran';
  subscriptionType?: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
  paymentDate?: string;
  nextDueDate?: string;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  court?: string;
  gender?: 'male' | 'female';
  preferredTimeSlot?: string;
}

interface Stats {
  totalSubscribed: number;
  pendingPayments: number;
  overdue: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

const SubscriptionPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [stats, setStats] = useState<Stats>({
    totalSubscribed: 0,
    pendingPayments: 0,
    overdue: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    
    if (status === "authenticated") {
      if (session?.user?.email !== "sathiyan.personal@gmail.com") {
        router.push("/");
        return;
      }
      fetchUsers();
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        const subscribedUsers = data.users.filter((user: User) => user.subscribed === 'Yes');
        setUsers(subscribedUsers);
        setFilteredUsers(subscribedUsers);
        calculateStats(subscribedUsers);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (userList: User[]) => {
    const totalSubscribed = userList.length;
    const pendingPayments = userList.filter(user => user.paymentStatus === 'pending').length;
    const overdue = userList.filter(user => user.paymentStatus === 'overdue').length;
    
    // Calculate revenue based on subscription type
    const revenue = userList.reduce((total, user) => {
      if (user.paymentStatus === 'paid') {
        const amount = getSubscriptionAmount(user.champType, user.subscriptionType, user.gender, user.preferredTimeSlot);
        return total + amount;
      }
      return total;
    }, 0);

    setStats({
      totalSubscribed,
      pendingPayments,
      overdue,
      totalRevenue: revenue,
      monthlyRevenue: revenue, // Simplified for now
    });
  };

  const getSubscriptionAmount = (champType?: string, subscriptionType?: string, gender?: string, preferredTimeSlot?: string) => {
    // Helper function to check if time slot qualifies for female discount
    const isFemalDiscountTimeSlot = (timeSlot: string): boolean => {
      if (!timeSlot) return false;
      
      // Parse the start time from time slot (e.g., "10:00 AM - 11:00 AM")
      const startTime = timeSlot.split(' - ')[0];
      const [time, period] = startTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const startHour = hour24 + minutes / 60;
      
      // Female discount applies from 10:00 AM (10.0) to 4:00 PM (16.0)
      return startHour >= 10.0 && startHour < 16.0;
    };

    // Define pricing for different championship types with gender-based pricing
    const ADULT_MALE_PRICING = {
      monthly: 1199,
      quarterly: 3399,
      'half yearly': 6299,
      yearly: 11499
    };

    const ADULT_FEMALE_PRICING = {
      monthly: 799,
      quarterly: 2099,
      'half yearly': 4099,
      yearly: 8399
    };
    
    const KIDS_PRICING = {
      monthly: 1500,
      quarterly: 4000,
      'half yearly': 8000,
      yearly: 13000
    };

    // Kids pricing is not affected by gender or time slots
    if (champType === 'kids') {
      switch (subscriptionType) {
        case 'monthly': return KIDS_PRICING.monthly;
        case 'quarterly': return KIDS_PRICING.quarterly;
        case 'half yearly': return KIDS_PRICING['half yearly'];
        case 'yearly': return KIDS_PRICING.yearly;
        default: return KIDS_PRICING.monthly;
      }
    } else {
      // Adult/veteran pricing with gender and time-based logic
      let pricing = ADULT_MALE_PRICING; // Default to male pricing
      
      // Apply female pricing only if user is female AND selected time slot is within 10 AM - 4 PM
      if (gender === 'female' && preferredTimeSlot && isFemalDiscountTimeSlot(preferredTimeSlot)) {
        pricing = ADULT_FEMALE_PRICING;
      }
      
      switch (subscriptionType) {
        case 'monthly': return pricing.monthly;
        case 'quarterly': return pricing.quarterly;
        case 'half yearly': return pricing['half yearly'];
        case 'yearly': return pricing.yearly;
        default: return pricing.monthly;
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Grace period in days after due date
  const GRACE_PERIOD_DAYS = 7;

  // Calculate overdue status based on next due date
  const getOverdueStatus = (nextDueDate: string | undefined, paymentStatus: string) => {
    if (!nextDueDate || paymentStatus === 'paid') return { isOverdue: false, isPastGrace: false };
    
    const dueDate = new Date(nextDueDate);
    const today = new Date();
    
    // Set time to start of day to avoid time-of-day issues
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Only consider overdue if payment is actually past due date (not on due date)
    const isOverdue = diffDays > 0;
    const isPastGrace = diffDays > GRACE_PERIOD_DAYS;
    
    return { isOverdue, isPastGrace, daysPastDue: Math.max(diffDays, 0) };
  };

  const getPaymentStatusColor = (status: string, nextDueDate?: string) => {
    const overdueStatus = getOverdueStatus(nextDueDate, status);
    
    // If payment is already marked as paid, use success color
    if (status === 'paid') return 'success';
    
    // If past grace period, use error (red)
    if (overdueStatus.isPastGrace) return 'error';
    
    // If overdue but within grace period, use warning (amber/orange)
    if (overdueStatus.isOverdue) return 'warning';
    
    // For pending payments not yet due
    if (status === 'pending') return 'info';
    
    // For explicitly marked overdue status
    if (status === 'overdue') return 'error';
    
    return 'default';
  };

  // Get row styling based on overdue status
  const getRowStyling = (user: User) => {
    const overdueStatus = getOverdueStatus(user.nextDueDate, user.paymentStatus);
    
    if (user.paymentStatus === 'paid') {
      return {}; // No special styling for paid users
    }
    
    if (overdueStatus.isPastGrace) {
      return {
        backgroundColor: 'rgba(211, 47, 47, 0.08)', // Light red background
        '&:hover': {
          backgroundColor: 'rgba(211, 47, 47, 0.12)', // Darker red on hover
        }
      };
    }
    
    if (overdueStatus.isOverdue) {
      return {
        backgroundColor: 'rgba(255, 152, 0, 0.08)', // Light amber background  
        '&:hover': {
          backgroundColor: 'rgba(255, 152, 0, 0.12)', // Darker amber on hover
        }
      };
    }
    
    return {}; // No special styling for on-time payments
  };

  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.champId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
      );
    }

    // Filter by payment status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => user.paymentStatus === filterStatus);
    }

    // Filter by game
    if (filterGame !== 'all') {
      filtered = filtered.filter(user => user.game === filterGame);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterStatus, filterGame]);

  const updateOverdueUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/update-overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchUsers(); // Refresh the list
        setError('');
      } else {
        throw new Error('Failed to update overdue users');
      }
    } catch (error) {
      console.error('Error updating overdue users:', error);
      setError('Failed to update overdue users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedUser),
      });

      if (response.ok) {
        await fetchUsers();
        setEditDialog(false);
        setSelectedUser(null);
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user');
    }
  };

  const uniqueGames = Array.from(new Set(users.map(user => user.game)));

  if (status === "loading") {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <HealthAndSafety color="primary" sx={{ mr: 2, fontSize: 40 }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Subscription Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage subscription billing and payment tracking
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => router.push('/admin')}
            >
              Back to Admin
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchUsers}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<TrendingUp />}
              onClick={updateOverdueUsers}
              disabled={loading}
            >
              Update Overdue
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <FitnessCenter color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Subscribed
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalSubscribed}
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
                <Payment color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Pending Payments
                  </Typography>
                  <Typography variant="h4">
                    {stats.pendingPayments}
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
                <AccessTime color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Overdue
                  </Typography>
                  <Typography variant="h4">
                    {stats.overdue}
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
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats.totalRevenue)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pricing Information Card */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Star color="primary" sx={{ mr: 1 }} />
          Pricing Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Female Pricing (10 AM - 4 PM slots)
            </Typography>
            <Typography variant="body2" component="div">
              • Monthly: ₹799 &nbsp;&nbsp;&nbsp; • Quarterly: ₹2,099<br/>
              • Half Yearly: ₹4,099 &nbsp;&nbsp;&nbsp; • Yearly: ₹8,399
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.primary" gutterBottom>
              Standard Pricing (All other slots)
            </Typography>
            <Typography variant="body2" component="div">
              • Monthly: ₹1,199 &nbsp;&nbsp;&nbsp; • Quarterly: ₹3,399<br/>
              • Half Yearly: ₹6,299 &nbsp;&nbsp;&nbsp; • Yearly: ₹11,499
            </Typography>
          </Grid>
        </Grid>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Female users get special pricing only for time slots between 10:00 AM - 4:00 PM. 
            Slots outside this range will use standard pricing regardless of gender.
          </Typography>
        </Alert>
      </Paper>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, email, champ ID, or phone"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={filterStatus}
                label="Payment Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Game</InputLabel>
              <Select
                value={filterGame}
                label="Game"
                onChange={(e) => setFilterGame(e.target.value)}
              >
                <MenuItem value="all">All Games</MenuItem>
                {uniqueGames.map((game) => (
                  <MenuItem key={game} value={game}>{game}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredUsers.length} of {users.length} users
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Payment Status Legend */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Payment Status Legend:
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }} />
              <Typography variant="body2">Paid (Green)</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: 1 }} />
              <Typography variant="body2">Overdue (Amber Row)</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(211, 47, 47, 0.1)', borderRadius: 1 }} />
              <Typography variant="body2">Past Grace Period (Red Row)</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Grace period: {GRACE_PERIOD_DAYS} days
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Subscriptions Table */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Payment Date</TableCell>
                <TableCell>Next Due Date</TableCell>
                <TableCell>Champ ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Game</TableCell>
                <TableCell>Slot</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Subscription Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Court</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No subscribed users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const overdueStatus = getOverdueStatus(user.nextDueDate, user.paymentStatus);
                  return (
                    <TableRow 
                      key={user._id} 
                      hover 
                      sx={getRowStyling(user)}
                    >
                      <TableCell>
                        {user.paymentDate ? format(new Date(user.paymentDate), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {user.nextDueDate ? format(new Date(user.nextDueDate), 'dd/MM/yyyy') : '-'}
                          </Typography>
                          {overdueStatus.isOverdue && user.paymentStatus !== 'paid' && (
                            <Chip 
                              label={overdueStatus.isPastGrace ? `${overdueStatus.daysPastDue}d past grace` : `${overdueStatus.daysPastDue}d overdue`}
                              size="small"
                              color={overdueStatus.isPastGrace ? 'error' : 'warning'}
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{user.champId}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.game}</TableCell>
                      <TableCell>{user.slot}</TableCell>
                      <TableCell>
                        <Chip
                          label={overdueStatus.isOverdue && user.paymentStatus !== 'paid' 
                            ? (overdueStatus.isPastGrace ? 'Past Grace Period' : 'Overdue') 
                            : user.paymentStatus}
                          color={getPaymentStatusColor(user.paymentStatus, user.nextDueDate) as any}
                          variant="filled"
                          size="small"
                        />
                      </TableCell>
                    <TableCell>
                      <Chip
                        label={user.champType || 'monthly'}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(getSubscriptionAmount(user.champType, user.subscriptionType, user.gender, user.preferredTimeSlot))}
                        </Typography>
                        {user.gender === 'female' && user.preferredTimeSlot && (
                          <Tooltip 
                            title={(() => {
                              const timeSlot = user.preferredTimeSlot;
                              if (!timeSlot) return '';
                              
                              const startTime = timeSlot.split(' - ')[0];
                              const [time, period] = startTime.split(' ');
                              const [hours, minutes] = time.split(':').map(Number);
                              
                              let hour24 = hours;
                              if (period === 'PM' && hours !== 12) hour24 += 12;
                              if (period === 'AM' && hours === 12) hour24 = 0;
                              
                              const startHour = hour24 + minutes / 60;
                              const isDiscountTime = startHour >= 10.0 && startHour < 16.0;
                              
                              return isDiscountTime 
                                ? 'Female discount applied (10 AM - 4 PM slot)'
                                : 'Standard pricing (outside 10 AM - 4 PM)';
                            })()}
                            placement="top"
                          >
                            <Chip
                              label={(() => {
                                const timeSlot = user.preferredTimeSlot;
                                if (!timeSlot) return '';
                                
                                const startTime = timeSlot.split(' - ')[0];
                                const [time, period] = startTime.split(' ');
                                const [hours, minutes] = time.split(':').map(Number);
                                
                                let hour24 = hours;
                                if (period === 'PM' && hours !== 12) hour24 += 12;
                                if (period === 'AM' && hours === 12) hour24 = 0;
                                
                                const startHour = hour24 + minutes / 60;
                                const isDiscountTime = startHour >= 10.0 && startHour < 16.0;
                                
                                return isDiscountTime ? 'F+' : 'F';
                              })()}
                              size="small"
                              color={(() => {
                                const timeSlot = user.preferredTimeSlot;
                                if (!timeSlot) return 'default';
                                
                                const startTime = timeSlot.split(' - ')[0];
                                const [time, period] = startTime.split(' ');
                                const [hours, minutes] = time.split(':').map(Number);
                                
                                let hour24 = hours;
                                if (period === 'PM' && hours !== 12) hour24 += 12;
                                if (period === 'AM' && hours === 12) hour24 = 0;
                                
                                const startHour = hour24 + minutes / 60;
                                const isDiscountTime = startHour >= 10.0 && startHour < 16.0;
                                
                                return isDiscountTime ? 'success' : 'default';
                              })()}
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{user.court || '-'}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Subscription Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Payment Date"
                    type="date"
                    value={selectedUser.paymentDate ? selectedUser.paymentDate.split('T')[0] : ''}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      paymentDate: e.target.value
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Next Due Date"
                    type="date"
                    value={selectedUser.nextDueDate ? selectedUser.nextDueDate.split('T')[0] : ''}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      nextDueDate: e.target.value
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={selectedUser.paymentStatus || 'pending'}
                      label="Payment Status"
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        paymentStatus: e.target.value as 'pending' | 'paid' | 'overdue'
                      })}
                    >
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Champion Type</InputLabel>
                    <Select
                      value={selectedUser.champType || 'adult'}
                      label="Champion Type"
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        champType: e.target.value as 'kids' | 'adult' | 'veteran'
                      })}
                    >
                      <MenuItem value="kids">Kids</MenuItem>
                      <MenuItem value="adult">Adult</MenuItem>
                      <MenuItem value="veteran">Veteran</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Subscription Type</InputLabel>
                    <Select
                      value={selectedUser.subscriptionType || 'monthly'}
                      label="Subscription Type"
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        subscriptionType: e.target.value as 'monthly' | 'quarterly' | 'half yearly' | 'yearly'
                      })}
                    >
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                      <MenuItem value="half yearly">Half Yearly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={selectedUser.gender || 'male'}
                      label="Gender"
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        gender: e.target.value as 'male' | 'female'
                      })}
                    >
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Preferred Time Slot</InputLabel>
                    <Select
                      value={selectedUser.preferredTimeSlot || ''}
                      label="Preferred Time Slot"
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        preferredTimeSlot: e.target.value
                      })}
                    >
                      <MenuItem value="06:00 AM - 07:00 AM">06:00 AM - 07:00 AM</MenuItem>
                      <MenuItem value="07:00 AM - 08:00 AM">07:00 AM - 08:00 AM</MenuItem>
                      <MenuItem value="08:00 AM - 09:00 AM">08:00 AM - 09:00 AM</MenuItem>
                      <MenuItem value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</MenuItem>
                      <MenuItem value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</MenuItem>
                      <MenuItem value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</MenuItem>
                      <MenuItem value="12:00 PM - 01:00 PM">12:00 PM - 01:00 PM</MenuItem>
                      <MenuItem value="01:00 PM - 02:00 PM">01:00 PM - 02:00 PM</MenuItem>
                      <MenuItem value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</MenuItem>
                      <MenuItem value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</MenuItem>
                      <MenuItem value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM</MenuItem>
                      <MenuItem value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM</MenuItem>
                      <MenuItem value="06:00 PM - 07:00 PM">06:00 PM - 07:00 PM</MenuItem>
                      <MenuItem value="07:00 PM - 08:00 PM">07:00 PM - 08:00 PM</MenuItem>
                      <MenuItem value="08:00 PM - 09:00 PM">08:00 PM - 09:00 PM</MenuItem>
                      <MenuItem value="09:00 PM - 10:00 PM">09:00 PM - 10:00 PM</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Court"
                    value={selectedUser.court || ''}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      court: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubscriptionPage;