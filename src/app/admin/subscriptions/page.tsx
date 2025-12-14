"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  TablePagination,
  Tooltip,
} from "@mui/material";
import {
  Edit,
  Delete,
  ArrowBack,
  Refresh,
  Payment,
  FilterList,
  GetApp,
  HealthAndSafety,
  TrendingUp,
  People,
  CheckCircle,
  Cancel,
  Warning,
  AttachMoney,
  Receipt,
  Assessment,
} from "@mui/icons-material";
import { format } from "date-fns";

// Utility function for safe date formatting
const formatSafeDate = (dateString: string | undefined | null, formatPattern: string = 'dd/MM/yyyy'): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return format(date, formatPattern);
};

interface Subscription {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    champId: string;
  };
  champId: string;
  userName: string;
  userEmail: string;
  userMobile: string;
  subscriptionType: string;
  mode: string;
  amount: number;
  duration: number;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  transactionId?: string;
  preferredSport?: string;
  selectedCourt?: string;
  notes?: string;
  nextDueDate: string;
  autoRenewal: boolean;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  updatedBy?: {
    name: string;
    email: string;
  };
}

interface SubscriptionStats {
  overview: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    pendingSubscriptions: number;
    overdueSubscriptions: number;
    totalRevenue: number;
    averageAmount: number;
    upcomingRenewals: number;
    // Enhanced stats from subscription page
    expiredSubscriptions: number;
    monthlySubscribers: number;
    yearlySubscribers: number;
    averageSubscriptionValue: number;
    paidThisMonth: number;
    collectionRate: number;
  };
}

const AdminSubscriptionsPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<keyof Subscription>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    console.log('🔍 Session check:', session?.user?.email, 'Role:', session?.user?.role, 'Name:', session?.user?.name);
    console.log('🔍 Session object:', session);
    
    // Check if user has admin role
    if (!session?.user?.role || session.user.role !== 'admin') {
      console.log('❌ No admin role, redirecting to home');
      router.push('/');
      return;
    }
    
    console.log('✅ Admin role confirmed, fetching data');
    fetchSubscriptions();
    fetchStats();
  }, [session, router]);

  // Calculate stats whenever subscriptions change
  useEffect(() => {
    if (subscriptions.length > 0) {
      console.log('🔄 ADMIN PAGE: Subscriptions changed, recalculating stats for', subscriptions.length, 'items');
      calculateStatsLocally();
    }
  }, [subscriptions]);

  // Reset page to 0 when filters change to avoid pagination errors
  useEffect(() => {
    setPage(0);
  }, [filterStatus, searchTerm]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      console.log('🔍 ADMIN PAGE: Fetching subscriptions from unified API...');
      const response = await fetch('/api/subscription');
      console.log('📡 ADMIN PAGE: Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ADMIN PAGE: API Error:', errorText);
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 ADMIN PAGE: Raw subscription response:', data);
      console.log('📊 ADMIN PAGE: Subscription count:', data.subscriptions?.length);
      
      if (data.subscriptions) {
        console.log('✅ ADMIN PAGE: Setting', data.subscriptions.length, 'subscriptions');
        console.log('🔍 ADMIN PAGE: Sample subscription data:', data.subscriptions[0]);
        console.log('🔍 ADMIN PAGE: Amount fields in first subscription:', {
          amount: data.subscriptions[0]?.amount,
          subscriptionPrice: data.subscriptions[0]?.subscriptionPrice
        });
        setSubscriptions(data.subscriptions);
        // Calculate stats locally since we have the data - no timeout needed
      } else {
        console.warn('⚠️ ADMIN PAGE: No subscriptions in response');
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('❌ ADMIN PAGE: Error fetching subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('🔍 Fetching stats from admin API...');
      const response = await fetch('/api/admin/subscription-stats');
      console.log('📊 Stats response status:', response.status);
      
      if (!response.ok) {
        console.warn('⚠️ Stats API not available, calculating locally');
        // Calculate stats locally from subscriptions
        calculateStatsLocally();
        return;
      }
      
      const data = await response.json();
      console.log('📊 Stats data:', data);
      setStats(data);
    } catch (error) {
      console.error('❌ Error fetching subscription stats:', error);
      // Calculate stats locally from subscriptions
      calculateStatsLocally();
    }
  };

  const calculateStatsLocally = () => {
    console.log('🔄 ADMIN PAGE: calculateStatsLocally called with', subscriptions.length, 'subscriptions');
    
    if (subscriptions.length === 0) {
      console.log('❌ ADMIN PAGE: No subscriptions to calculate from');
      return;
    }
    
    console.log('📊 ADMIN PAGE: Calculating comprehensive admin stats locally from', subscriptions.length, 'subscriptions');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Basic counts
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
    const pendingSubscriptions = subscriptions.filter(sub => 
      sub.paymentStatus === 'Pending' || sub.paymentStatus === 'pending'
    ).length;
    
    const overdueSubscriptions = subscriptions.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return today > dueDate;
    }).length;

    // Enhanced calculations - Active vs Expired subscriptions  
    const now = new Date();
    const activeByDueDate = subscriptions.filter(sub => {
      if (!sub.nextDueDate) return true; // No due date means ongoing
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today; // Active if due date is today or future
    }).length;
    
    // Expired = Overdue (same thing - past due date)
    const expiredSubscriptions = overdueSubscriptions;
    
    // Subscription type breakdown
    const monthlySubscribers = subscriptions.filter(sub => 
      sub.subscriptionType === 'monthly'
    ).length;
    const yearlySubscribers = subscriptions.filter(sub => 
      sub.subscriptionType === 'yearly' 
    ).length;

    // Revenue calculations
    const totalRevenue = subscriptions.reduce((total, sub) => {
      if (sub.paymentStatus === 'Paid' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'completed') {
        const revenue = sub.amount || 0;
        return total + revenue;
      }
      return total;
    }, 0);

    // This month's payments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const paidThisMonth = subscriptions.filter(sub => {
      if (sub.paymentStatus === 'Paid' || sub.paymentStatus === 'paid') {
        return new Date(sub.createdAt) > thirtyDaysAgo;
      }
      return false;
    }).reduce((total, sub) => {
      return total + (sub.amount || 0);
    }, 0);

    // Calculate average amounts
    const paidSubscriptions = subscriptions.filter(sub => 
      sub.paymentStatus === 'Paid' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'completed'
    );
    const averageAmount = paidSubscriptions.length > 0 
      ? totalRevenue / paidSubscriptions.length 
      : 0;
    const averageSubscriptionValue = averageAmount;

    // Collection rate
    const collectionRate = totalSubscriptions > 0 ? (paidSubscriptions.length / totalSubscriptions) * 100 : 0;

    // Calculate upcoming renewals (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingRenewals = subscriptions.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      return dueDate >= today && dueDate <= thirtyDaysFromNow;
    }).length;

    const enhancedAdminStats = {
      overview: {
        totalSubscriptions,
        activeSubscriptions,
        pendingSubscriptions,
        overdueSubscriptions,
        totalRevenue: Math.round(totalRevenue),
        averageAmount: Math.round(averageAmount),
        upcomingRenewals,
        expiredSubscriptions,
        monthlySubscribers,
        yearlySubscribers,
        averageSubscriptionValue: Math.round(averageSubscriptionValue),
        paidThisMonth: Math.round(paidThisMonth),
        collectionRate: Math.round(collectionRate),
      }
    };

    console.log('📊 ADMIN PAGE: Enhanced admin stats calculated:', enhancedAdminStats);
    console.log('💰 ADMIN PAGE: Revenue breakdown:', {
      totalRevenue: Math.round(totalRevenue),
      paidThisMonth: Math.round(paidThisMonth),
      averageAmount: Math.round(averageAmount),
      collectionRate: Math.round(collectionRate) + '%'
    });
    
    setStats(enhancedAdminStats);
    console.log('✅ ADMIN PAGE: Stats set successfully');
  };

  const handleEditSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(`/api/subscription/${selectedSubscription._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: selectedSubscription.paymentStatus,
          paymentMethod: selectedSubscription.paymentMethod,
          amount: selectedSubscription.amount,
          autoRenewal: selectedSubscription.autoRenewal
        })
      });

      if (response.ok) {
        fetchSubscriptions();
        fetchStats();
        setEditDialogOpen(false);
        setSelectedSubscription(null);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      const response = await fetch(`/api/subscription/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchSubscriptions();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  // Filtering and sorting logic
  const filteredAndSortedSubscriptions = useMemo(() => {
    let filtered = subscriptions.filter(subscription => {
      // Special handling for overdue status
      let matchesStatus = false;
      if (filterStatus === 'all') {
        matchesStatus = true;
      } else if (filterStatus === 'overdue') {
        // Check if subscription is overdue based on nextDueDate
        if (subscription.nextDueDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDate = new Date(subscription.nextDueDate);
          dueDate.setHours(0, 0, 0, 0);
          matchesStatus = today > dueDate;
        } else {
          matchesStatus = false;
        }
      } else {
        // Regular paymentStatus matching
        matchesStatus = subscription.paymentStatus.toLowerCase() === filterStatus.toLowerCase();
      }
      
      const matchesSearch = !searchTerm || 
        subscription.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.userId.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.userId.champId.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });

    // Sort subscriptions
    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [subscriptions, filterStatus, searchTerm, sortBy, sortOrder]);

  const paginatedSubscriptions = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredAndSortedSubscriptions.slice(start, start + rowsPerPage);
  }, [filteredAndSortedSubscriptions, page, rowsPerPage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'success';
      case 'Pending': return 'warning';
      case 'Overdue': return 'error';
      case 'Cancelled': return 'default';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null || isNaN(amount)) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const SortableHeader = ({ column, children }: { column: keyof Subscription; children: React.ReactNode }) => (
    <TableCell
      onClick={() => {
        if (sortBy === column) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
          setSortBy(column);
          setSortOrder('asc');
        }
      }}
      sx={{ cursor: 'pointer', fontWeight: 'bold' }}
    >
      {children}
      {sortBy === column && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
    </TableCell>
  );

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <IconButton onClick={() => router.push('/admin')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <HealthAndSafety color="primary" sx={{ mr: 2 }} />
            <Typography variant="h4" component="h1">
              Subscription Management
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => { fetchSubscriptions(); fetchStats(); }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Payment />}
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/test-notifications', {
                    method: 'POST'
                  });
                  const result = await response.json();
                  if (response.ok) {
                    alert('Test notifications sent successfully!');
                  } else {
                    alert('Failed to send test notifications: ' + result.error);
                  }
                } catch (error) {
                  alert('Error sending test notifications');
                }
              }}
            >
              Test Notifications
            </Button>
            <Button
              variant="contained"
              startIcon={<GetApp />}
              onClick={() => window.open('/api/subscription/export', '_blank')}
            >
              Export Data
            </Button>
          </Box>
        </Box>

        {/* Enhanced Stats Cards */}
        {stats ? (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: 'green' }}>
              📊 ADMIN STATS LOADED: Total = {stats.overview.totalSubscriptions} subscription records found
              {stats.overview.totalSubscriptions < 40 && (
                <><br/>⚠️ <strong>Note:</strong> Some users may be marked as subscribed but missing subscription records.</>
              )}
            </Typography>
            {/* Overview Stats Row 1 */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Total Subscriptions
                      </Typography>
                      <Typography variant="h4" component="h2">
                        {stats.overview.totalSubscriptions}
                      </Typography>
                    </Box>
                    <People color="primary" sx={{ fontSize: 40 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Active Subscriptions
                      </Typography>
                      <Typography variant="h4" component="h2" color="success.main">
                        {stats.overview.activeSubscriptions}
                      </Typography>
                    </Box>
                    <CheckCircle color="success" sx={{ fontSize: 40 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Expired/Overdue Subscriptions
                      </Typography>
                      <Typography variant="h4" component="h2" color="error.main">
                        {stats.overview.expiredSubscriptions}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                        (Past due date)
                      </Typography>
                    </Box>
                    <Cancel color="error" sx={{ fontSize: 40 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Overdue (Same Count)
                      </Typography>
                      <Typography variant="h4" component="h2" color="warning.main">
                        {stats.overview.overdueSubscriptions}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                        (Same as expired)
                      </Typography>
                    </Box>
                    <Warning color="warning" sx={{ fontSize: 40 }} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Revenue Stats Row 2 */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Total Revenue
                      </Typography>
                      <Typography variant="h5" component="h2" color="primary.main">
                        {formatCurrency(stats.overview.totalRevenue)}
                      </Typography>
                    </Box>
                    <AttachMoney color="primary" sx={{ fontSize: 40 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Revenue This Month
                      </Typography>
                      <Typography variant="h5" component="h2" color="success.main">
                        {formatCurrency(stats.overview.paidThisMonth)}
                      </Typography>
                    </Box>
                    <Receipt color="success" sx={{ fontSize: 40 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Average Amount
                      </Typography>
                      <Typography variant="h5" component="h2">
                        {formatCurrency(stats.overview.averageAmount)}
                      </Typography>
                    </Box>
                    <TrendingUp color="info" sx={{ fontSize: 40 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Collection Rate
                      </Typography>
                      <Typography variant="h5" component="h2" color="info.main">
                        {stats.overview.collectionRate}%
                      </Typography>
                    </Box>
                    <Assessment color="info" sx={{ fontSize: 40 }} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        ) : (
          <Typography variant="h6" sx={{ mb: 2, color: 'red' }}>
            ❌ ADMIN STATS NOT LOADED: {subscriptions.length} subscriptions available
          </Typography>
        )}

        {/* Filters */}
        <Box display="flex" gap={2} mb={3} alignItems="center">
          <TextField
            label="Search users..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={filterStatus}
              label="Status Filter"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Subscriptions Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <SortableHeader column="userId">User</SortableHeader>
                <SortableHeader column="subscriptionType">Plan</SortableHeader>
                <SortableHeader column="mode">Mode</SortableHeader>
                <SortableHeader column="amount">Amount</SortableHeader>
                <SortableHeader column="paymentStatus">Status</SortableHeader>
                <TableCell>Payment Method</TableCell>
                <SortableHeader column="startDate">Start Date</SortableHeader>
                <SortableHeader column="endDate">End Date</SortableHeader>
                <TableCell>Auto Renewal</TableCell>
                <TableCell>Audit Trail</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSubscriptions.map((subscription) => (
                <TableRow key={subscription._id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {subscription.userId.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {subscription.userId.champId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={subscription.subscriptionType} 
                      color="primary" 
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={subscription.mode || 'standard'} 
                      color={subscription.mode === 'flexible' ? 'secondary' : 'default'}
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                    {subscription.mode === 'flexible' && (
                      <Typography variant="caption" color="secondary" display="block">
                        +₹500
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {(() => {
                        const amount = subscription.amount || 0;
                        console.log(`💰 Admin page - Rendering amount for ${subscription.userName}:`, {
                          amount: subscription.amount,
                          final: amount
                        });
                        return formatCurrency(amount);
                      })()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {subscription.duration} month{subscription.duration > 1 ? 's' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={subscription.paymentStatus} 
                      color={getStatusColor(subscription.paymentStatus) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {subscription.paymentMethod || '-'}
                  </TableCell>
                  <TableCell>
                    {formatSafeDate(subscription.startDate)}
                  </TableCell>
                  <TableCell>
                    {formatSafeDate(subscription.endDate)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={subscription.autoRenewal ? 'Yes' : 'No'} 
                      color={subscription.autoRenewal ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <Typography variant="caption" color="textSecondary">
                        Created by: {subscription.createdBy?.name || 'Unknown'}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {formatSafeDate(subscription.createdAt, 'dd/MM/yyyy HH:mm')}
                      </Typography>
                      {subscription.updatedBy && (
                        <>
                          <br />
                          <Typography variant="caption" color="primary">
                            Updated by: {subscription.updatedBy.name}
                          </Typography>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit Subscription">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Subscription">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteSubscription(subscription._id)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedSubscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No subscriptions found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredAndSortedSubscriptions.length}
          rowsPerPage={rowsPerPage}
          page={Math.min(page, Math.max(0, Math.ceil(filteredAndSortedSubscriptions.length / rowsPerPage) - 1))}
          onPageChange={(event, newPage) => {
            const maxPage = Math.max(0, Math.ceil(filteredAndSortedSubscriptions.length / rowsPerPage) - 1);
            setPage(Math.min(newPage, maxPage));
          }}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogContent>
            {selectedSubscription && (
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Payment Status</InputLabel>
                      <Select
                        value={selectedSubscription.paymentStatus}
                        label="Payment Status"
                        onChange={(e) => setSelectedSubscription({
                          ...selectedSubscription,
                          paymentStatus: e.target.value
                        })}
                      >
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Paid">Paid</MenuItem>
                        <MenuItem value="Overdue">Overdue</MenuItem>
                        <MenuItem value="Cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={selectedSubscription.paymentMethod || ''}
                        label="Payment Method"
                        onChange={(e) => setSelectedSubscription({
                          ...selectedSubscription,
                          paymentMethod: e.target.value
                        })}
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="PhonePe">PhonePe</MenuItem>
                        <MenuItem value="GPay">GPay</MenuItem>
                        <MenuItem value="WhatsApp">WhatsApp</MenuItem>
                        <MenuItem value="Cash">Cash</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Amount (₹)"
                      type="number"
                      value={selectedSubscription.amount}
                      onChange={(e) => setSelectedSubscription({
                        ...selectedSubscription,
                        amount: parseFloat(e.target.value) || 0
                      })}
                      InputProps={{
                        inputProps: { min: 0, step: 0.01 }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Auto Renewal</InputLabel>
                      <Select
                        value={selectedSubscription.autoRenewal ? 'true' : 'false'}
                        label="Auto Renewal"
                        onChange={(e) => setSelectedSubscription({
                          ...selectedSubscription,
                          autoRenewal: e.target.value === 'true'
                        })}
                      >
                        <MenuItem value="true">Enabled</MenuItem>
                        <MenuItem value="false">Disabled</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleEditSubscription}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default AdminSubscriptionsPage;