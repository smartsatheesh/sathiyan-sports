"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Pagination,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  useTheme
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Payment,
  Notifications,
  Analytics,
  Search,
  Refresh,
  CalendarToday,
  TrendingUp,
  Warning,
  CheckCircle,
  Cancel,
  Schedule,
  AttachMoney,
  People
} from '@mui/icons-material';

// Types
interface BillingCycle {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  cycleType: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
  billingDate: number;
  currentAmount: number;
  currency: string;
  nextBillingDate: string;
  lastPaymentDate?: string;
  status: 'active' | 'suspended' | 'cancelled' | 'overdue';
  reminderDays: number[];
  notificationPreferences: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
  };
  autoRenewal: boolean;
  gracePeriodDays: number;
  overdueCount: number;
  paymentHistory: PaymentRecord[];
  createdAt: string;
  lastUpdated: string;
}

interface PaymentRecord {
  paymentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  transactionId?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  notes?: string;
}

interface BillingAnalytics {
  totalUsers: number;
  activeUsers: number;
  overdueUsers: number;
  cancelledUsers: number;
  revenueByType: Array<{
    _id: string;
    totalUsers: number;
    totalRevenue: number;
  }>;
  upcomingPayments: number;
  upcomingRevenue: number;
}

const BillingCycleAdmin: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [analytics, setAnalytics] = useState<BillingAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  
  // Pagination and filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cycleTypeFilter, setCycleTypeFilter] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    userId: '',
    userEmail: '',
    userName: '',
    cycleType: 'monthly' as 'monthly' | 'quarterly' | 'half yearly' | 'yearly',
    billingDate: 1,
    currentAmount: 0,
    currency: 'INR',
    reminderDays: [7, 3, 1],
    notificationPreferences: {
      email: true,
      whatsapp: true,
      sms: false
    },
    autoRenewal: true,
    gracePeriodDays: 7
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentId: '',
    amount: 0,
    paymentMethod: '',
    status: 'completed' as 'completed' | 'failed' | 'pending',
    transactionId: '',
    notes: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadBillingCycles();
    loadAnalytics();
  }, [page, searchTerm, statusFilter, cycleTypeFilter]);

  const loadBillingCycles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (cycleTypeFilter) params.append('cycleType', cycleTypeFilter);

      const response = await fetch(`/api/admin/billing-cycles?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setBillingCycles(data.data);
        setTotalPages(data.pagination.totalPages);
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to load billing cycles' });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/billing-analytics');
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleCreateCycle = async () => {
    try {
      const response = await fetch('/api/admin/billing-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Billing cycle created successfully' });
        setCreateDialogOpen(false);
        loadBillingCycles();
        resetForm();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to create billing cycle' });
    }
  };

  const handleUpdateCycle = async () => {
    if (!selectedCycle) return;

    try {
      const response = await fetch('/api/admin/billing-cycles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingCycleId: selectedCycle._id,
          ...formData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Billing cycle updated successfully' });
        setEditDialogOpen(false);
        loadBillingCycles();
        resetForm();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update billing cycle' });
    }
  };

  const handleCancelCycle = async (cycleId: string) => {
    if (!confirm('Are you sure you want to cancel this billing cycle?')) return;

    try {
      const response = await fetch(`/api/admin/billing-cycles?id=${cycleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Billing cycle cancelled successfully' });
        loadBillingCycles();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to cancel billing cycle' });
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedCycle) return;

    try {
      const response = await fetch('/api/admin/billing-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingCycleId: selectedCycle._id,
          ...paymentForm
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: 'Payment processed successfully' });
        setPaymentDialogOpen(false);
        loadBillingCycles();
        resetPaymentForm();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to process payment' });
    }
  };

  const handleSchedulerAction = async (action: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/billing-scheduler', {
        method: action === 'get_status' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action !== 'get_status' ? JSON.stringify({ action }) : undefined
      });

      const data = await response.json();
      
      if (data.success) {
        if (action === 'get_status') {
          setAlert({ 
            type: 'info', 
            message: `Scheduler Status: ${data.data.isRunning ? 'Running' : 'Idle'}. Next runs scheduled.` 
          });
        } else {
          setAlert({ 
            type: 'success', 
            message: data.data.message || `${action} completed successfully` 
          });
        }
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: `Failed to execute ${action}` });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      userEmail: '',
      userName: '',
      cycleType: 'monthly',
      billingDate: 1,
      currentAmount: 0,
      currency: 'INR',
      reminderDays: [7, 3, 1],
      notificationPreferences: {
        email: true,
        whatsapp: true,
        sms: false
      },
      autoRenewal: true,
      gracePeriodDays: 7
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      paymentId: '',
      amount: 0,
      paymentMethod: '',
      status: 'completed',
      transactionId: '',
      notes: ''
    });
  };

  const openEditDialog = (cycle: BillingCycle) => {
    setSelectedCycle(cycle);
    setFormData({
      userId: cycle.userId,
      userEmail: cycle.userEmail,
      userName: cycle.userName,
      cycleType: cycle.cycleType,
      billingDate: cycle.billingDate,
      currentAmount: cycle.currentAmount,
      currency: cycle.currency,
      reminderDays: cycle.reminderDays,
      notificationPreferences: cycle.notificationPreferences,
      autoRenewal: cycle.autoRenewal,
      gracePeriodDays: cycle.gracePeriodDays
    });
    setEditDialogOpen(true);
  };

  const openPaymentDialog = (cycle: BillingCycle) => {
    setSelectedCycle(cycle);
    setPaymentForm({
      ...paymentForm,
      amount: cycle.currentAmount,
      paymentId: `PAY_${Date.now()}`
    });
    setPaymentDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'overdue': return 'error';
      case 'suspended': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getCycleTypeColor = (type: string) => {
    switch (type) {
      case 'monthly': return 'primary';
      case 'quarterly': return 'secondary';
      case 'half yearly': return 'warning';
      case 'yearly': return 'info';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilBilling = (nextBillingDate: string) => {
    const today = new Date();
    const billingDate = new Date(nextBillingDate);
    const diffTime = billingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Analytics Cards Component
  const AnalyticsCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h4">
                  {analytics?.totalUsers || 0}
                </Typography>
              </Box>
              <People sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Active Users
                </Typography>
                <Typography variant="h4" color="success.main">
                  {analytics?.activeUsers || 0}
                </Typography>
              </Box>
              <CheckCircle sx={{ fontSize: 40, color: theme.palette.success.main }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Overdue Users
                </Typography>
                <Typography variant="h4" color="error.main">
                  {analytics?.overdueUsers || 0}
                </Typography>
              </Box>
              <Warning sx={{ fontSize: 40, color: theme.palette.error.main }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Upcoming Revenue
                </Typography>
                <Typography variant="h4" color="info.main">
                  ₹{analytics?.upcomingRevenue?.toLocaleString() || 0}
                </Typography>
              </Box>
              <TrendingUp sx={{ fontSize: 40, color: theme.palette.info.main }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          fontWeight: 700,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          💳 Billing Cycle Management
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage user subscriptions, billing cycles, and payment reminders
        </Typography>
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

      {/* Analytics Cards */}
      <AnalyticsCards />

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Billing Cycles" icon={<Schedule />} />
          <Tab label="Payment Analytics" icon={<Analytics />} />
          <Tab label="Reminders" icon={<Notifications />} />
        </Tabs>
      </Paper>

      {/* Billing Cycles Tab */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          {/* Controls */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Search users..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 250 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Cycle Type</InputLabel>
              <Select
                value={cycleTypeFilter}
                onChange={(e) => setCycleTypeFilter(e.target.value)}
                label="Cycle Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="half yearly">Half Yearly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Billing Cycle
            </Button>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadBillingCycles}
            >
              Refresh
            </Button>
          </Box>

          {/* Loading */}
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Billing Cycles Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Cycle</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Next Billing</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Days Until</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {billingCycles.map((cycle) => (
                  <TableRow key={cycle._id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {cycle.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cycle.userEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={cycle.cycleType}
                        color={getCycleTypeColor(cycle.cycleType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatCurrency(cycle.currentAmount, cycle.currency)}
                    </TableCell>
                    <TableCell>
                      {formatDate(cycle.nextBillingDate)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={cycle.status}
                        color={getStatusColor(cycle.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2"
                        color={getDaysUntilBilling(cycle.nextBillingDate) <= 3 ? 'error.main' : 'text.primary'}
                      >
                        {getDaysUntilBilling(cycle.nextBillingDate)} days
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={() => openEditDialog(cycle)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Process Payment">
                          <IconButton 
                            size="small" 
                            onClick={() => openPaymentDialog(cycle)}
                          >
                            <Payment />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCancelCycle(cycle._id)}
                            color="error"
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </Paper>
      )}

      {/* Payment Analytics Tab */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Revenue Analytics
          </Typography>
          
          <Grid container spacing={3}>
            {/* Revenue by Cycle Type */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue by Cycle Type
                  </Typography>
                  {analytics?.revenueByType.map((item, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {item._id}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          ₹{item.totalRevenue.toLocaleString()}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(item.totalRevenue / (analytics?.revenueByType.reduce((sum, rev) => sum + rev.totalRevenue, 0) || 1)) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {item.totalUsers} users
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Quick Stats */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Statistics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Upcoming Payments:</Typography>
                      <Typography fontWeight="bold">{analytics?.upcomingPayments || 0}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Expected Revenue:</Typography>
                      <Typography fontWeight="bold">₹{analytics?.upcomingRevenue?.toLocaleString() || 0}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Cancelled Users:</Typography>
                      <Typography fontWeight="bold" color="error.main">{analytics?.cancelledUsers || 0}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Active Rate:</Typography>
                      <Typography fontWeight="bold" color="success.main">
                        {analytics ? Math.round((analytics.activeUsers / analytics.totalUsers) * 100) : 0}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Payment Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last 10 payments processed through the system
                  </Typography>
                  {/* This would show recent payments from the API */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Connect to payment history API to display recent transactions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Reminders Tab */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Billing Reminders Management
          </Typography>
          
          <Grid container spacing={3}>
            {/* Pending Reminders */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    ⏰ Pending Reminders
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Users scheduled to receive billing reminders
                  </Typography>
                  
                  {/* Sample reminder items */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2, 3].map((item) => (
                      <Box key={item} sx={{ 
                        p: 2, 
                        border: 1, 
                        borderColor: 'grey.300', 
                        borderRadius: 1,
                        bgcolor: 'warning.50'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2">User {item}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Due: {new Date(Date.now() + item * 24 * 60 * 60 * 1000).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Chip label="7 days" size="small" color="warning" />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    sx={{ mt: 2 }}
                    startIcon={<Refresh />}
                  >
                    Load Pending Reminders
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Overdue Alerts */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error.main">
                    🚨 Overdue Alerts
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Users with overdue payments requiring immediate attention
                  </Typography>
                  
                  {/* Sample overdue items */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2].map((item) => (
                      <Box key={item} sx={{ 
                        p: 2, 
                        border: 1, 
                        borderColor: 'error.main', 
                        borderRadius: 1,
                        bgcolor: 'error.50'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2">Overdue User {item}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Overdue: {item * 5} days
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip label={`₹${1000 + item * 500}`} size="small" color="error" />
                            <IconButton size="small" color="primary">
                              <Notifications />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  
                  <Button 
                    variant="contained" 
                    color="error"
                    fullWidth 
                    sx={{ mt: 2 }}
                    startIcon={<Warning />}
                  >
                    Send Overdue Alerts
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Reminder Settings */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📋 Reminder Configuration & Scheduler
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          📧 Email Reminders
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Configure automatic email notifications
                        </Typography>
                        <FormControlLabel
                          control={<Switch defaultChecked />}
                          label="Enable Email"
                        />
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            Default: 7, 3, 1 days before billing
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          📱 WhatsApp Reminders
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Send WhatsApp notifications
                        </Typography>
                        <FormControlLabel
                          control={<Switch defaultChecked />}
                          label="Enable WhatsApp"
                        />
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            Template: Billing reminder with amount
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          📲 SMS Reminders
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Send SMS notifications
                        </Typography>
                        <FormControlLabel
                          control={<Switch />}
                          label="Enable SMS"
                        />
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            Premium feature - charges apply
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Scheduler Controls */}
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom color="info.main">
                      🤖 Automated Scheduler
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Manage automated billing reminders and overdue alerts
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50', border: 1, borderColor: 'grey.200' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            📅 Schedule Status
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="caption">
                              • Daily reminders: 9:00 AM IST
                            </Typography>
                            <Typography variant="caption">
                              • Overdue check: Every hour
                            </Typography>
                            <Typography variant="caption">
                              • Weekly maintenance: Sunday 10:00 AM IST
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'warning.50', border: 1, borderColor: 'warning.200' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            🔧 Manual Controls
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              onClick={() => handleSchedulerAction('trigger_reminders')}
                            >
                              Trigger Daily Reminders
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="warning"
                              onClick={() => handleSchedulerAction('trigger_overdue')}
                            >
                              Process Overdue Alerts
                            </Button>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="contained" startIcon={<Notifications />}>
                      Test Reminders
                    </Button>
                    <Button variant="outlined" startIcon={<Schedule />}>
                      Schedule Bulk Reminders
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="info"
                      startIcon={<Analytics />}
                      onClick={() => handleSchedulerAction('get_status')}
                    >
                      View Scheduler Status
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={createDialogOpen || editDialogOpen} 
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen ? 'Create Billing Cycle' : 'Edit Billing Cycle'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="User ID"
                fullWidth
                required
                value={formData.userId}
                onChange={(e) => setFormData({...formData, userId: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="User Email"
                fullWidth
                required
                type="email"
                value={formData.userEmail}
                onChange={(e) => setFormData({...formData, userEmail: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="User Name"
                fullWidth
                required
                value={formData.userName}
                onChange={(e) => setFormData({...formData, userName: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Cycle Type</InputLabel>
                <Select
                  value={formData.cycleType}
                  onChange={(e) => setFormData({...formData, cycleType: e.target.value as any})}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="half yearly">Half Yearly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Billing Date (1-28)"
                fullWidth
                required
                type="number"
                inputProps={{ min: 1, max: 28 }}
                value={formData.billingDate}
                onChange={(e) => setFormData({...formData, billingDate: parseInt(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Amount"
                fullWidth
                required
                type="number"
                inputProps={{ min: 0 }}
                value={formData.currentAmount}
                onChange={(e) => setFormData({...formData, currentAmount: parseInt(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Currency"
                fullWidth
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Grace Period (days)"
                fullWidth
                type="number"
                inputProps={{ min: 0, max: 30 }}
                value={formData.gracePeriodDays}
                onChange={(e) => setFormData({...formData, gracePeriodDays: parseInt(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoRenewal}
                    onChange={(e) => setFormData({...formData, autoRenewal: e.target.checked})}
                  />
                }
                label="Auto Renewal"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Notification Preferences
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.notificationPreferences.email}
                    onChange={(e) => setFormData({
                      ...formData, 
                      notificationPreferences: {
                        ...formData.notificationPreferences,
                        email: e.target.checked
                      }
                    })}
                  />
                }
                label="Email"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.notificationPreferences.whatsapp}
                    onChange={(e) => setFormData({
                      ...formData, 
                      notificationPreferences: {
                        ...formData.notificationPreferences,
                        whatsapp: e.target.checked
                      }
                    })}
                  />
                }
                label="WhatsApp"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.notificationPreferences.sms}
                    onChange={(e) => setFormData({
                      ...formData, 
                      notificationPreferences: {
                        ...formData.notificationPreferences,
                        sms: e.target.checked
                      }
                    })}
                  />
                }
                label="SMS"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={createDialogOpen ? handleCreateCycle : handleUpdateCycle}
          >
            {createDialogOpen ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog 
        open={paymentDialogOpen} 
        onClose={() => {
          setPaymentDialogOpen(false);
          resetPaymentForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Process Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Payment ID"
                fullWidth
                required
                value={paymentForm.paymentId}
                onChange={(e) => setPaymentForm({...paymentForm, paymentId: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Amount"
                fullWidth
                required
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: parseInt(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Payment Method"
                fullWidth
                required
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                placeholder="UPI, Card, Net Banking, etc."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={paymentForm.status}
                  onChange={(e) => setPaymentForm({...paymentForm, status: e.target.value as any})}
                >
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Transaction ID"
                fullWidth
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm({...paymentForm, transactionId: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => {
            setPaymentDialogOpen(false);
            resetPaymentForm();
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleProcessPayment}>
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BillingCycleAdmin;