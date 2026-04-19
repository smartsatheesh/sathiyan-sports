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
  Cancel,
  AttachMoney,
  Receipt,
  People,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import { format } from "date-fns";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  mobile?: string;
  champId: string;
  game?: string;
  slot?: string;
  preferredSport?: string;
  selectedCourt?: string;
  subscribed?: 'Yes' | 'No';
  champType?: 'kids' | 'adult' | 'veteran';
  subscriptionType?: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
  subscriptionPrice?: number;
  amount?: number; // Add amount field
  paymentDate?: string;
  lastPaidDate?: string;
  nextDueDate?: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'pending' | 'paid' | 'overdue';
  court?: string;
  gender?: 'male' | 'female';
  preferredTimeSlot?: string;
  subscriptionId?: string;
  isOverdue?: boolean;
  daysPastDue?: number;
  isPastGrace?: boolean;
  gracePeriod?: number;
  createdAt?: string;
  updatedAt?: string;
  comments?: string;
  registeredSlots?: Array<{ timeSlot: string; court?: string }>;
}

interface Stats {
  totalSubscribed: number;
  totalUsers: number;
  usersNotSubscribed: number;
  penetrationRate: number;
  pendingPayments: number;
  overdue: number;
  totalRevenue: number;
  monthlyRevenue: number;
  // Subscription-specific stats
  activeSubscriptions: number;
  expiredSubscriptions: number;
  monthlySubscribers: number;
  yearlySubscribers: number;
  averageSubscriptionValue: number;
  paidThisMonth: number;
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
    totalUsers: 0,
    usersNotSubscribed: 0,
    penetrationRate: 0,
    pendingPayments: 0,
    overdue: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    monthlySubscribers: 0,
    yearlySubscribers: 0,
    averageSubscriptionValue: 0,
    paidThisMonth: 0,
  });
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/");
        return;
      }
      fetchUsers();
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching subscriptions and user count...');
      console.log('🔐 Session details:', session);
      
      // Fetch subscriptions and total users count in parallel
      const [subResponse, usersResponse] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/admin/users?limit=1')
      ]);
      
      console.log('📡 Subscription response status:', subResponse.status);
      console.log('📡 Users response status:', usersResponse.status);
      
      if (!subResponse.ok) {
        const errorText = await subResponse.text();
        console.error('❌ Subscription API Error:', errorText);
        throw new Error(`Error: ${subResponse.status} ${subResponse.statusText} - ${errorText}`);
      }
      
      const subData = await subResponse.json();
      let totalUsersCount = 0;
      
      // Parse total users count from header or response
      if (usersResponse.ok) {
        try {
          const userData = await usersResponse.json();
          totalUsersCount = userData.total || 0;
        } catch (err) {
          console.warn('Could not parse users count:', err);
        }
      }
      
      console.log('📊 Raw subscription response:', subData);
      console.log('📊 Subscription count:', subData.subscriptions?.length);
      console.log('👥 Total users count:', totalUsersCount);
      
      if (subData && subData.subscriptions) {
        console.log('✅ Processing', subData.subscriptions.length, 'subscriptions');
        
        // Transform subscription data to match the expected user data structure
        const transformedData = subData.subscriptions.map((sub: any, index: number) => {
          console.log(`🔄 Transforming subscription ${index + 1}:`, {
            id: sub._id,
            userName: sub.userId?.name,
            amount: sub.amount,
            subscriptionPrice: sub.subscriptionPrice,
            rawSub: sub, // Log the raw subscription object
            paymentStatus: sub.paymentStatus,
            isOverdue: sub.isOverdue,
            daysPastDue: sub.daysPastDue,
            isPastGrace: sub.isPastGrace,
            nextDueDate: sub.nextDueDate
          });
          
          const transformedUser = {
            _id: sub.userId?._id || sub._id,
            name: sub.userId?.name || '',
            email: sub.userId?.email || '',
            phone: sub.userId?.phone || '',
            mobile: sub.userId?.mobile || '',
            champId: sub.userId?.champId || '',
            game: sub.userId?.preferredSport || sub.userId?.game || '',
            slot: sub.userId?.preferredTimeSlot || sub.userId?.slot || '',
            preferredSport: sub.userId?.preferredSport || '',
            selectedCourt: sub.userId?.selectedCourt || '',
            subscribed: 'Yes', // All entries in subscription collection are subscribed
            champType: sub.userId?.champType || 'adult',
            subscriptionType: sub.subscriptionType,
            subscriptionPrice: sub.amount, // Use sub.amount as the main price
            amount: sub.amount, // Direct mapping from subscription amount
            paymentDate: sub.lastPaidDate,
            lastPaidDate: sub.lastPaidDate,
            nextDueDate: sub.nextDueDate,
            paymentStatus: sub.paymentStatus?.toLowerCase() || 'pending',
            court: sub.userId?.selectedCourt || sub.userId?.court || '',
            gender: sub.userId?.gender,
            preferredTimeSlot: sub.userId?.preferredTimeSlot,
            subscriptionId: sub._id,
            isOverdue: sub.isOverdue,
            daysPastDue: sub.daysPastDue,
            isPastGrace: sub.isPastGrace,
            gracePeriod: sub.gracePeriod,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
            comments: sub.userId?.comments || '',
            registeredSlots: sub.userId?.registeredSlots || []
          };
          
          console.log(`✅ Transformed user ${index + 1}:`, {
            name: transformedUser.name,
            amount: transformedUser.amount,
            subscriptionPrice: transformedUser.subscriptionPrice,
            paymentStatus: transformedUser.paymentStatus,
            isOverdue: transformedUser.isOverdue,
            daysPastDue: transformedUser.daysPastDue
          });
          
          return transformedUser;
        });
        
        console.log('✅ Transformed data:', transformedData);
        console.log('✅ Setting', transformedData.length, 'users');
        
        setUsers(transformedData);
        setFilteredUsers(transformedData);
        calculateStats(transformedData, totalUsersCount);
        console.log('✅ Subscription data transformed and set successfully:', transformedData.length, 'subscriptions');
      } else {
        console.error('❌ Unexpected data structure:', subData);
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching subscriptions:', error);
      setError('Failed to load subscription data: ' + error.message);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (userList: User[], totalUsersCount: number = 0) => {
    console.log('📊 Calculating comprehensive subscription stats for', userList.length, 'users out of', totalUsersCount, 'total');
    
    const totalSubscribed = userList.length;
    const usersNotSubscribed = Math.max(0, totalUsersCount - totalSubscribed);
    const penetrationRate = totalUsersCount > 0 ? (totalSubscribed / totalUsersCount) * 100 : 0;
    const pendingPayments = userList.filter(user => 
      user.paymentStatus === 'pending' || user.paymentStatus === 'Pending'
    ).length;
    const overdue = userList.filter(user => 
      user.isOverdue || user.paymentStatus === 'overdue'
    ).length;
    
    // Active vs Expired subscriptions
    const now = new Date();
    const activeSubscriptions = userList.filter(user => {
      if (!user.nextDueDate) return true; // No due date means ongoing
      return new Date(user.nextDueDate) > now;
    }).length;
    const expiredSubscriptions = totalSubscribed - activeSubscriptions;
    
    // Subscription type breakdown
    const monthlySubscribers = userList.filter(user => 
      user.subscriptionType === 'monthly'
    ).length;
    const yearlySubscribers = userList.filter(user => 
      user.subscriptionType === 'yearly'
    ).length;
    
    // Revenue calculations - ONLY count paid subscriptions
    const totalRevenue = userList.reduce((total, user) => {
      if (user.paymentStatus === 'paid' || user.paymentStatus === 'Paid') {
        const amount = user.subscriptionPrice || user.amount || 
          getSubscriptionAmount(user.champType, user.subscriptionType, user.gender, user.preferredTimeSlot);
        console.log(`💰 Adding revenue for ${user.name}: ₹${amount} (status: ${user.paymentStatus})`);
        return total + amount;
      }
      return total;
    }, 0);
    
    // Current month's payments - filter by subscription startDate for accurate monthly revenue
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const paidThisMonth = userList.filter(user => {
      // Only count paid subscriptions where the subscription started this month
      if ((user.paymentStatus === 'paid' || user.paymentStatus === 'Paid') && user.createdAt) {
        const subscriptionDate = new Date(user.createdAt);
        return subscriptionDate >= currentMonthStart && subscriptionDate <= currentMonthEnd;
      }
      return false;
    }).reduce((total, user) => {
      const amount = user.subscriptionPrice || user.amount || 
        getSubscriptionAmount(user.champType, user.subscriptionType, user.gender, user.preferredTimeSlot);
      return total + amount;
    }, 0);
    
    // Average subscription value
    const paidUsers = userList.filter(user => user.paymentStatus === 'paid' || user.paymentStatus === 'Paid');
    const averageSubscriptionValue = paidUsers.length > 0 ? totalRevenue / paidUsers.length : 0;

    const newStats = {
      totalSubscribed,
      totalUsers: totalUsersCount,
      usersNotSubscribed,
      penetrationRate,
      pendingPayments,
      overdue,
      totalRevenue,
      monthlyRevenue: paidThisMonth, // Last 30 days
      activeSubscriptions,
      expiredSubscriptions,
      monthlySubscribers,
      yearlySubscribers,
      averageSubscriptionValue,
      paidThisMonth,
    };
    
    console.log('📊 Comprehensive subscription stats calculated:', {
      totalSubscribed,
      totalUsers: totalUsersCount,
      usersNotSubscribed,
      penetrationRate: penetrationRate.toFixed(2) + '%',
      pendingPayments,
      overdue,
      totalRevenue,
      activeSubscriptions,
      expiredSubscriptions,
      monthlySubscribers,
      yearlySubscribers,
      averageSubscriptionValue: Math.round(averageSubscriptionValue),
      paidThisMonth,
      paidUsers: paidUsers.length
    });
    setStats(newStats);
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
  const getOverdueStatus = (nextDueDate: string | undefined, paymentStatus: string, user?: User) => {
    // Use pre-calculated values from subscription if available
    if (user && user.isOverdue !== undefined && user.isPastGrace !== undefined) {
      return { 
        isOverdue: user.isOverdue, 
        isPastGrace: user.isPastGrace, 
        daysPastDue: user.daysPastDue || 0 
      };
    }

    // Fallback to manual calculation
    if (!nextDueDate || paymentStatus === 'paid' || paymentStatus === 'Paid') {
      return { isOverdue: false, isPastGrace: false, daysPastDue: 0 };
    }
    
    const dueDate = new Date(nextDueDate);
    const today = new Date();
    
    // Set time to start of day to avoid time-of-day issues
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Only consider overdue if payment is actually past due date (not on due date)
    const isOverdue = diffDays > 0;
    const gracePeriod = user?.gracePeriod || GRACE_PERIOD_DAYS;
    const isPastGrace = diffDays > gracePeriod;
    
    return { isOverdue, isPastGrace, daysPastDue: Math.max(diffDays, 0) };
  };

  const getPaymentStatusColor = (status: string, nextDueDate?: string, user?: User) => {
    const overdueStatus = getOverdueStatus(nextDueDate, status, user);
    
    // If payment is already marked as paid, use success color
    if (status === 'paid' || status === 'Paid') return 'success';
    
    // If past grace period, use error (red)
    if (overdueStatus.isPastGrace) return 'error';
    
    // If overdue but within grace period, use warning (amber/orange)
    if (overdueStatus.isOverdue) return 'warning';
    
    // For pending payments not yet due
    if (status === 'pending' || status === 'Pending') return 'info';
    
    // For explicitly marked overdue status
    if (status === 'overdue') return 'error';
    
    return 'default';
  };

  // Get row styling based on overdue status
  const getRowStyling = (user: User) => {
    const overdueStatus = getOverdueStatus(user.nextDueDate, user.paymentStatus, user);
    
    if (user.paymentStatus === 'paid' || user.paymentStatus === 'Paid') {
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

  // Sorting functions
  const handleSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sortable header component
  const SortableHeader = ({ column, children }: { column: keyof User; children: React.ReactNode }) => (
    <TableCell 
      onClick={() => handleSort(column)}
      sx={{ 
        cursor: 'pointer', 
        userSelect: 'none',
        '&:hover': { backgroundColor: 'action.hover' }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {children}
        {sortConfig.key === column && (
          sortConfig.direction === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
        )}
      </Box>
    </TableCell>
  );

  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.champId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm) ||
        user.mobile?.includes(searchTerm)
      );
    }

    // Filter by payment status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => {
        const status = user.paymentStatus?.toLowerCase();
        const filterStatusLower = filterStatus.toLowerCase();
        return status === filterStatusLower;
      });
    }

    // Filter by game
    if (filterGame !== 'all') {
      filtered = filtered.filter(user => 
        user.game === filterGame || 
        user.preferredSport === filterGame
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Convert to string for comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (aStr < bStr) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterStatus, filterGame, sortConfig]);

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

  const handleAddFee = (user: User) => {
    // Create URL with user data pre-filled
    const params = new URLSearchParams({
      champId: user.champId || '',
      userName: user.name || '',
      userEmail: user.email || '',
      userMobile: user.mobile || user.phone || '',
      returnUrl: '/subscription'
    });
    
    // Navigate to fee collection page with pre-filled data
    router.push(`/admin/fee-collection?${params.toString()}`);
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

  const uniqueGames = Array.from(new Set(users.map(user => user.preferredSport || user.game).filter(Boolean)));

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

      {/* Comprehensive Subscription Statistics */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
        📊 Subscription Analytics Dashboard
      </Typography>
      
      {/* User Coverage Stats Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <People sx={{ mr: 2, color: 'white', fontSize: 30 }} />
                <Box>
                  <Typography color="white" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'white' }}>
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    In the system
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle sx={{ mr: 2, color: 'white', fontSize: 30 }} />
                <Box>
                  <Typography color="white" gutterBottom>
                    Subscribed Users
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'white' }}>
                    {stats.totalSubscribed}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Active subscriptions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Cancel sx={{ mr: 2, color: 'white', fontSize: 30 }} />
                <Box>
                  <Typography color="white" gutterBottom>
                    Not Subscribed
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'white' }}>
                    {stats.usersNotSubscribed}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Need subscription
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp sx={{ mr: 2, color: 'white', fontSize: 30 }} />
                <Box>
                  <Typography color="white" gutterBottom>
                    Penetration Rate
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'white' }}>
                    {stats.penetrationRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Coverage ratio
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Primary Stats Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <FitnessCenter color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Subscriptions
                  </Typography>
                  <Typography variant="h4">
                    {stats.activeSubscriptions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Currently active
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
                  <Typography variant="caption" color="text.secondary">
                    Awaiting payment
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
                  <Typography variant="caption" color="text.secondary">
                    Past due date
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
                  <Typography variant="caption" color="text.secondary">
                    Lifetime earnings
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Secondary Stats Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Subscriptions
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeSubscriptions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Currently active
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
                <Cancel color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Expired/Cancelled
                  </Typography>
                  <Typography variant="h5">
                    {stats.expiredSubscriptions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    No longer active
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
                <AttachMoney color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Avg. Subscription Value
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(stats.averageSubscriptionValue)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Per subscriber
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
                <Receipt color="secondary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Revenue (Last 30d)
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(stats.paidThisMonth)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Recent payments
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
                <SortableHeader column="champId">Champ ID</SortableHeader>
                <SortableHeader column="name">Name</SortableHeader>
                <TableCell>Game</TableCell>
                <TableCell>Preferred Slot</TableCell>
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
                  <TableCell colSpan={12} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No subscribed users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  console.log('🔍 Rendering user:', user);
                  const overdueStatus = getOverdueStatus(user.nextDueDate, user.paymentStatus, user);
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
                      <TableCell>{user.preferredSport || user.game || '-'}</TableCell>
                      <TableCell>{user.preferredTimeSlot || '-'}</TableCell>
                      <TableCell>{user.slot || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={overdueStatus.isOverdue && (user.paymentStatus !== 'paid' && user.paymentStatus !== 'Paid') 
                            ? (overdueStatus.isPastGrace ? 'Past Grace Period' : 'Overdue') 
                            : user.paymentStatus}
                          color={getPaymentStatusColor(user.paymentStatus, user.nextDueDate, user) as any}
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
                          {(() => {
                            const amount = user.subscriptionPrice || user.amount || getSubscriptionAmount(user.champType, user.subscriptionType, user.gender, user.preferredTimeSlot);
                            console.log(`💰 Rendering amount for ${user.name}:`, {
                              subscriptionPrice: user.subscriptionPrice,
                              amount: user.amount,
                              calculated: getSubscriptionAmount(user.champType, user.subscriptionType, user.gender, user.preferredTimeSlot),
                              final: amount
                            });
                            return formatCurrency(amount);
                          })()}
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
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Add Fee">
                          <IconButton
                            size="small"
                            onClick={() => handleAddFee(user)}
                            color="success"
                          >
                            <Add />
                          </IconButton>
                        </Tooltip>
                      </Box>
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
                {/* Slot Selection - Only for Badminton */}
                {selectedUser.preferredSport === 'Shuttle Badminton' && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Registered Slots (Badminton Only)
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Select Courts & Slots</InputLabel>
                        <Select
                          multiple
                          value={selectedUser.registeredSlots?.map(s => `${s.court}-${s.timeSlot}`) || []}
                          label="Select Courts & Slots"
                          onChange={(e) => {
                            const values = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                            const slots = values.map(val => {
                              const [court, timeSlot] = val.split('-');
                              return { court, timeSlot };
                            });
                            setSelectedUser({
                              ...selectedUser,
                              registeredSlots: slots
                            });
                          }}
                        >
                          {['S1', 'S2', 'S3'].map(court =>
                            [
                              "06:00 AM - 07:00 AM", "07:00 AM - 08:00 AM", "08:00 AM - 09:00 AM",
                              "09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
                              "12:00 PM - 01:00 PM", "01:00 PM - 02:00 PM", "02:00 PM - 03:00 PM",
                              "03:00 PM - 04:00 PM", "04:00 PM - 05:00 PM", "05:00 PM - 06:00 PM",
                              "06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM", "08:00 PM - 09:00 PM",
                              "09:00 PM - 10:00 PM"
                            ].map(slot => (
                              <MenuItem key={`${court}-${slot}`} value={`${court}-${slot}`}>
                                {court} - {slot}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}
                {/* Comments/Notes Field */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Comments / Notes"
                    placeholder="Add any notes or comments about this user..."
                    value={selectedUser.comments || ''}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      comments: e.target.value
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