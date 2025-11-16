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
  const fetchFees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [feesRes, statsRes] = await Promise.all([
        fetch('/api/admin/fee-collection'),
        fetch('/api/admin/fee-collection/stats')
      ]);

      if (!feesRes.ok) {
        throw new Error('Failed to fetch fees');
      }

      const feesData = await feesRes.json();
      const statsData = statsRes.ok ? await statsRes.json() : { overview: stats.overview };

      setFees(feesData.fees || []);
      setStats(statsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Fee collection fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchFees();
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

  // Pagination
  const paginatedFees = filteredFees.slice(
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

    try {
      const response = await fetch(`/api/admin/fee-collection/${selectedFee._id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Payment recorded successfully!' });
        setPaymentDialogOpen(false);
        fetchFees();
      } else {
        setAlert({ type: 'error', message: data.error || 'Failed to record payment' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to record payment' });
      console.error('Payment error:', err);
    }
  };

  const addNewFee = () => {
    setEditingFee(null);
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
    setFeeDialogOpen(true);
  };

  const editFee = (fee: FeeRecord) => {
    setEditingFee(fee);
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
      const url = editingFee 
        ? `/api/admin/fee-collection/${editingFee._id}`
        : '/api/admin/fee-collection';
      
      const method = editingFee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feeFormData),
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ 
          type: 'success', 
          message: editingFee ? 'Fee updated successfully!' : 'Fee added successfully!' 
        });
        setFeeDialogOpen(false);
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

      {/* Stats Overview */}
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Amount Overview */}
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
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              onClick={addNewFee}
            >
              Add Fee
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Fees Table */}
      <Paper>
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
                <TableRow key={fee._id}>
                  <TableCell>{fee.champId}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {fee.userName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {fee.userEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{fee.feeType}</TableCell>
                  <TableCell>₹{fee.amount}</TableCell>
                  <TableCell>{formatSafeDate(fee.dueDate)}</TableCell>
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
                          onClick={() => editFee(fee)}
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
          count={filteredFees.length}
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Champion ID"
                  margin="normal"
                  value={feeFormData.champId}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, champId: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="User Name"
                  margin="normal"
                  value={feeFormData.userName}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, userName: e.target.value }))}
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
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="User Mobile"
                  margin="normal"
                  value={feeFormData.userMobile}
                  onChange={(e) => setFeeFormData(prev => ({ ...prev, userMobile: e.target.value }))}
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