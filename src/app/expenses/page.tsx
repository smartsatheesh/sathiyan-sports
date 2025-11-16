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
  Fab,
  Tooltip,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  ArrowBack,
  Refresh,
  Payment,
  Receipt,
  AccountBalance,
  TrendingUp,
  FilterList,
  Search,
} from "@mui/icons-material";
import { format } from "date-fns";

interface User {
  _id: string;
  name: string;
  email: string;
  champId: string;
  subscribed: string;
}

interface Expense {
  _id?: string;
  userId: string;
  userName: string;
  champId: string;
  subscriptionType: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
  amount: number;
  sport: 'Badminton' | 'Football' | 'Cricket';
  paymentDate: string;
  description?: string;
  status: 'paid' | 'pending' | 'overdue';
  createdAt?: string;
}

interface Stats {
  totalExpenses: number;
  totalAmount: number;
  pendingPayments: number;
  overduePayments: number;
  monthlyRevenue: number;
  // Enhanced Expense split stats between partners
  satheeshTotal: number;
  sasiTotal: number;
  satheeshPaid: number;
  sasiPaid: number;
  satheeshOwed: number;
  sasiOwed: number;
  netBalance: number;
  splitDifference: number;
  whoOwesWho: string;
  settlementAmount: number;
  // Detailed Fee collection stats
  feeCollectionTotal: number;
  feeCollectionPending: number;
  feeCollectionPaid: number;
  badmintonFees: number;
  footballFees: number;
  cricketFees: number;
  badmintonPending: number;
  footballPending: number;
  cricketPending: number;
  // Advanced Date range stats
  weeklyExpenses: number;
  monthlyExpenses: number;
  yearlyExpenses: number;
  todayExpenses: number;
  yesterdayExpenses: number;
  thisWeekExpenses: number;
  lastWeekExpenses: number;
  thisMonthExpenses: number;
  lastMonthExpenses: number;
  averageDaily: number;
  averageWeekly: number;
  averageMonthly: number;
  // Growth analytics
  weekOverWeekGrowth: number;
  monthOverMonthGrowth: number;
  // Expense type breakdown
  regularExpensesTotal: number;
  feeCollectionPercentage: number;
  regularExpensesPercentage: number;
}

const ExpensesPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSport, setFilterSport] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [expenseType, setExpenseType] = useState<string>('all'); // all, regular, fee-collection
  
  // Dialog states
  const [addExpenseDialog, setAddExpenseDialog] = useState(false);
  const [editExpenseDialog, setEditExpenseDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  // Stats
  const [stats, setStats] = useState<Stats>({
    totalExpenses: 0,
    totalAmount: 0,
    pendingPayments: 0,
    overduePayments: 0,
    monthlyRevenue: 0,
    satheeshTotal: 0,
    sasiTotal: 0,
    satheeshPaid: 0,
    sasiPaid: 0,
    satheeshOwed: 0,
    sasiOwed: 0,
    netBalance: 0,
    splitDifference: 0,
    whoOwesWho: 'Balanced',
    settlementAmount: 0,
    feeCollectionTotal: 0,
    feeCollectionPending: 0,
    feeCollectionPaid: 0,
    badmintonFees: 0,
    footballFees: 0,
    cricketFees: 0,
    badmintonPending: 0,
    footballPending: 0,
    cricketPending: 0,
    weeklyExpenses: 0,
    monthlyExpenses: 0,
    yearlyExpenses: 0,
    todayExpenses: 0,
    yesterdayExpenses: 0,
    thisWeekExpenses: 0,
    lastWeekExpenses: 0,
    thisMonthExpenses: 0,
    lastMonthExpenses: 0,
    averageDaily: 0,
    averageWeekly: 0,
    averageMonthly: 0,
    weekOverWeekGrowth: 0,
    monthOverMonthGrowth: 0,
    regularExpensesTotal: 0,
    feeCollectionPercentage: 0,
    regularExpensesPercentage: 0,
  });

  // Form data for adding new expense
  const [newExpense, setNewExpense] = useState<Expense>({
    userId: '',
    userName: '',
    champId: '',
    subscriptionType: 'monthly',
    amount: 0,
    sport: 'Badminton',
    paymentDate: new Date().toISOString().split('T')[0],
    description: '',
    status: 'pending',
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    
    if (status === "authenticated") {
      if (!session?.user?.role || session.user.role !== "admin") {
        router.push("/");
        return;
      }
      fetchData();
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Fetch expenses
      const expensesResponse = await fetch('/api/expenses');
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData.expenses || []);
        setFilteredExpenses(expensesData.expenses || []);
        calculateStats(expensesData.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (expenseList: Expense[]) => {
    const now = new Date();
    let filteredExpenses = expenseList;

    // Apply date range filtering for stats calculation
    if (dateRange !== 'all') {
      const startDate = new Date();
      
      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
        filteredExpenses = expenseList.filter(exp => new Date(exp.paymentDate) >= startDate);
      } else if (dateRange === 'week') {
        startDate.setDate(now.getDate() - 7);
        filteredExpenses = expenseList.filter(exp => new Date(exp.paymentDate) >= startDate);
      } else if (dateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
        filteredExpenses = expenseList.filter(exp => new Date(exp.paymentDate) >= startDate);
      } else if (dateRange === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
        filteredExpenses = expenseList.filter(exp => new Date(exp.paymentDate) >= startDate);
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        filteredExpenses = expenseList.filter(exp => {
          const expDate = new Date(exp.paymentDate);
          return expDate >= start && expDate <= end;
        });
      }
    }

    // Basic stats
    const totalExpenses = filteredExpenses.length;
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const pendingPayments = filteredExpenses.filter(expense => expense.status === 'pending').length;
    const overduePayments = filteredExpenses.filter(expense => expense.status === 'overdue').length;
    
    // Calculate monthly revenue (current month paid expenses)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = filteredExpenses
      .filter(expense => {
        const expenseDate = new Date(expense.paymentDate);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear &&
               expense.status === 'paid';
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Separate fee collection and regular expenses
    const feeCollectionExpenses = filteredExpenses.filter(exp => exp.userId && exp.userName);
    const regularExpenses = filteredExpenses.filter(exp => !exp.userId || !exp.userName);
    
    // Enhanced Fee collection stats
    const feeCollectionTotal = feeCollectionExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const feeCollectionPaid = feeCollectionExpenses
      .filter(exp => exp.status === 'paid')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const feeCollectionPending = feeCollectionExpenses
      .filter(exp => exp.status === 'pending')
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Sport-specific fee collection stats
    const badmintonFees = feeCollectionExpenses
      .filter(exp => exp.sport === 'Badminton')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const footballFees = feeCollectionExpenses
      .filter(exp => exp.sport === 'Football')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const cricketFees = feeCollectionExpenses
      .filter(exp => exp.sport === 'Cricket')
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Sport-specific pending amounts
    const badmintonPending = feeCollectionExpenses
      .filter(exp => exp.sport === 'Badminton' && exp.status === 'pending')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const footballPending = feeCollectionExpenses
      .filter(exp => exp.sport === 'Football' && exp.status === 'pending')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const cricketPending = feeCollectionExpenses
      .filter(exp => exp.sport === 'Cricket' && exp.status === 'pending')
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Enhanced Expense splitting between Sasi and Satheesh
    const regularExpensesTotal = regularExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Advanced split logic - assume equal responsibility unless specified otherwise
    // This can be enhanced to track who actually paid what
    const totalBusinessExpenses = regularExpensesTotal; // Only regular business expenses, not fee collection
    
    // For now, assume 50-50 split of business expenses
    const satheeshTotal = totalBusinessExpenses / 2;
    const sasiTotal = totalBusinessExpenses / 2;
    
    // TODO: Track actual payments made by each partner
    // For now, assume they need to settle equally
    const satheeshPaid = 0; // This should be tracked from actual payment records
    const sasiPaid = 0; // This should be tracked from actual payment records
    
    const satheeshOwed = satheeshTotal - satheeshPaid;
    const sasiOwed = sasiTotal - sasiPaid;
    const netBalance = satheeshOwed - sasiOwed;
    const splitDifference = Math.abs(netBalance);
    const settlementAmount = splitDifference / 2;
    
    const whoOwesWho = netBalance === 0 ? 'Balanced' : 
      netBalance > 0 ? `Satheesh owes Sasi ₹${settlementAmount.toFixed(2)}` : 
      `Sasi owes Satheesh ₹${settlementAmount.toFixed(2)}`;

    // Advanced Date range analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setTime(lastWeekEnd.getTime() - 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(thisMonthStart);
    lastMonthEnd.setTime(lastMonthEnd.getTime() - 1);

    // Calculate various time period expenses
    const todayExpenses = expenseList
      .filter(exp => {
        const expDate = new Date(exp.paymentDate);
        expDate.setHours(0, 0, 0, 0);
        return expDate.getTime() === today.getTime();
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    const yesterdayExpenses = expenseList
      .filter(exp => {
        const expDate = new Date(exp.paymentDate);
        expDate.setHours(0, 0, 0, 0);
        return expDate.getTime() === yesterday.getTime();
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    const thisWeekExpenses = expenseList
      .filter(exp => new Date(exp.paymentDate) >= thisWeekStart)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const lastWeekExpenses = expenseList
      .filter(exp => {
        const expDate = new Date(exp.paymentDate);
        return expDate >= lastWeekStart && expDate <= lastWeekEnd;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    const thisMonthExpenses = expenseList
      .filter(exp => new Date(exp.paymentDate) >= thisMonthStart)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const lastMonthExpenses = expenseList
      .filter(exp => {
        const expDate = new Date(exp.paymentDate);
        return expDate >= lastMonthStart && expDate <= lastMonthEnd;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Historical period calculations for moving averages
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

    const weeklyExpenses = expenseList
      .filter(exp => new Date(exp.paymentDate) >= weekAgo)
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    const monthlyExpenses = expenseList
      .filter(exp => new Date(exp.paymentDate) >= monthAgo)
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    const yearlyExpenses = expenseList
      .filter(exp => new Date(exp.paymentDate) >= yearAgo)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate averages
    const daysInRange = dateRange === 'week' ? 7 : 
                        dateRange === 'month' ? 30 : 
                        dateRange === 'year' ? 365 : 
                        filteredExpenses.length > 0 ? 
                          Math.max(1, Math.ceil((now.getTime() - new Date(Math.min(...filteredExpenses.map(e => new Date(e.paymentDate).getTime()))).getTime()) / (24 * 60 * 60 * 1000))) : 1;
    
    const averageDaily = totalAmount / Math.max(1, daysInRange);
    const averageWeekly = (weeklyExpenses / 7) * 7; // Weekly average
    const averageMonthly = (monthlyExpenses / 30) * 30; // Monthly average

    // Growth calculations
    const weekOverWeekGrowth = lastWeekExpenses === 0 ? 0 : 
      ((thisWeekExpenses - lastWeekExpenses) / lastWeekExpenses) * 100;
    
    const monthOverMonthGrowth = lastMonthExpenses === 0 ? 0 : 
      ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

    // Expense type breakdown percentages
    const feeCollectionPercentage = totalAmount === 0 ? 0 : (feeCollectionTotal / totalAmount) * 100;
    const regularExpensesPercentage = totalAmount === 0 ? 0 : (regularExpensesTotal / totalAmount) * 100;

    setStats({
      totalExpenses,
      totalAmount,
      pendingPayments,
      overduePayments,
      monthlyRevenue,
      satheeshTotal,
      sasiTotal,
      satheeshPaid,
      sasiPaid,
      satheeshOwed,
      sasiOwed,
      netBalance,
      splitDifference,
      whoOwesWho,
      settlementAmount: Number(settlementAmount.toFixed(2)),
      feeCollectionTotal,
      feeCollectionPending,
      feeCollectionPaid,
      badmintonFees,
      footballFees,
      cricketFees,
      badmintonPending,
      footballPending,
      cricketPending,
      weeklyExpenses,
      monthlyExpenses,
      yearlyExpenses,
      todayExpenses,
      yesterdayExpenses,
      thisWeekExpenses,
      lastWeekExpenses,
      thisMonthExpenses,
      lastMonthExpenses,
      averageDaily: Number(averageDaily.toFixed(2)),
      averageWeekly: Number(averageWeekly.toFixed(2)),
      averageMonthly: Number(averageMonthly.toFixed(2)),
      weekOverWeekGrowth: Number(weekOverWeekGrowth.toFixed(1)),
      monthOverMonthGrowth: Number(monthOverMonthGrowth.toFixed(1)),
      regularExpensesTotal,
      feeCollectionPercentage: Number(feeCollectionPercentage.toFixed(1)),
      regularExpensesPercentage: Number(regularExpensesPercentage.toFixed(1))
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find(user => user._id === userId);
    if (selectedUser) {
      setNewExpense({
        ...newExpense,
        userId: selectedUser._id,
        userName: selectedUser.name,
        champId: selectedUser.champId,
      });
    }
  };

  const handleAddExpense = async () => {
    try {
      if (!newExpense.userId || !newExpense.amount || newExpense.amount <= 0) {
        setError('Please fill all required fields with valid data');
        return;
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpense),
      });

      if (response.ok) {
        setSuccess('Expense added successfully');
        setAddExpenseDialog(false);
        fetchData();
        resetNewExpense();
      } else {
        throw new Error('Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      setError('Failed to add expense');
    }
  };

  const handleEditExpense = async () => {
    try {
      if (!selectedExpense) return;

      const response = await fetch(`/api/expenses/${selectedExpense._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedExpense),
      });

      if (response.ok) {
        setSuccess('Expense updated successfully');
        setEditExpenseDialog(false);
        fetchData();
        setSelectedExpense(null);
      } else {
        throw new Error('Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      setError('Failed to update expense');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this expense?')) return;

      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Expense deleted successfully');
        fetchData();
      } else {
        throw new Error('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError('Failed to delete expense');
    }
  };

  const resetNewExpense = () => {
    setNewExpense({
      userId: '',
      userName: '',
      champId: '',
      subscriptionType: 'monthly',
      amount: 0,
      sport: 'Badminton',
      paymentDate: new Date().toISOString().split('T')[0],
      description: '',
      status: 'pending',
    });
  };

  const openEditDialog = (expense: Expense) => {
    setSelectedExpense({ ...expense });
    setEditExpenseDialog(true);
  };

  // Filter expenses
  useEffect(() => {
    let filtered = expenses;

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.champId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterSport !== 'all') {
      filtered = filtered.filter(expense => expense.sport === filterSport);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(expense => expense.status === filterStatus);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(exp => new Date(exp.paymentDate) >= startDate);
      } else if (dateRange === 'week') {
        startDate.setDate(now.getDate() - 7);
        filtered = filtered.filter(exp => new Date(exp.paymentDate) >= startDate);
      } else if (dateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
        filtered = filtered.filter(exp => new Date(exp.paymentDate) >= startDate);
      } else if (dateRange === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
        filtered = filtered.filter(exp => new Date(exp.paymentDate) >= startDate);
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        filtered = filtered.filter(exp => {
          const expDate = new Date(exp.paymentDate);
          return expDate >= start && expDate <= end;
        });
      }
    }

    // Expense type filter
    if (expenseType !== 'all') {
      if (expenseType === 'fee-collection') {
        filtered = filtered.filter(expense => expense.userId); // Has userId means fee collection
      } else if (expenseType === 'regular') {
        filtered = filtered.filter(expense => !expense.userId); // No userId means regular expense
      }
    }

    setFilteredExpenses(filtered);
    calculateStats(filtered); // Recalculate stats with filtered data
  }, [expenses, searchTerm, filterSport, filterStatus, dateRange, customStartDate, customEndDate, expenseType]);

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
            <AccountBalance color="primary" sx={{ mr: 2, fontSize: 40 }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Fee Collection Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage subscription fees and payments
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
              onClick={fetchData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Receipt color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Expenses
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalExpenses}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Amount
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats.totalAmount)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Payment color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h4">
                    {stats.pendingPayments}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Payment color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Overdue
                  </Typography>
                  <Typography variant="h4">
                    {stats.overduePayments}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats.monthlyRevenue)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Enhanced Statistics - Comprehensive Analytics Dashboard */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Expense Splitting Analysis */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                💰 Partner Expense Splitting
              </Typography>
              <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
                {stats.whoOwesWho}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Typography variant="caption">Satheesh's Share</Typography>
                    <Typography variant="h6">{formatCurrency(stats.satheeshTotal)}</Typography>
                    <Typography variant="caption">Paid: {formatCurrency(stats.satheeshPaid)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Typography variant="caption">Sasi's Share</Typography>
                    <Typography variant="h6">{formatCurrency(stats.sasiTotal)}</Typography>
                    <Typography variant="caption">Paid: {formatCurrency(stats.sasiPaid)}</Typography>
                  </Box>
                </Grid>
              </Grid>

              {stats.settlementAmount > 0 && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="body2">
                    💸 Settlement Amount: {formatCurrency(stats.settlementAmount)}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block">Business Expenses: {formatCurrency(stats.regularExpensesTotal)}</Typography>
                <Typography variant="caption" display="block">Fee Revenue: {formatCurrency(stats.feeCollectionTotal)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Fee Collection Analytics */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏆 Fee Collection Analytics
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatCurrency(stats.feeCollectionTotal)}
              </Typography>
              
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption">🏸 Badminton</Typography>
                    <Typography variant="body2">{formatCurrency(stats.badmintonFees)}</Typography>
                    <Typography variant="caption" color="warning.main">
                      Pending: {formatCurrency(stats.badmintonPending)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption">⚽ Football</Typography>
                    <Typography variant="body2">{formatCurrency(stats.footballFees)}</Typography>
                    <Typography variant="caption" color="warning.main">
                      Pending: {formatCurrency(stats.footballPending)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption">🏏 Cricket</Typography>
                    <Typography variant="body2">{formatCurrency(stats.cricketFees)}</Typography>
                    <Typography variant="caption" color="warning.main">
                      Pending: {formatCurrency(stats.cricketPending)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
                <Typography variant="body2">
                  💳 Collection Rate: {stats.feeCollectionTotal > 0 ? Math.round((stats.feeCollectionPaid / stats.feeCollectionTotal) * 100) : 0}%
                </Typography>
                <Typography variant="body2">
                  📊 Revenue Split: Fee {stats.feeCollectionPercentage}% | Expense {stats.regularExpensesPercentage}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Time-based Analytics Dashboard */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Time-based Analytics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption">📅 Today vs Yesterday</Typography>
                  <Typography variant="body2">
                    Today: {formatCurrency(stats.todayExpenses)}
                  </Typography>
                  <Typography variant="body2">
                    Yesterday: {formatCurrency(stats.yesterdayExpenses)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">� This Week vs Last Week</Typography>
                  <Typography variant="body2">
                    This Week: {formatCurrency(stats.thisWeekExpenses)}
                  </Typography>
                  <Typography variant="body2">
                    Last Week: {formatCurrency(stats.lastWeekExpenses)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">📋 This Month vs Last Month</Typography>
                  <Typography variant="body2">
                    This Month: {formatCurrency(stats.thisMonthExpenses)}
                  </Typography>
                  <Typography variant="body2">
                    Last Month: {formatCurrency(stats.lastMonthExpenses)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">⚡ Averages</Typography>
                  <Typography variant="body2">
                    Daily: {formatCurrency(stats.averageDaily)}
                  </Typography>
                  <Typography variant="body2">
                    Monthly: {formatCurrency(stats.averageMonthly)}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
                <Typography variant="body2">
                  📊 Week Growth: {stats.weekOverWeekGrowth > 0 ? '+' : ''}{stats.weekOverWeekGrowth}%
                </Typography>
                <Typography variant="body2">
                  📈 Month Growth: {stats.monthOverMonthGrowth > 0 ? '+' : ''}{stats.monthOverMonthGrowth}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Rolling Period Analytics */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                � Rolling Period Analysis
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption">Last 7 Days</Typography>
                    <Typography variant="h6">{formatCurrency(stats.weeklyExpenses)}</Typography>
                    <Typography variant="caption">Avg: {formatCurrency(stats.weeklyExpenses / 7)}/day</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption">Last 30 Days</Typography>
                    <Typography variant="h6">{formatCurrency(stats.monthlyExpenses)}</Typography>
                    <Typography variant="caption">Avg: {formatCurrency(stats.monthlyExpenses / 30)}/day</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="caption">Last 365 Days</Typography>
                    <Typography variant="h6">{formatCurrency(stats.yearlyExpenses)}</Typography>
                    <Typography variant="caption">Avg: {formatCurrency(stats.yearlyExpenses / 365)}/day</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
                <Typography variant="body2" textAlign="center">
                  🎯 Current filter showing {filteredExpenses.length} of {expenses.length} total records
                </Typography>
                <Typography variant="body2" textAlign="center">
                  💰 Filtered total: {formatCurrency(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📋 Filters & Search
        </Typography>
        
        {/* Quick Filter Buttons */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Quick Filters:</Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            <Button
              size="small"
              variant={dateRange === 'today' ? 'contained' : 'outlined'}
              onClick={() => setDateRange('today')}
            >
              📅 Today
            </Button>
            <Button
              size="small"
              variant={dateRange === 'week' ? 'contained' : 'outlined'}
              onClick={() => setDateRange('week')}
            >
              🗓️ Last 7 Days
            </Button>
            <Button
              size="small"
              variant={dateRange === 'month' ? 'contained' : 'outlined'}
              onClick={() => setDateRange('month')}
            >
              📊 Last 30 Days
            </Button>
            <Button
              size="small"
              variant={filterStatus === 'pending' ? 'contained' : 'outlined'}
              color="warning"
              onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
            >
              ⏳ Pending Only
            </Button>
            <Button
              size="small"
              variant={expenseType === 'fee-collection' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => setExpenseType(expenseType === 'fee-collection' ? 'all' : 'fee-collection')}
            >
              🏆 Fee Collection
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => {
                setDateRange('all');
                setFilterSport('all');
                setFilterStatus('all');
                setExpenseType('all');
                setSearchTerm('');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
            >
              🔄 Reset All
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search expenses"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name or Champ ID"
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sport</InputLabel>
              <Select
                value={filterSport}
                label="Sport"
                onChange={(e) => setFilterSport(e.target.value)}
              >
                <MenuItem value="all">All Sports</MenuItem>
                <MenuItem value="Badminton">🏸 Badminton</MenuItem>
                <MenuItem value="Football">⚽ Football</MenuItem>
                <MenuItem value="Cricket">🏏 Cricket</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="paid">✅ Paid</MenuItem>
                <MenuItem value="pending">⏳ Pending</MenuItem>
                <MenuItem value="overdue">❌ Overdue</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="all">🔄 All Time</MenuItem>
                <MenuItem value="today">📅 Today</MenuItem>
                <MenuItem value="week">🗓️ Last 7 Days</MenuItem>
                <MenuItem value="month">📊 Last 30 Days</MenuItem>
                <MenuItem value="year">📈 Last Year</MenuItem>
                <MenuItem value="custom">⚙️ Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={expenseType}
                label="Type"
                onChange={(e) => setExpenseType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="fee-collection">🏆 Fee Collection</MenuItem>
                <MenuItem value="regular">💼 Regular Expenses</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {filteredExpenses.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of {expenses.length}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Enhanced Custom Date Range */}
        {dateRange === 'custom' && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              📅 Custom Date Range
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="primary">
                    💡 Custom date range is active
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {customStartDate && customEndDate && 
                      `Showing data from ${format(new Date(customStartDate), 'dd MMM yyyy')} to ${format(new Date(customEndDate), 'dd MMM yyyy')}`
                    }
                  </Typography>
                  {customStartDate && customEndDate && (
                    <Typography variant="body2" color="success.main">
                      ✅ Filtered Amount: {formatCurrency(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Current Filter Summary */}
        {(dateRange !== 'all' || filterSport !== 'all' || filterStatus !== 'all' || expenseType !== 'all' || searchTerm) && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Typography variant="body2" color="primary.contrastText">
              🔍 <strong>Active Filters:</strong> 
              {dateRange !== 'all' && ` Date: ${dateRange}`}
              {filterSport !== 'all' && ` | Sport: ${filterSport}`}
              {filterStatus !== 'all' && ` | Status: ${filterStatus}`}
              {expenseType !== 'all' && ` | Type: ${expenseType}`}
              {searchTerm && ` | Search: "${searchTerm}"`}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Key Insights Summary */}
      {filteredExpenses.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            💡 Key Insights & Recommendations
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>📊 Financial Summary</Typography>
                <Typography variant="body2">
                  • Total Revenue: {formatCurrency(stats.feeCollectionTotal)}
                </Typography>
                <Typography variant="body2">
                  • Business Expenses: {formatCurrency(stats.regularExpensesTotal)}
                </Typography>
                <Typography variant="body2">
                  • Net Position: {formatCurrency(stats.feeCollectionTotal - stats.regularExpensesTotal)}
                </Typography>
                <Typography variant="body2">
                  • Profit Margin: {stats.feeCollectionTotal > 0 ? Math.round(((stats.feeCollectionTotal - stats.regularExpensesTotal) / stats.feeCollectionTotal) * 100) : 0}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'warning.contrastText', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>⚠️ Action Items</Typography>
                {stats.pendingPayments > 0 && (
                  <Typography variant="body2">
                    • Follow up on {stats.pendingPayments} pending payments
                  </Typography>
                )}
                {stats.overduePayments > 0 && (
                  <Typography variant="body2">
                    • Urgent: {stats.overduePayments} overdue payments
                  </Typography>
                )}
                {stats.settlementAmount > 0 && (
                  <Typography variant="body2">
                    • Partner settlement needed: {formatCurrency(stats.settlementAmount)}
                  </Typography>
                )}
                {stats.pendingPayments === 0 && stats.overduePayments === 0 && (
                  <Typography variant="body2">
                    ✅ All payments are up to date!
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>Performance Metrics</Typography>
                <Typography variant="body2">
                  • Collection Rate: {stats.feeCollectionTotal > 0 ? Math.round((stats.feeCollectionPaid / stats.feeCollectionTotal) * 100) : 0}%
                </Typography>
                <Typography variant="body2">
                  • Growth (Week): {stats.weekOverWeekGrowth > 0 ? '📈' : stats.weekOverWeekGrowth < 0 ? '📉' : '➡️'} {stats.weekOverWeekGrowth}%
                </Typography>
                <Typography variant="body2">
                  • Growth (Month): {stats.monthOverMonthGrowth > 0 ? '📈' : stats.monthOverMonthGrowth < 0 ? '📉' : '➡️'} {stats.monthOverMonthGrowth}%
                </Typography>
                <Typography variant="body2">
                  • Daily Average: {formatCurrency(stats.averageDaily)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Expenses Table */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Champ ID</TableCell>
                <TableCell>User Name</TableCell>
                <TableCell>Sport</TableCell>
                <TableCell>Subscription Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body1" color="text.secondary">
                      No expenses found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense._id} hover>
                    <TableCell>
                      {format(new Date(expense.paymentDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Chip label={expense.champId} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{expense.userName}</TableCell>
                    <TableCell>
                      <Chip 
                        label={expense.sport} 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={expense.subscriptionType} 
                        size="small" 
                        color="info"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <strong>{formatCurrency(expense.amount)}</strong>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={expense.status}
                        color={getStatusColor(expense.status) as any}
                        variant="filled"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {expense.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(expense)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteExpense(expense._id!)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add expense"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setAddExpenseDialog(true)}
      >
        <Add />
      </Fab>

      {/* Add Expense Dialog */}
      <Dialog open={addExpenseDialog} onClose={() => setAddExpenseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Expense</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Select User</InputLabel>
                  <Select
                    value={newExpense.userId}
                    label="Select User"
                    onChange={(e) => handleUserSelect(e.target.value)}
                  >
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.champId} - {user.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sport</InputLabel>
                  <Select
                    value={newExpense.sport}
                    label="Sport"
                    onChange={(e) => setNewExpense({
                      ...newExpense,
                      sport: e.target.value as 'Badminton' | 'Football' | 'Cricket'
                    })}
                  >
                    <MenuItem value="Badminton">Badminton</MenuItem>
                    <MenuItem value="Football">Football</MenuItem>
                    <MenuItem value="Cricket">Cricket</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Subscription Type</InputLabel>
                  <Select
                    value={newExpense.subscriptionType}
                    label="Subscription Type"
                    onChange={(e) => setNewExpense({
                      ...newExpense,
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
                <TextField
                  fullWidth
                  label="Amount (₹)"
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({
                    ...newExpense,
                    amount: Number(e.target.value)
                  })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Payment Date"
                  type="date"
                  value={newExpense.paymentDate}
                  onChange={(e) => setNewExpense({
                    ...newExpense,
                    paymentDate: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newExpense.status}
                    label="Status"
                    onChange={(e) => setNewExpense({
                      ...newExpense,
                      status: e.target.value as 'paid' | 'pending' | 'overdue'
                    })}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  multiline
                  rows={3}
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({
                    ...newExpense,
                    description: e.target.value
                  })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddExpenseDialog(false)}>Cancel</Button>
          <Button onClick={handleAddExpense} variant="contained">Add Expense</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={editExpenseDialog} onClose={() => setEditExpenseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="User Name"
                    value={selectedExpense.userName}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Champ ID"
                    value={selectedExpense.champId}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Sport</InputLabel>
                    <Select
                      value={selectedExpense.sport}
                      label="Sport"
                      onChange={(e) => setSelectedExpense({
                        ...selectedExpense,
                        sport: e.target.value as 'Badminton' | 'Football' | 'Cricket'
                      })}
                    >
                      <MenuItem value="Badminton">Badminton</MenuItem>
                      <MenuItem value="Football">Football</MenuItem>
                      <MenuItem value="Cricket">Cricket</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Subscription Type</InputLabel>
                    <Select
                      value={selectedExpense.subscriptionType}
                      label="Subscription Type"
                      onChange={(e) => setSelectedExpense({
                        ...selectedExpense,
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
                  <TextField
                    fullWidth
                    label="Amount (₹)"
                    type="number"
                    value={selectedExpense.amount}
                    onChange={(e) => setSelectedExpense({
                      ...selectedExpense,
                      amount: Number(e.target.value)
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Payment Date"
                    type="date"
                    value={selectedExpense.paymentDate}
                    onChange={(e) => setSelectedExpense({
                      ...selectedExpense,
                      paymentDate: e.target.value
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedExpense.status}
                      label="Status"
                      onChange={(e) => setSelectedExpense({
                        ...selectedExpense,
                        status: e.target.value as 'paid' | 'pending' | 'overdue'
                      })}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description (Optional)"
                    multiline
                    rows={3}
                    value={selectedExpense.description || ''}
                    onChange={(e) => setSelectedExpense({
                      ...selectedExpense,
                      description: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditExpenseDialog(false)}>Cancel</Button>
          <Button onClick={handleEditExpense} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExpensesPage;