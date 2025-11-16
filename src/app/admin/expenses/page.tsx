"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Pagination,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Refresh,
  FilterList,
  AccountBalanceWallet,
  TrendingUp,
  Receipt,
  CalendarMonth,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";

interface Expense {
  _id: string;
  amount: number;
  description: string;
  paidBy: string;
  paymentMethod: string;
  transactionId?: string;
  category: string;
  date: string;
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

interface ExpenseStats {
  totalAmount: number;
  count: number;
}

interface ExpenseFormData {
  amount: string;
  description: string;
  paidBy: string;
  paymentMethod: string;
  transactionId: string;
  category: string;
  date: Date | null;
}

const PAID_BY_OPTIONS = ["Satheesh", "Sasi", "Maha", "Anu"];
const PAYMENT_METHODS = ["cash", "gpay"];
const CATEGORIES = ["Badminton fees", "Football fees", "Cricket fees", "Sathiyan sports", "Common", "Seimurai"];

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  
  // Stats
  const [stats, setStats] = useState<ExpenseStats>({ totalAmount: 0, count: 0 });
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    paidBy: '',
    paymentMethod: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Expense | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'date',
    direction: 'desc',
  });

  // Form data
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: '',
    description: '',
    paidBy: '',
    paymentMethod: '',
    transactionId: '',
    category: '',
    date: new Date(),
  });

  // Authentication check
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin/expenses");
      return;
    }
    
    if (session.user?.role !== "admin") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (filters.category) params.append('category', filters.category);
      if (filters.paidBy) params.append('paidBy', filters.paidBy);
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
      if (filters.startDate) params.append('startDate', format(filters.startDate, 'yyyy-MM-dd'));
      if (filters.endDate) params.append('endDate', format(filters.endDate, 'yyyy-MM-dd'));

      const response = await fetch(`/api/admin/expenses?${params}`);
      const data = await response.json();

      if (data.success) {
        setExpenses(data.expenses);
        setTotalPages(data.pagination.pages);
        setTotalExpenses(data.pagination.total);
        setStats(data.totals);
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to fetch expenses' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && session.user.role === "admin") {
      fetchExpenses();
    }
  }, [session, page, filters]);

  // Sorting functions
  const handleSort = (key: keyof Expense) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort expenses based on current sort config
  const sortedExpenses = React.useMemo(() => {
    if (!sortConfig.key) return expenses;

    return [...expenses].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle different data types
      if (sortConfig.key === 'amount') {
        const numA = Number(aValue);
        const numB = Number(bValue);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      if (sortConfig.key === 'date' || sortConfig.key === 'createdAt') {
        const dateA = new Date(aValue as string).getTime();
        const dateB = new Date(bValue as string).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // Handle string comparisons
      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();
      
      if (strA < strB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (strA > strB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [expenses, sortConfig]);

  // Sortable Header Component
  const SortableHeader = ({ column, children }: { column: keyof Expense; children: React.ReactNode }) => (
    <TableCell
      onClick={() => handleSort(column)}
      sx={{ 
        cursor: 'pointer', 
        userSelect: 'none',
        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {children}
        {sortConfig.key === column && (
          sortConfig.direction === 'asc' ? (
            <ArrowUpward sx={{ ml: 1, fontSize: 16 }} />
          ) : (
            <ArrowDownward sx={{ ml: 1, fontSize: 16 }} />
          )
        )}
      </Box>
    </TableCell>
  );

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (!formData.amount || !formData.description || !formData.paidBy || 
          !formData.paymentMethod || !formData.category) {
        setAlert({ type: 'error', message: 'Please fill all required fields' });
        return;
      }

      if (formData.paymentMethod === 'gpay' && !formData.transactionId) {
        setAlert({ type: 'error', message: 'Transaction ID is required for GPay payments' });
        return;
      }

      const url = editingExpense 
        ? `/api/admin/expenses/${editingExpense._id}`
        : '/api/admin/expenses';
      
      const method = editingExpense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: formData.date?.toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ 
          type: 'success', 
          message: editingExpense ? 'Expense updated successfully' : 'Expense created successfully' 
        });
        setDialogOpen(false);
        resetForm();
        fetchExpenses();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save expense' });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!expenseToDelete) return;

    try {
      const response = await fetch(`/api/admin/expenses/${expenseToDelete._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Expense deleted successfully' });
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
        fetchExpenses();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to delete expense' });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      paidBy: '',
      paymentMethod: '',
      transactionId: '',
      category: '',
      date: new Date(),
    });
    setEditingExpense(null);
  };

  // Open edit dialog
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      description: expense.description,
      paidBy: expense.paidBy,
      paymentMethod: expense.paymentMethod,
      transactionId: expense.transactionId || '',
      category: expense.category,
      date: new Date(expense.date),
    });
    setDialogOpen(true);
  };

  // Open add dialog
  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Get payment method color
  const getPaymentMethodColor = (method: string) => {
    return method === 'gpay' ? 'primary' : 'default';
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Badminton fees': return 'info';
      case 'Football fees': return 'warning';
      case 'Cricket fees': return 'error';
      case 'Sathiyan sports': return 'primary';
      case 'Common': return 'secondary';
      case 'Seimurai': return 'success';
      default: return 'default';
    }
  };

  if (status === "loading" || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Expenses Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              startIcon={<CalendarMonth />}
              onClick={() => router.push('/admin/expenses/stats')}
            >
              View Stats
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
              Add Expense
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchExpenses}>
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Alert */}
        {alert && (
          <Alert 
            severity={alert.type} 
            sx={{ mb: 2 }}
            onClose={() => setAlert(null)}
          >
            {alert.message}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccountBalanceWallet color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Amount
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(stats.totalAmount)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Receipt color="secondary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Expenses
                    </Typography>
                    <Typography variant="h6">
                      {stats.count}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUp color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Average Expense
                    </Typography>
                    <Typography variant="h6">
                      {stats.count > 0 ? formatCurrency(stats.totalAmount / stats.count) : '₹0'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FilterList color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Showing
                    </Typography>
                    <Typography variant="h6">
                      {expenses.length} of {totalExpenses}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <MenuItem value="">All</MenuItem>
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Paid By</InputLabel>
                <Select
                  value={filters.paidBy}
                  label="Paid By"
                  onChange={(e) => setFilters(prev => ({ ...prev, paidBy: e.target.value }))}
                >
                  <MenuItem value="">All</MenuItem>
                  {PAID_BY_OPTIONS.map(person => (
                    <MenuItem key={person} value={person}>{person}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={filters.paymentMethod}
                  label="Payment Method"
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="gpay">GPay</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setFilters({
                  category: '',
                  paidBy: '',
                  paymentMethod: '',
                  startDate: null,
                  endDate: null,
                })}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Expenses Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <SortableHeader column="date">Date</SortableHeader>
                  <SortableHeader column="amount">Amount</SortableHeader>
                  <SortableHeader column="description">Description</SortableHeader>
                  <SortableHeader column="paidBy">Paid By</SortableHeader>
                  <SortableHeader column="paymentMethod">Payment Method</SortableHeader>
                  <TableCell>Transaction ID</TableCell>
                  <SortableHeader column="category">Category</SortableHeader>
                  <TableCell>Audit Trail</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedExpenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>
                      {format(new Date(expense.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {formatCurrency(expense.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {expense.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={expense.paidBy} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={expense.paymentMethod.toUpperCase()} 
                        size="small" 
                        color={getPaymentMethodColor(expense.paymentMethod) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {expense.transactionId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={expense.category} 
                        size="small" 
                        color={getCategoryColor(expense.category) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <Typography variant="caption" color="textSecondary">
                          Created by: {expense.createdBy?.name || 'Unknown'}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          {format(new Date(expense.createdAt), 'dd/MM/yyyy HH:mm')}
                        </Typography>
                        {expense.updatedBy && (
                          <>
                            <br />
                            <Typography variant="caption" color="primary">
                              Updated by: {expense.updatedBy.name}
                            </Typography>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(expense)}>
                        <Edit />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => {
                          setExpenseToDelete(expense);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No expenses found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </Paper>

        {/* Add/Edit Expense Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Paid By</InputLabel>
                  <Select
                    value={formData.paidBy}
                    label="Paid By"
                    onChange={(e) => setFormData(prev => ({ ...prev, paidBy: e.target.value }))}
                  >
                    {PAID_BY_OPTIONS.map(person => (
                      <MenuItem key={person} value={person}>{person}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={formData.paymentMethod}
                    label="Payment Method"
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        paymentMethod: e.target.value,
                        transactionId: e.target.value === 'cash' ? '' : prev.transactionId
                      }));
                    }}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="gpay">GPay</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.paymentMethod === 'gpay' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Transaction ID"
                    value={formData.transactionId}
                    onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {CATEGORIES.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingExpense ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this expense? This action cannot be undone.
            </Typography>
            {expenseToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Amount:</strong> {formatCurrency(expenseToDelete.amount)}
                </Typography>
                <Typography variant="body2">
                  <strong>Description:</strong> {expenseToDelete.description}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {format(new Date(expenseToDelete.date), 'dd/MM/yyyy')}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}