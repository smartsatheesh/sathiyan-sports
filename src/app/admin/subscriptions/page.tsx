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
  ToggleButton,
  ToggleButtonGroup,
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
  TrendingDown,
  People,
  CheckCircle,
  Cancel,
  Warning,
  AttachMoney,
  Timeline,
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
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [renewalData, setRenewalData] = useState<{
    amount: number;
    startDate: string;
    endDate: string;
    paymentStatus: string;
    paymentMethod: string;
    transactionId: string;
    selectedCourt: string;
  }>({ 
    amount: 0, 
    startDate: '', 
    endDate: '', 
    paymentStatus: 'Paid', 
    paymentMethod: '', 
    transactionId: '', 
    selectedCourt: '' 
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Initialize date filters to current month by default
  const getCurrentMonthDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Last day of current month
    const lastDay = new Date(year, month + 1, 0);
    
    // Format as YYYY-MM-DD without timezone issues
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      from: formatDate(firstDay),
      to: formatDate(lastDay)
    };
  };
  const currentMonthDates = getCurrentMonthDates();
  const [subscribedDateFrom, setSubscribedDateFrom] = useState<string>(currentMonthDates.from);
  const [subscribedDateTo, setSubscribedDateTo] = useState<string>(currentMonthDates.to);
  const [dueDateFrom, setDueDateFrom] = useState<string>('');
  const [dueDateTo, setDueDateTo] = useState<string>('');
  const [preferredSportFilter, setPreferredSportFilter] = useState<string>('all');
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
  }, [filterStatus, searchTerm, subscribedDateFrom, subscribedDateTo, dueDateFrom, dueDateTo, preferredSportFilter]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      console.log('🔍 ADMIN PAGE: Fetching subscriptions from unified API...');
      const response = await fetch('/api/subscriptions');
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
      
      // A subscription is overdue if:
      // 1. The due date has passed
      // 2. The subscription is still active (not expired/cancelled)
      const isPastDue = today > dueDate;
      const isActive = (sub.status === 'active' || !sub.status) && 
                      sub.status !== 'expired' && 
                      sub.status !== 'cancelled';
      
      return isPastDue && isActive;
    }).length;

    // Total revenue from ALL subscriptions (not filtered)
    const allTimeRevenue = subscriptions.filter(sub => 
      sub.paymentStatus === 'Paid' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'completed'
    ).reduce((sum, sub) => sum + (sub.amount || 0), 0);

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
        totalRevenue: Math.round(allTimeRevenue),
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
      console.log('💾 Saving subscription:', selectedSubscription._id, selectedSubscription);
      
      const updateData = {
        paymentStatus: selectedSubscription.paymentStatus,
        transactionId: selectedSubscription.transactionId,
        paymentMethod: selectedSubscription.paymentMethod,
        mode: selectedSubscription.mode,
        amount: Number(selectedSubscription.amount), // Ensure it's a number
        autoRenewal: selectedSubscription.autoRenewal,
        startDate: selectedSubscription.startDate,
        endDate: selectedSubscription.endDate,
        nextDueDate: selectedSubscription.nextDueDate, // Add nextDueDate to payload
        status: selectedSubscription.status,
        selectedCourt: selectedSubscription.selectedCourt,
        notes: selectedSubscription.notes, // Add notes/comments to payload
        updatedBy: session?.user?.id
      };

      console.log('💾 Sending update data:', updateData);

      const response = await fetch(`/api/subscriptions/${selectedSubscription._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      console.log('💾 Server response:', result);

      if (response.ok) {
        console.log('✅ Subscription updated successfully');
        await fetchSubscriptions();
        await fetchStats();
        setEditDialogOpen(false);
        setSelectedSubscription(null);
      } else {
        console.error('❌ Failed to update subscription:', result);
        alert('Failed to update subscription: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error updating subscription:', error);
      alert('Error updating subscription: ' + error.message);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      console.log('🗑️ Deleting subscription:', id);
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('✅ Subscription deleted successfully');
        fetchSubscriptions();
        fetchStats();
      } else {
        console.error('❌ Failed to delete subscription');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  const openRenewDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    
    // Calculate next period dates - start from the day after current period ends
    const currentEndDate = new Date(subscription.endDate);
    const nextStartDate = new Date(currentEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    
    // Calculate next end date as LAST day of the period
    const durationMap: { [key: string]: number } = {
      'monthly': 1,
      'quarterly': 3,
      'half yearly': 6,
      'yearly': 12
    };
    
    const monthsToAdd = durationMap[subscription.subscriptionType] || 1;
    
    // Calculate last day of the period
    // For monthly: last day of the month that starts from nextStartDate
    // Using day 0 of next month gives us last day of current month
    const targetMonth = nextStartDate.getMonth() + monthsToAdd;
    const nextEndDate = new Date(nextStartDate.getFullYear(), targetMonth, 0);
    
    setRenewalData({
      amount: subscription.amount,
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0],
      paymentStatus: 'Paid',
      paymentMethod: subscription.paymentMethod || '',
      transactionId: '',
      selectedCourt: subscription.selectedCourt || ''
    });
    
    setRenewDialogOpen(true);
  };

  const handleRenewSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      console.log('🔄 Renewing subscription:', selectedSubscription._id, renewalData);
      
      const response = await fetch(`/api/subscriptions/${selectedSubscription._id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renewalData)
      });

      const result = await response.json();
      console.log('🔄 Renewal response:', result);

      if (response.ok) {
        console.log('✅ Subscription renewed successfully - historical data preserved');
        await fetchSubscriptions();
        await fetchStats();
        setRenewDialogOpen(false);
        setSelectedSubscription(null);
        alert('Subscription renewed successfully! Historical data has been preserved.');
      } else {
        console.error('❌ Failed to renew subscription:', result);
        alert('Failed to renew subscription: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error renewing subscription:', error);
      alert('Error renewing subscription: ' + error.message);
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
          
          // A subscription is overdue if:
          // 1. The due date has passed
          // 2. The subscription is still active (not expired/cancelled)
          // Note: We don't check payment status because even "Paid" subscriptions
          // become overdue when their period expires and need renewal
          const isPastDue = today > dueDate;
          const isActive = (subscription.status === 'active' || !subscription.status) && 
                          subscription.status !== 'expired' && 
                          subscription.status !== 'cancelled';
          
          matchesStatus = isPastDue && isActive;
        } else {
          matchesStatus = false;
        }
      } else {
        // Regular paymentStatus matching
        matchesStatus = subscription.paymentStatus.toLowerCase() === filterStatus.toLowerCase();
      }
      
      const matchesSearch = !searchTerm || 
        (subscription.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (subscription.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (subscription.userId?.champId?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Preferred sport filtering
      const matchesSport = preferredSportFilter === 'all' || 
        subscription.preferredSport === preferredSportFilter ||
        (preferredSportFilter === 'Other' && !subscription.preferredSport) ||
        (preferredSportFilter === 'Other' && subscription.preferredSport && 
         !['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events'].includes(subscription.preferredSport));
      
      // Subscribed date range filtering (startDate)
      let matchesDateRange = true;
      if (subscribedDateFrom) {
        const filterDate = new Date(subscribedDateFrom);
        filterDate.setHours(0, 0, 0, 0);
        const subscriptionStart = new Date(subscription.startDate);
        subscriptionStart.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && subscriptionStart >= filterDate;
      }
      if (subscribedDateTo) {
        const filterDate = new Date(subscribedDateTo);
        filterDate.setHours(23, 59, 59, 999);
        const subscriptionStart = new Date(subscription.startDate);
        subscriptionStart.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && subscriptionStart <= filterDate;
      }
      
      // Due date range filtering (From/To)
      if (dueDateFrom && subscription.nextDueDate) {
        const filterDate = new Date(dueDateFrom);
        filterDate.setHours(0, 0, 0, 0);
        const subNextDue = new Date(subscription.nextDueDate);
        subNextDue.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && subNextDue >= filterDate;
      }
      if (dueDateTo && subscription.nextDueDate) {
        const filterDate = new Date(dueDateTo);
        filterDate.setHours(23, 59, 59, 999);
        const subNextDue = new Date(subscription.nextDueDate);
        subNextDue.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && subNextDue <= filterDate;
      }
      
      return matchesStatus && matchesSearch && matchesSport && matchesDateRange;
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
  }, [subscriptions, filterStatus, searchTerm, subscribedDateFrom, subscribedDateTo, dueDateFrom, dueDateTo, preferredSportFilter, sortBy, sortOrder]);

  // Dynamic stats calculation based on filtered data
  const dynamicStats = useMemo(() => {
    const filtered = filteredAndSortedSubscriptions;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Determine the period for active subscription check
    let periodStart: Date;
    let periodEnd: Date;
    
    if (subscribedDateFrom || subscribedDateTo) {
      periodStart = subscribedDateFrom ? new Date(subscribedDateFrom) : new Date(0);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = subscribedDateTo ? new Date(subscribedDateTo) : new Date();
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      // Default to current month
      periodStart = new Date(currentYear, currentMonth, 1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(currentYear, currentMonth + 1, 0);
      periodEnd.setHours(23, 59, 59, 999);
    }
    
    const gracePeriodDays = 5;
    const graceDate = new Date(periodStart);
    graceDate.setDate(graceDate.getDate() - gracePeriodDays);
    
    // Helper function to check if subscription is active for the period
    const isActiveForPeriod = (s: any) => {
      const startDate = s.startDate ? new Date(s.startDate) : null;
      if (!startDate) return false;
      startDate.setHours(0, 0, 0, 0);
      
      // Subscription must have started before period ends
      if (startDate > periodEnd) return false;
      
      // Check if subscription covers the period with grace
      const nextDueDate = s.nextDueDate ? new Date(s.nextDueDate) : null;
      const endDate = s.endDate ? new Date(s.endDate) : null;
      const effectiveEndDate = nextDueDate || endDate;
      
      if (effectiveEndDate) {
        effectiveEndDate.setHours(23, 59, 59, 999);
        return effectiveEndDate >= graceDate;
      }
      
      return true; // No end date means ongoing
    };
    
    // Calculate filtered stats (only count subscriptions active for the selected period)
    const activeFilteredSubs = filtered.filter(isActiveForPeriod);
    const totalSubscriptions = activeFilteredSubs.length;
    const paidSubscriptions = activeFilteredSubs.filter(s => s.paymentStatus === 'Paid').length;
    const pendingSubscriptions = activeFilteredSubs.filter(s => s.paymentStatus === 'Pending').length;
    const overdueSubscriptions = activeFilteredSubs.filter(s => {
      if (s.nextDueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(s.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        // A subscription is overdue if:
        // 1. The due date has passed
        // 2. The subscription is still active (not expired/cancelled)
        const isPastDue = today > dueDate;
        const isActive = (s.status === 'active' || !s.status) && 
                        s.status !== 'expired' && 
                        s.status !== 'cancelled';
        
        return isPastDue && isActive;
      }
      return false;
    }).length;
    
    // Calculate all-time revenue from ALL subscriptions (not just filtered)
    const allTimeRevenue = subscriptions
      .filter(sub => sub.paymentStatus === 'Paid' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'completed')
      .reduce((sum, sub) => sum + (sub.amount || 0), 0);
    
    // Calculate total revenue from filtered subscriptions
    const filteredRevenue = filtered
      .filter(sub => sub.paymentStatus === 'Paid' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'completed')
      .reduce((sum, sub) => sum + (sub.amount || 0), 0);
    
    // Calculate revenue based on filter period (subscribed date range)
    let periodRevenue = 0;
    let periodLabel = '';
    
    // Determine the date range for revenue calculation
    let fromDate: Date;
    let toDate: Date;
    
    if (subscribedDateFrom || subscribedDateTo) {
      // If date filters are applied, use them
      fromDate = subscribedDateFrom ? new Date(subscribedDateFrom) : new Date(0);
      fromDate.setHours(0, 0, 0, 0);
      toDate = subscribedDateTo ? new Date(subscribedDateTo) : new Date();
      toDate.setHours(23, 59, 59, 999); // End of day
      
      if (subscribedDateFrom && subscribedDateTo) {
        periodLabel = `Revenue (${new Date(subscribedDateFrom).toLocaleDateString('en-GB')} - ${new Date(subscribedDateTo).toLocaleDateString('en-GB')})`;
      } else if (subscribedDateFrom) {
        periodLabel = `Revenue (From ${new Date(subscribedDateFrom).toLocaleDateString('en-GB')})`;
      } else if (subscribedDateTo) {
        periodLabel = `Revenue (Until ${new Date(subscribedDateTo).toLocaleDateString('en-GB')})`;
      }
    } else {
      // Default to current month (1st to last day)
      fromDate = new Date(currentYear, currentMonth, 1);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(currentYear, currentMonth + 1, 0);
      toDate.setHours(23, 59, 59, 999); // End of day
      periodLabel = `Revenue ${today.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    }
    
    // Calculate period revenue from FILTERED subscriptions that are ACTIVE for the period
    // Check if subscription covers the selected period (startDate <= periodEnd AND (nextDueDate OR endDate) >= periodStart)
    periodRevenue = filtered
      .filter(sub => {
        if (sub.paymentStatus !== 'Paid' && sub.paymentStatus !== 'paid' && sub.paymentStatus !== 'completed') {
          return false;
        }
        
        // Subscription must have started before or during the period
        const startDate = sub.startDate ? new Date(sub.startDate) : null;
        if (!startDate) return false;
        startDate.setHours(0, 0, 0, 0);
        
        // Subscription should start before period ends
        if (startDate > toDate) return false;
        
        // Check if subscription is still active for the period (with 5 day grace period)
        const gracePeriodDays = 5;
        const graceDate = new Date(fromDate);
        graceDate.setDate(graceDate.getDate() - gracePeriodDays);
        
        // Use nextDueDate or endDate to check if subscription covers the period
        const nextDueDate = sub.nextDueDate ? new Date(sub.nextDueDate) : null;
        const endDate = sub.endDate ? new Date(sub.endDate) : null;
        
        const effectiveEndDate = nextDueDate || endDate;
        if (effectiveEndDate) {
          effectiveEndDate.setHours(23, 59, 59, 999);
          // Subscription is valid if its end/due date (+ grace) is within or after the period start
          return effectiveEndDate >= graceDate;
        }
        
        // If no end date, consider it active if it started before period ended
        return true;
      })
      .reduce((sum, sub) => sum + (sub.amount || 0), 0);
    
    const averageAmount = totalSubscriptions > 0 ? filteredRevenue / totalSubscriptions : 0;
    const collectionRate = totalSubscriptions > 0 ? (paidSubscriptions / totalSubscriptions) * 100 : 0;
    
    return {
      totalSubscriptions,
      activeSubscriptions: paidSubscriptions,
      expiredSubscriptions: overdueSubscriptions,
      overdueSubscriptions,
      allTimeRevenue, // All-time revenue from all subscriptions
      filteredRevenue, // Revenue from filtered subscriptions
      paidThisMonth: periodRevenue,
      periodLabel,
      averageAmount: Math.round(averageAmount),
      collectionRate: `${Math.round(collectionRate)}%`
    };
  }, [filteredAndSortedSubscriptions, subscribedDateFrom, subscribedDateTo, subscriptions]);

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

        {/* Enhanced Dynamic Stats Cards */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'green', mb: 1 }}>
            📊 DYNAMIC STATS (Based on Current Filters): Showing {dynamicStats.totalSubscriptions} records
          </Typography>
          {stats && (
            <Typography variant="body2" sx={{ color: 'blue', mb: 2 }}>
              💾 Total Database Records: {stats.overview.totalSubscriptions} | 
              🏷️ Filtered Results: {dynamicStats.totalSubscriptions} | 
              📅 Date Range: {subscribedDateFrom ? new Date(subscribedDateFrom).toLocaleDateString('en-GB') : 'Start'} - {subscribedDateTo ? new Date(subscribedDateTo).toLocaleDateString('en-GB') : 'End'}
            </Typography>
          )}
        </Box>
        
        {/* Dynamic Overview Stats Row 1 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: dynamicStats.totalSubscriptions > 0 ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' : 'inherit' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {filterStatus === 'all' ? 'Total Subscriptions (Filtered)' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Subscriptions`}
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {dynamicStats.totalSubscriptions}
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Active Subscriptions
                  </Typography>
                  <Typography variant="h4" component="h2" color="success.main">
                    {dynamicStats.activeSubscriptions}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Expired/Overdue Subscriptions
                  </Typography>
                  <Typography variant="h4" component="h2" color="error.main">
                    {dynamicStats.expiredSubscriptions}
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
            <Card sx={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  3-Month Revenue Growth
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h4" component="h2" color="primary.main">
                    {(() => {
                      const threeMonthsAgo = new Date();
                      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                      const twoMonthsAgo = new Date();
                      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
                      const lastMonth = new Date();
                      lastMonth.setMonth(lastMonth.getMonth() - 1);
                      const thisMonth = new Date();
                      
                      const filtered = filteredAndSortedSubscriptions.filter(sub => {
                        if (preferredSportFilter !== 'all') {
                          const matchesSport = sub.preferredSport === preferredSportFilter ||
                            (preferredSportFilter === 'Other' && !sub.preferredSport) ||
                            (preferredSportFilter === 'Other' && sub.preferredSport && 
                             !['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events'].includes(sub.preferredSport));
                          if (!matchesSport) return false;
                        }
                        return true;
                      });
                      
                      const getMonthRevenue = (month: Date) => {
                        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
                        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                        return filtered
                          .filter(sub => {
                            const subDate = new Date(sub.createdAt);
                            return subDate >= monthStart && subDate <= monthEnd && sub.paymentStatus === 'Paid';
                          })
                          .reduce((sum, sub) => sum + (sub.amount || 0), 0);
                      };
                      
                      const lastMonthRevenue = getMonthRevenue(lastMonth);
                      const twoMonthsRevenue = getMonthRevenue(twoMonthsAgo);
                      const growthRate = twoMonthsRevenue > 0 ? ((lastMonthRevenue - twoMonthsRevenue) / twoMonthsRevenue * 100) : 0;
                      return (growthRate >= 0 ? '+' : '') + growthRate.toFixed(1) + '%';
                    })()} 
                  </Typography>
                  {(() => {
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    const twoMonthsAgo = new Date();
                    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
                    const lastMonth = new Date();
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    
                    const filtered = filteredAndSortedSubscriptions.filter(sub => {
                      if (preferredSportFilter !== 'all') {
                        const matchesSport = sub.preferredSport === preferredSportFilter ||
                          (preferredSportFilter === 'Other' && !sub.preferredSport) ||
                          (preferredSportFilter === 'Other' && sub.preferredSport && 
                           !['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events'].includes(sub.preferredSport));
                        if (!matchesSport) return false;
                      }
                      return true;
                    });
                    
                    const getMonthRevenue = (month: Date) => {
                      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
                      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                      return filtered
                        .filter(sub => {
                          const subDate = new Date(sub.createdAt);
                          return subDate >= monthStart && subDate <= monthEnd && sub.paymentStatus === 'Paid';
                        })
                        .reduce((sum, sub) => sum + (sub.amount || 0), 0);
                    };
                    
                    const lastMonthRevenue = getMonthRevenue(lastMonth);
                    const twoMonthsRevenue = getMonthRevenue(twoMonthsAgo);
                    const growthRate = twoMonthsRevenue > 0 ? ((lastMonthRevenue - twoMonthsRevenue) / twoMonthsRevenue * 100) : 0;
                    return growthRate >= 0 ? 
                      <TrendingUp color="success" sx={{ fontSize: 30 }} /> : 
                      <TrendingDown color="error" sx={{ fontSize: 30 }} />;
                  })()} 
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {preferredSportFilter === 'all' ? 'All Sports' : preferredSportFilter} vs Previous Month
                </Typography>
                
                {/* Simple bar chart representation */}
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'end', gap: 0.5, height: 40 }}>
                  {(() => {
                    const months = ['3mo ago', '2mo ago', 'Last mo'];
                    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    const twoMonthsAgo = new Date(); twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
                    const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);
                    
                    const filtered = filteredAndSortedSubscriptions.filter(sub => {
                      if (preferredSportFilter !== 'all') {
                        const matchesSport = sub.preferredSport === preferredSportFilter ||
                          (preferredSportFilter === 'Other' && !sub.preferredSport) ||
                          (preferredSportFilter === 'Other' && sub.preferredSport && 
                           !['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events'].includes(sub.preferredSport));
                        if (!matchesSport) return false;
                      }
                      return true;
                    });
                    
                    const getMonthRevenue = (month: Date) => {
                      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
                      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                      return filtered
                        .filter(sub => {
                          const subDate = new Date(sub.createdAt);
                          return subDate >= monthStart && subDate <= monthEnd && sub.paymentStatus === 'Paid';
                        })
                        .reduce((sum, sub) => sum + (sub.amount || 0), 0);
                    };
                    
                    const revenues = [
                      getMonthRevenue(threeMonthsAgo),
                      getMonthRevenue(twoMonthsAgo), 
                      getMonthRevenue(lastMonth)
                    ];
                    const maxRevenue = Math.max(...revenues, 1);
                    
                    return revenues.map((revenue, index) => {
                      const height = (revenue / maxRevenue) * 30 + 5;
                      return (
                        <Tooltip key={index} title={`${months[index]}: ${formatCurrency(revenue)}`}>
                          <Box
                            sx={{
                              width: 20,
                              height: `${height}px`,
                              backgroundColor: index === 2 ? 'primary.main' : 'primary.light',
                              borderRadius: 1,
                              cursor: 'pointer'
                            }}
                          />
                        </Tooltip>
                      );
                    });
                  })()} 
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Revenue Stats Row 2 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Revenue (All Time)
                  </Typography>
                  <Typography variant="h5" component="h2" color="primary.main">
                    {formatCurrency(stats?.overview.totalRevenue || dynamicStats.allTimeRevenue)}
                  </Typography>
                </Box>
                <AttachMoney color="primary" sx={{ fontSize: 40 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {dynamicStats.periodLabel}
                  </Typography>
                  <Typography variant="h5" component="h2" color="success.main">
                    {formatCurrency(dynamicStats.paidThisMonth)}
                  </Typography>
                </Box>
                <Receipt color="success" sx={{ fontSize: 40 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Average Amount (Filtered)
                  </Typography>
                  <Typography variant="h5" component="h2">
                    {formatCurrency(dynamicStats.averageAmount)}
                  </Typography>
                </Box>
                <TrendingUp color="info" sx={{ fontSize: 40 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Sport Revenue Insights
                </Typography>
                {(() => {
                  const sportRevenues: Record<string, number> = {};
                  const sports = ['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events'];
                  
                  sports.forEach(sport => {
                    sportRevenues[sport] = filteredAndSortedSubscriptions
                      .filter(sub => sub.preferredSport === sport && sub.paymentStatus === 'Paid')
                      .reduce((sum, sub) => sum + (sub.amount || 0), 0);
                  });
                  
                  const otherRevenue = filteredAndSortedSubscriptions
                    .filter(sub => !sports.includes(sub.preferredSport) && sub.paymentStatus === 'Paid')
                    .reduce((sum, sub) => sum + (sub.amount || 0), 0);
                  
                  if (otherRevenue > 0) sportRevenues['Other'] = otherRevenue;
                  
                  const topSport = Object.entries(sportRevenues)
                    .sort(([,a], [,b]) => (b as number) - (a as number))[0];
                  
                  if (!topSport) return (
                    <Box>
                      <Typography variant="h6" component="h2">
                        No Data
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        No revenue data available
                      </Typography>
                    </Box>
                  );
                  
                  return (
                    <Box>
                      <Typography variant="h6" component="h2" color="secondary.main">
                        {topSport[0]}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Top Revenue: {formatCurrency(topSport[1])}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {Object.entries(sportRevenues).slice(0, 3).map(([sport, revenue], index) => {
                          const percentage = topSport[1] > 0 ? ((revenue / topSport[1]) * 100) : 0;
                          return (
                            <Box key={sport} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Box
                                sx={{
                                  width: `${Math.max(percentage, 5)}%`,
                                  height: 4,
                                  backgroundColor: index === 0 ? 'secondary.main' : index === 1 ? 'secondary.light' : 'grey.400',
                                  borderRadius: 1
                                }}
                              />
                              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                                {sport}: {formatCurrency(revenue)}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
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
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sport Filter</InputLabel>
            <Select
              value={preferredSportFilter}
              label="Sport Filter"
              onChange={(e) => setPreferredSportFilter(e.target.value)}
            >
              <MenuItem value="all">All Sports</MenuItem>
              <MenuItem value="Cricket">Cricket</MenuItem>
              <MenuItem value="Football">Football</MenuItem>
              <MenuItem value="Shuttle Badminton">Shuttle Badminton</MenuItem>
              <MenuItem value="Functions and Events">Functions and Events</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Subscribed Date From"
            type="date"
            size="small"
            value={subscribedDateFrom}
            onChange={(e) => setSubscribedDateFrom(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ minWidth: 160 }}
          />
          
          <TextField
            label="Subscribed Date To"
            type="date"
            size="small"
            value={subscribedDateTo}
            onChange={(e) => setSubscribedDateTo(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ minWidth: 160 }}
          />
          
          <TextField
            label="Due Date From"
            type="date"
            size="small"
            value={dueDateFrom}
            onChange={(e) => setDueDateFrom(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ minWidth: 160 }}
          />
          
          <TextField
            label="Due Date To"
            type="date"
            size="small"
            value={dueDateTo}
            onChange={(e) => setDueDateTo(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ minWidth: 160 }}
          />

          {(subscribedDateFrom || subscribedDateTo || dueDateFrom || dueDateTo) && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const currentMonth = getCurrentMonthDates();
                setSubscribedDateFrom(currentMonth.from);
                setSubscribedDateTo(currentMonth.to);
                setDueDateFrom('');
                setDueDateTo('');
              }}
              sx={{ minHeight: 40 }}
            >
              Reset to Current Month
            </Button>
          )}
          
          {(filterStatus !== 'all' || preferredSportFilter !== 'all' || searchTerm) && (
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={() => {
                setFilterStatus('all');
                setPreferredSportFilter('all');
                setSearchTerm('');
              }}
              sx={{ minHeight: 40 }}
            >
              Clear Filters
            </Button>
          )}
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
                <SortableHeader column="startDate">Subscribed Date</SortableHeader>
                <SortableHeader column="endDate">Next Due Date</SortableHeader>
                <TableCell>Auto Renewal</TableCell>
                <TableCell>Comment</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSubscriptions.map((subscription) => (
                <TableRow key={subscription._id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {subscription.userId?.name || 'Unknown User'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {subscription.userId?.champId || 'N/A'}
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
                    {formatSafeDate(subscription.startDate)}
                  </TableCell>
                  <TableCell>
                    {formatSafeDate(subscription.nextDueDate)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={subscription.autoRenewal ? 'Yes' : 'No'} 
                      color={subscription.autoRenewal ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, wordWrap: 'break-word' }}>
                      {subscription.notes || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
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
                      
                      <Tooltip title="Renew Subscription (Creates New Record)">
                        <IconButton 
                          size="small" 
                          color="success"
                          onClick={() => openRenewDialog(subscription)}
                          disabled={subscription.paymentStatus !== 'Paid'}
                        >
                          <Refresh />
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
                    </Box>
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
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Comment"
                      multiline
                      rows={3}
                      value={selectedSubscription.notes || ''}
                      onChange={(e) => setSelectedSubscription({
                        ...selectedSubscription,
                        notes: e.target.value
                      })}
                      placeholder="Add any comments or notes about this subscription..."
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Mode</InputLabel>
                      <Select
                        value={selectedSubscription.mode || ''}
                        label="Mode"
                        onChange={(e) => setSelectedSubscription({
                          ...selectedSubscription,
                          mode: e.target.value
                        })}
                      >
                        <MenuItem value="">Select Mode</MenuItem>
                        <MenuItem value="fixed">Fixed</MenuItem>
                        <MenuItem value="flexible">Flexible</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Subscription Status</InputLabel>
                      <Select
                        value={selectedSubscription.status || 'active'}
                        label="Subscription Status"
                        onChange={(e) => setSelectedSubscription({
                          ...selectedSubscription,
                          status: e.target.value
                        })}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="expired">Expired</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Selected Court</InputLabel>
                      <Select
                        value={selectedSubscription.selectedCourt || ''}
                        label="Selected Court"
                        onChange={(e) => setSelectedSubscription({
                          ...selectedSubscription,
                          selectedCourt: e.target.value
                        })}
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="S1">S1</MenuItem>
                        <MenuItem value="S2">S2</MenuItem>
                        <MenuItem value="S3">S3</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Amount (₹)"
                      type="number"
                      value={selectedSubscription.amount || ''}
                      onChange={(e) => setSelectedSubscription({
                        ...selectedSubscription,
                        amount: e.target.value ? parseFloat(e.target.value) : 0
                      })}
                      InputProps={{
                        inputProps: { min: 0, step: 0.01 }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Subscribed Date"
                      type="date"
                      value={selectedSubscription.startDate ? selectedSubscription.startDate.split('T')[0] : ''}
                      onChange={(e) => setSelectedSubscription({
                        ...selectedSubscription,
                        startDate: e.target.value
                      })}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Next Due Date"
                      type="date"
                      value={selectedSubscription.nextDueDate ? selectedSubscription.nextDueDate.split('T')[0] : ''}
                      onChange={(e) => setSelectedSubscription({
                        ...selectedSubscription,
                        nextDueDate: e.target.value
                      })}
                      InputLabelProps={{
                        shrink: true,
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

        {/* Renew Subscription Dialog */}
        <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Renew Subscription - {selectedSubscription?.userName}</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              This will create a new subscription record for the next period, preserving historical data for accurate revenue tracking.
            </Alert>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={renewalData.amount}
                  onChange={(e) => setRenewalData({
                    ...renewalData,
                    amount: Number(e.target.value)
                  })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={renewalData.paymentStatus}
                    label="Payment Status"
                    onChange={(e) => setRenewalData({
                      ...renewalData,
                      paymentStatus: e.target.value
                    })}
                  >
                    <MenuItem value="Paid">Paid</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={renewalData.startDate}
                  onChange={(e) => setRenewalData({
                    ...renewalData,
                    startDate: e.target.value
                  })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={renewalData.endDate}
                  onChange={(e) => setRenewalData({
                    ...renewalData,
                    endDate: e.target.value
                  })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method (Optional)</InputLabel>
                  <Select
                    value={renewalData.paymentMethod}
                    label="Payment Method (Optional)"
                    onChange={(e) => setRenewalData({
                      ...renewalData,
                      paymentMethod: e.target.value
                    })}
                  >
                    <MenuItem value=""><em>Not Specified</em></MenuItem>
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
                  label="Transaction ID (Optional)"
                  value={renewalData.transactionId}
                  onChange={(e) => setRenewalData({
                    ...renewalData,
                    transactionId: e.target.value
                  })}
                />
              </Grid>
              
              {selectedSubscription?.preferredSport === 'Shuttle Badminton' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Selected Court</InputLabel>
                    <Select
                      value={renewalData.selectedCourt}
                      label="Selected Court"
                      onChange={(e) => setRenewalData({
                        ...renewalData,
                        selectedCourt: e.target.value
                      })}
                    >
                      <MenuItem value="S1">S1</MenuItem>
                      <MenuItem value="S2">S2</MenuItem>
                      <MenuItem value="S3">S3</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleRenewSubscription} color="success">
              Create Renewal
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default AdminSubscriptionsPage;