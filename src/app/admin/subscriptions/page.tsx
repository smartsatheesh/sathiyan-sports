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
    if (session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }
    
    fetchSubscriptions();
    fetchStats();
  }, [session, router]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription');
      const data = await response.json();
      if (data.subscriptions) {
        setSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/subscription/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
    }
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
      const matchesStatus = filterStatus === 'all' || subscription.paymentStatus.toLowerCase() === filterStatus.toLowerCase();
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

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Subscriptions
                  </Typography>
                  <Typography variant="h4">
                    {stats.overview.totalSubscriptions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Subscriptions
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.overview.activeSubscriptions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {formatCurrency(stats.overview.totalRevenue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Upcoming Renewals
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.overview.upcomingRenewals}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
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
                      {formatCurrency(subscription.amount)}
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
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
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