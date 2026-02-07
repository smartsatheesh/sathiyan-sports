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
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import {
  ArrowBack,
  TrendingUp,
  AccountBalanceWallet,
  Receipt,
  CalendarMonth,
  Person,
  Category,
  Payment,
} from "@mui/icons-material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ExpenseStats {
  overall: {
    totalAmount: number;
    totalExpenses: number;
    avgExpense: number;
  };
  currentMonth: {
    totalAmount: number;
    totalExpenses: number;
  };
  byCategory: Array<{
    _id: string;
    totalAmount: number;
    count: number;
    avgAmount: number;
  }>;
  byPaidBy: Array<{
    _id: string;
    totalAmount: number;
    count: number;
    avgAmount: number;
  }>;
  byPaymentMethod: Array<{
    _id: string;
    totalAmount: number;
    count: number;
  }>;
  monthly: Array<{
    _id: { month: number; year: number };
    totalAmount: number;
    count: number;
    avgAmount: number;
  }>;
  recentHighExpenses: Array<{
    _id: string;
    amount: number;
    description: string;
    paidBy: string;
    category: string;
    date: string;
  }>;
  monthlyCategoryBreakdown: Array<{
    _id: { month: number; category: string };
    totalAmount: number;
    count: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ExpenseStatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Authentication check
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login?callbackUrl=/admin/expenses/stats");
      return;
    }
    
    if ((session.user as any)?.role !== "admin") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/expenses/stats?year=${selectedYear}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to fetch expense statistics' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && (session.user as any).role === "admin") {
      fetchStats();
    }
  }, [session, selectedYear]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Prepare monthly chart data
  const monthlyChartData = stats ? MONTH_NAMES.map((month, index) => {
    const monthData = stats.monthly.find(m => m._id.month === index + 1);
    return {
      month,
      amount: monthData?.totalAmount || 0,
      count: monthData?.count || 0,
    };
  }) : [];

  // Prepare category pie chart data
  const categoryPieData = stats?.byCategory.map((item, index) => ({
    name: item._id,
    value: item.totalAmount,
    color: COLORS[index % COLORS.length],
  })) || [];

  // Prepare paid by chart data
  const paidByChartData = stats?.byPaidBy.map(item => ({
    name: item._id,
    amount: item.totalAmount,
    count: item.count,
  })) || [];

  if (status === "loading" || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">Failed to load expense statistics</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/admin/expenses')}
            sx={{ mr: 2 }}
          >
            Back to Expenses
          </Button>
          <Typography variant="h4" component="h1">
            Expense Statistics
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            label="Year"
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2023, 2024, 2025, 2026].map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
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

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBalanceWallet color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Expenses
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(stats.overall.totalAmount)}
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
                <Receipt color="secondary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Count
                  </Typography>
                  <Typography variant="h5">
                    {stats.overall.totalExpenses}
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
                <TrendingUp color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Average Expense
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(stats.overall.avgExpense)}
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
                <CalendarMonth color="info" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    This Month
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(stats.currentMonth.totalAmount)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stats.currentMonth.totalExpenses} expenses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Monthly Trends */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Monthly Expense Trends ({selectedYear})
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Expenses by Category
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Paid By Analysis */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Expenses by Person
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paidByChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Payment Method Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Payment Method Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              {stats.byPaymentMethod.map((method, index) => (
                <Box key={method._id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {method._id.toUpperCase()}
                    </Typography>
                    <Chip 
                      label={`${method.count} transactions`}
                      color={method._id === 'gpay' ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(method.totalAmount)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {((method.totalAmount / stats.overall.totalAmount) * 100).toFixed(1)}% of total
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tables Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Category Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Category Breakdown
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Average</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.byCategory.map((category) => (
                    <TableRow key={category._id}>
                      <TableCell>
                        <Chip 
                          label={category._id} 
                          size="small" 
                          color={category._id === 'Sathiyan sports' ? 'primary' : 
                                 category._id === 'Common' ? 'secondary' : 'success'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(category.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{category.count}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(category.avgAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent High Expenses */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Top 10 Highest Expenses
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Amount</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Paid By</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentHighExpenses.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {formatCurrency(expense.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {expense.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={expense.paidBy} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(expense.date).toLocaleDateString('en-GB')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Person-wise Analysis */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Person-wise Expense Analysis
            </Typography>
            <Grid container spacing={2}>
              {stats.byPaidBy.map((person) => (
                <Grid item xs={12} sm={6} md={3} key={person._id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">{person._id}</Typography>
                      </Box>
                      <Typography variant="h5" color="primary" sx={{ mb: 1 }}>
                        {formatCurrency(person.totalAmount)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {person.count} expenses
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Avg: {formatCurrency(person.avgAmount)}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          {((person.totalAmount / stats.overall.totalAmount) * 100).toFixed(1)}% of total
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}