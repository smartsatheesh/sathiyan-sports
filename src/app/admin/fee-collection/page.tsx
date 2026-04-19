"use client";
import React, { useState, useEffect } from "react";
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
  InputAdornment,
  Fab,
} from "@mui/material";
import {
  ArrowBack,
  Refresh,
  Payment,
  FilterList,
  Search,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  AttachMoney,
  Receipt,
} from "@mui/icons-material";
import { format, isValid, parseISO } from "date-fns";

// Utility function for safe date formatting
const formatSafeDate = (dateString: string | undefined | null, formatPattern: string = 'dd/MM/yyyy'): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return format(date, formatPattern);
};

interface FeeRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    champId: string;
    phone?: string;
    mobile?: string;
  };
  champId: string;
  userName: string;
  userEmail: string;
  userMobile: string;
  feeType: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  updatedBy?: {
    name: string;
    email: string;
  };
}

interface FeeStats {
  overview: {
    totalFees: number;
    pendingFees: number;
    paidFees: number;
    overdueFees: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    // Fee-specific stats
    recentFees: number; // Last 30 days
    avgFeeAmount: number;
    lateFeesCollected: number;
    collectionRate: number; // percentage
  };
}

const FeeCollectionPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [stats, setStats] = useState<FeeStats>({
    overview: {
      totalFees: 0,
      pendingFees: 0,
      paidFees: 0,
      overdueFees: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      recentFees: 0,
      avgFeeAmount: 0,
      lateFeesCollected: 0,
      collectionRate: 0,
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>('all');
  
  // Add/Edit Fee Dialog
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [feeFormData, setFeeFormData] = useState({
    champId: '',
    userName: '',
    userEmail: '',
    userMobile: '',
    feeType: '',
    amount: '',
    dueDate: '',
    status: 'pending',
    paymentMethod: '',
    transactionId: '',
    notes: ''
  });

  // Payment Dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: '',
    transactionId: '',
    paidDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Authentication check
  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/");
      return;
    }
  }, [session, router]);

  // Fetch data
  // Fetch users for the dropdown
  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/admin/users?limit=1000'); // Get all users
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllUsers(data.users || []);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    const selectedUser = allUsers.find(user => user._id === userId);
    if (selectedUser) {
      setSelectedUserId(userId);
      setFeeFormData(prev => ({
        ...prev,
        champId: selectedUser.champId || '',
        userName: selectedUser.name || '',
        userEmail: selectedUser.email || '',
        userMobile: selectedUser.mobile || selectedUser.phone || '',
      }));
    }
  };

  const fetchFees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fee Collection - Fetching fees and stats...');
      
      // Fetch both fees and fee collection stats
      const [feesResponse, statsResponse] = await Promise.allSettled([
        fetch('/api/admin/fee-collection'),
        fetch('/api/admin/fee-collection/stats')
      ]);
      
      // Handle fee data
      let feeData = [];
      if (feesResponse.status === 'fulfilled' && feesResponse.value.ok) {
        const feesResult = await feesResponse.value.json();
        feeData = feesResult.fees || [];
        console.log('📋 Fetched', feeData.length, 'fee records');
      } else {
        console.log('⚠️ Fee collection API not available, using empty fee list');
      }
      
      // Handle fee collection stats
      let statsData = {
        overview: {
          totalFees: 0,
          pendingFees: 0,
          paidFees: 0,
          overdueFees: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          recentFees: 0,
          avgFeeAmount: 0,
          lateFeesCollected: 0,
          collectionRate: 0,
        }
      };

      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsResult = await statsResponse.value.json();
        console.log('📊 Fee Collection - Stats data:', statsResult);
        
        if (statsResult.overview) {
          const overview = statsResult.overview;
          
          // Calculate collection rate
          const collectionRate = overview.totalFees > 0 ? (overview.paidFees / overview.totalFees * 100) : 0;
          const avgFeeAmount = overview.totalFees > 0 ? overview.totalAmount / overview.totalFees : 0;
          
          statsData = {
            overview: {
              totalFees: overview.totalFees,
              pendingFees: overview.pendingFees,
              paidFees: overview.paidFees,
              overdueFees: overview.overdueFees,
              totalAmount: overview.totalAmount,
              paidAmount: overview.paidAmount,
              pendingAmount: overview.pendingAmount,
              overdueAmount: overview.overdueAmount,
              recentFees: overview.paidFees, // Recent payments
              avgFeeAmount: avgFeeAmount,
              lateFeesCollected: overview.overdueAmount, // Late fees collected
              collectionRate: collectionRate,
            }
          };
        }
      } else {
        console.log('⚠️ Fee collection stats API not available, using default stats');
      }

      console.log('📊 Fee Collection - Final calculated stats:', statsData);
      setFees(feeData);
      setStats(statsData);

    } catch (err) {
      console.error('❌ Fee collection fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Set empty data on error
      setFees([]);
      setStats({
        overview: {
          totalFees: 0,
          pendingFees: 0,
          paidFees: 0,
          overdueFees: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          recentFees: 0,
          avgFeeAmount: 0,
          lateFeesCollected: 0,
          collectionRate: 0,
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchFees();
      fetchAllUsers(); // Load users for dropdown
      
      // Check for URL parameters to pre-fill form
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('champId')) {
        setFeeFormData({
          champId: urlParams.get('champId') || '',
          userName: urlParams.get('userName') || '',
          userEmail: urlParams.get('userEmail') || '',
          userMobile: urlParams.get('userMobile') || '',
          feeType: 'Monthly Fee', // Default to Monthly Fee
          amount: '',
          dueDate: '',
          status: 'pending',
          paymentMethod: '',
          transactionId: '',
          notes: ''
        });
        setFeeDialogOpen(true); // Auto-open the dialog
      }
    }
  }, [session]);

  // Filter and search logic
  const filteredFees = fees.filter((fee) => {
    const matchesSearch = 
      fee.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.champId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.feeType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || fee.status === statusFilter;
    const matchesType = feeTypeFilter === 'all' || fee.feeType === feeTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Sort fees to put overdue at the top
  const sortedFees = [...filteredFees].sort((a, b) => {
    // Priority order: overdue first, then others by due date
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (b.status === 'overdue' && a.status !== 'overdue') return 1;
    
    // If both are overdue or both are not overdue, sort by due date
    const aDate = new Date(a.dueDate);
    const bDate = new Date(b.dueDate);
    return aDate.getTime() - bDate.getTime();
  });

  // Pagination
  const paginatedFees = sortedFees.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handlePayment = (fee: FeeRecord) => {
    setSelectedFee(fee);
    setPaymentData({
      paymentMethod: '',
      transactionId: '',
      paidDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPaymentDialogOpen(true);
  };

  const processPayment = async () => {
    if (!selectedFee) return;

    // TODO: Implement when API is ready
    setAlert({ type: 'info', message: 'Payment processing feature coming soon!' });
    setPaymentDialogOpen(false);

    // try {
    //   const response = await fetch(`/api/admin/fee-collection/${selectedFee._id}/payment`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(paymentData),
    //   });

    //   const data = await response.json();

    //   if (data.success) {
    //     setAlert({ type: 'success', message: 'Payment recorded successfully!' });
    //     setPaymentDialogOpen(false);
    //     fetchFees();
    //   } else {
    //     setAlert({ type: 'error', message: data.error || 'Failed to record payment' });
    //   }
    // } catch (err) {
    //   setAlert({ type: 'error', message: 'Failed to record payment' });
    //   console.error('Payment error:', err);
    // }
  };

  const openAddFeeDialog = () => {
    console.log('🔵 openAddFeeDialog called - opening add fee dialog');
    setEditingFee(null);
    setSelectedUserId('');
    setFeeFormData({
      champId: '',
      userName: '',
      userEmail: '',
      userMobile: '',
      feeType: '',
      amount: '',
      dueDate: '',
      status: 'pending',
      paymentMethod: '',
      transactionId: '',
      notes: ''
    });
    console.log('🔵 Setting feeDialogOpen to true');
    setFeeDialogOpen(true);
    console.log('✅ Add fee dialog should now be open');
  };

  const openEditFeeDialog = (fee: FeeRecord) => {
    setEditingFee(fee);
    setSelectedUserId(fee.userId._id);
    setFeeFormData({
      champId: fee.champId,
      userName: fee.userName,
      userEmail: fee.userEmail,
      userMobile: fee.userMobile,
      feeType: fee.feeType,
      amount: fee.amount.toString(),
      dueDate: fee.dueDate.split('T')[0],
      status: fee.status,
      paymentMethod: fee.paymentMethod || '',
      transactionId: fee.transactionId || '',
      notes: fee.notes || ''
    });
    setFeeDialogOpen(true);
  };

  const saveFee = async () => {
    try {
      // Validate required fields
      if (!feeFormData.champId || !feeFormData.userName || !feeFormData.userEmail || 
          !feeFormData.feeType || !feeFormData.amount || !feeFormData.dueDate) {
        setAlert({ type: 'error', message: 'Please fill all required fields' });
        return;
      }

      const url = editingFee 
        ? `/api/admin/fee-collection/${editingFee._id}`
        : '/api/admin/fee-collection';
      
      const method = editingFee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...feeFormData,
          amount: parseFloat(feeFormData.amount)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ 
          type: 'success', 
          message: editingFee ? 'Fee updated successfully!' : 'Fee added successfully!' 
        });
        setFeeDialogOpen(false);
        
        // Reset form
        setFeeFormData({
          champId: '',
          userName: '',
          userEmail: '',
          userMobile: '',
          feeType: '',
          amount: '',
          dueDate: '',
          status: 'pending',
          paymentMethod: '',
          transactionId: '',
          notes: ''
        });
        setSelectedUserId('');
        setEditingFee(null);
        
        // Reset pagination and fetch fresh data
        setPage(0);
        
        // Small delay to ensure database has processed the write
        await new Promise(resolve => setTimeout(resolve, 300));
        fetchFees();
      } else {
        setAlert({ type: 'error', message: data.error || 'Failed to save fee' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to save fee' });
      console.error('Save fee error:', err);
    }
  };

  const deleteFee = async (feeId: string) => {
    if (!confirm('Are you sure you want to delete this fee record?')) return;

    try {
      const response = await fetch(`/api/admin/fee-collection/${feeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Fee deleted successfully!' });
        setPage(0);
        await new Promise(resolve => setTimeout(resolve, 300));
        fetchFees();
      } else {
        setAlert({ type: 'error', message: data.error || 'Failed to delete fee' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to delete fee' });
      console.error('Delete fee error:', err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, mt: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading fee collection data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/admin')}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4" component="h1">
            Fee Collection Management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchFees}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Comprehensive Fee Collection Statistics */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
        💰 Fee Collection Analytics Dashboard
      </Typography>

      {/* Primary Fee Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Fees
              </Typography>
              <Typography variant="h5" component="div">
                {stats.overview.totalFees}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All fee records
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Pending Fees
              </Typography>
              <Typography variant="h5" component="div" color="warning.main">
                {stats.overview.pendingFees}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Awaiting payment
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Paid Fees
              </Typography>
              <Typography variant="h5" component="div" color="success.main">
                {stats.overview.paidFees}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Successfully collected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Overdue Fees
              </Typography>
              <Typography variant="h5" component="div" color="error.main">
                {stats.overview.overdueFees}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Past due date
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Amount Overview Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Amount
              </Typography>
              <Typography variant="h5" component="div">
                ₹{stats.overview.totalAmount.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total fee value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Paid Amount
              </Typography>
              <Typography variant="h5" component="div" color="success.main">
                ₹{stats.overview.paidAmount.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Successfully collected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Pending Amount
              </Typography>
              <Typography variant="h5" component="div" color="warning.main">
                ₹{stats.overview.pendingAmount.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                To be collected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fee Analytics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Collection Rate
              </Typography>
              <Typography variant="h6" component="div" color="primary.main">
                {stats.overview.collectionRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Payment success rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Avg Fee Amount
              </Typography>
              <Typography variant="h6" component="div">
                ₹{stats.overview.avgFeeAmount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Per fee record
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Recent Payments
              </Typography>
              <Typography variant="h6" component="div" color="info.main">
                {stats.overview.recentFees}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Overdue Amount
              </Typography>
              <Typography variant="h6" component="div" color="error.main">
                ₹{stats.overview.overdueAmount.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Late payment value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by name, email, champion ID, or fee type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Fee Type</InputLabel>
              <Select
                value={feeTypeFilter}
                label="Fee Type"
                onChange={(e) => setFeeTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Monthly Fee">Monthly Fee</MenuItem>
                <MenuItem value="Registration Fee">Registration Fee</MenuItem>
                <MenuItem value="Court Fee">Court Fee</MenuItem>
                <MenuItem value="Equipment Fee">Equipment Fee</MenuItem>
                <MenuItem value="Late Fee">Late Fee</MenuItem>
                <MenuItem value="Football Booking">Football Booking</MenuItem>
                <MenuItem value="Badminton Booking">Badminton Booking</MenuItem>
                <MenuItem value="Cricket Booking">Cricket Booking</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              onClick={openAddFeeDialog}
            >
              Add Fee
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Fees Table */}
      <Paper>
        {/* Show overdue info banner if there are overdue fees */}
        {sortedFees.some(fee => fee.status === 'overdue') && (
          <Box 
            sx={{ 
              backgroundColor: '#ffebee', 
              borderLeft: '4px solid #f44336',
              padding: 2,
              margin: 2,
              borderRadius: 1
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#d32f2f',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              ⚠️ Overdue fees are highlighted in red and shown at the top of the table for priority attention.
            </Typography>
          </Box>
        )}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Champion ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Fee Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedFees.map((fee) => (
                <TableRow 
                  key={fee._id}
                  sx={{
                    backgroundColor: fee.status === 'overdue' ? '#ffebee' : 'transparent',
                    '&:hover': {
                      backgroundColor: fee.status === 'overdue' ? '#ffcdd2' : 'rgba(0, 0, 0, 0.04)',
                    },
                    borderLeft: fee.status === 'overdue' ? '4px solid #f44336' : 'none',
                  }}
                >
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: fee.status === 'overdue' ? 'bold' : 'normal',
                        color: fee.status === 'overdue' ? '#d32f2f' : 'inherit'
                      }}
                    >
                      {fee.champId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: fee.status === 'overdue' ? 'bold' : 'bold',
                          color: fee.status === 'overdue' ? '#d32f2f' : 'inherit'
                        }}
                      >
                        {fee.userName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {fee.userEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: fee.status === 'overdue' ? 'bold' : 'normal',
                        color: fee.status === 'overdue' ? '#d32f2f' : 'inherit'
                      }}
                    >
                      {fee.feeType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: fee.status === 'overdue' ? 'bold' : 'normal',
                        color: fee.status === 'overdue' ? '#d32f2f' : 'inherit'
                      }}
                    >
                      ₹{fee.amount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: fee.status === 'overdue' ? 'bold' : 'normal',
                        color: fee.status === 'overdue' ? '#d32f2f' : 'inherit'
                      }}
                    >
                      {formatSafeDate(fee.dueDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={fee.status} 
                      color={
                        fee.status === 'paid' ? 'success' :
                        fee.status === 'pending' ? 'warning' :
                        fee.status === 'overdue' ? 'error' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{fee.paymentMethod || '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {fee.status === 'pending' && (
                        <Tooltip title="Record Payment">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handlePayment(fee)}
                          >
                            <Payment />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit Fee">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openEditFeeDialog(fee)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Fee">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteFee(fee._id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedFees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {selectedFee && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Recording payment for {selectedFee.userName} - {selectedFee.feeType} (₹{selectedFee.amount})
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentData.paymentMethod}
                    label="Payment Method"
                    onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="UPI">UPI</MenuItem>
                    <MenuItem value="Card">Card</MenuItem>
                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                    <MenuItem value="Cheque">Cheque</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Transaction ID"
                  margin="normal"
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Paid Date"
                  type="date"
                  margin="normal"
                  value={paymentData.paidDate}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, paidDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  margin="normal"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button onClick={processPayment} variant="contained" color="success">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Fee Dialog */}
      <Dialog open={feeDialogOpen} onClose={() => setFeeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingFee ? 'Edit Fee' : 'Add New Fee'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* User Selection Dropdown */}
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal" disabled={editingFee !== null}>
                  <InputLabel>Select User</InputLabel>
                  <Select
                    value={selectedUserId}
                    label="Select User"
                    onChange={(e) => handleUserSelect(e.target.value)}
                    disabled={loadingUsers || editingFee !== null}
                  >
                    <MenuItem value="">
                      <em>{loadingUsers ? 'Loading users...' : 'Choose a user'}</em>
                    </MenuItem>
                    {allUsers.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.champId} - {user.name} ({user.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {editingFee && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    User selection is disabled when editing existing fees.
                  </Alert>
                )}
              </Grid>

              {/* User Details (Auto-populated or manual) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Champion ID"
                  margin="normal"
                  value={feeFormData.champId}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, champId: e.target.value }))}
                  InputProps={{
                    readOnly: selectedUserId !== '',
                  }}
                  helperText={selectedUserId ? "Auto-populated from selected user" : ""}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="User Name"
                  margin="normal"
                  value={feeFormData.userName}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, userName: e.target.value }))}
                  InputProps={{
                    readOnly: selectedUserId !== '',
                  }}
                  helperText={selectedUserId ? "Auto-populated from selected user" : ""}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="User Email"
                  type="email"
                  margin="normal"
                  value={feeFormData.userEmail}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                  InputProps={{
                    readOnly: selectedUserId !== '',
                  }}
                  helperText={selectedUserId ? "Auto-populated from selected user" : ""}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="User Mobile"
                  margin="normal"
                  value={feeFormData.userMobile}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, userMobile: e.target.value }))}
                  InputProps={{
                    readOnly: selectedUserId !== '',
                  }}
                  helperText={selectedUserId ? "Auto-populated from selected user" : ""}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Fee Type</InputLabel>
                  <Select
                    value={feeFormData.feeType}
                    label="Fee Type"
                    onChange={(e) => setFeeFormData(prev => ({ ...prev, feeType: e.target.value }))}
                  >
                    <MenuItem value="Monthly Fee">Monthly Fee</MenuItem>
                    <MenuItem value="Registration Fee">Registration Fee</MenuItem>
                    <MenuItem value="Court Fee">Court Fee</MenuItem>
                    <MenuItem value="Equipment Fee">Equipment Fee</MenuItem>
                    <MenuItem value="Late Fee">Late Fee</MenuItem>
                    <MenuItem value="Football Booking">Football Booking</MenuItem>
                    <MenuItem value="Badminton Booking">Badminton Booking</MenuItem>
                    <MenuItem value="Cricket Booking">Cricket Booking</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  margin="normal"
                  value={feeFormData.amount}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, amount: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  type="date"
                  margin="normal"
                  value={feeFormData.dueDate}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={feeFormData.status}
                    label="Status"
                    onChange={(e) => setFeeFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  margin="normal"
                  value={feeFormData.notes}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeeDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveFee} variant="contained">
            {editingFee ? 'Update Fee' : 'Add Fee'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FeeCollectionPage;