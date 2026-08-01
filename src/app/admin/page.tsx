"use client";
import React, { useState, useEffect, useCallback, memo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  InputAdornment,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  IconButton,
  Tooltip,
} from "@mui/material";
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, addDays } from "date-fns";
import {
  Dashboard,
  Edit,
  Delete,
  Refresh,
  CheckCircle,
  Check,
  Add,
  ArrowUpward,
  ArrowDownward,
  Search,
  FilterList,
  Block,
} from "@mui/icons-material";

// Utility function for safe date formatting
const formatSafeDate = (dateString: string | undefined | null, formatPattern: string = 'dd/MM/yyyy'): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return format(date, formatPattern);
};

// Format date for <input type="date"> using local timezone (avoids UTC day shift)
const formatDateForInput = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM-dd');
};

// Time slots constant to match registration page format
const TIME_SLOTS = [
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM",
  "08:00 PM - 09:00 PM",
  "09:00 PM - 10:00 PM",
];

const CRICKET_FULL_DAY_TIME_SLOTS = Array.from({ length: 48 }, (_, index) => {
  const startMinutes = index * 30;
  const endMinutes = ((index + 1) * 30) % (24 * 60);

  const to24HourLabel = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  return `${to24HourLabel(startMinutes)} - ${to24HourLabel(endMinutes)}`;
});

const CRICKET_DEFAULT_SLOT = CRICKET_FULL_DAY_TIME_SLOTS[0];

const normalizeBookedTimeSlots = (booking: Booking): string[] => {
  const rawTimeSlots = (booking as unknown as { timeSlots?: string[] | string }).timeSlots;
  const rawTimeSlot = (booking as unknown as { timeSlot?: string }).timeSlot;

  const directSlots = Array.isArray(rawTimeSlots)
    ? rawTimeSlots
    : typeof rawTimeSlots === 'string'
      ? rawTimeSlots.split(',')
      : [];

  const legacySlots = typeof rawTimeSlot === 'string'
    ? rawTimeSlot.split(',')
    : [];

  const combined = [...directSlots, ...legacySlots]
    .flatMap(slot => slot.split(','))
    .map(slot => slot.trim())
    .filter(Boolean);

  return Array.from(new Set(combined));
};

// Memoized pricing calculation function with time-based logic for females
const calculateSubscriptionAmount = (
  champType: string,
  subscriptionType: string,
  gender: string,
  preferredTimeSlot: string
): number => {
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

interface Booking {
  _id: string;
  userId?: string;
  sport: string;
  court?: string;
  date: string;
  timeSlots: string[];
  timeSlot?: string; // Single time slot for backward compatibility
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentStatus: string;
  bookingStatus: string;
  createdAt: string;
  receivedBy?: string;
  paymentMethod?: string;
  notes?: string;
  updatedAt?: string;
  nextDayDate?: string;
  nextDayTimeSlots?: string[];
  cancellationReason?: string;
  cancellationDate?: string;
  refundAmount?: number;
  refundStatus?: string;
}

interface User {
  _id: string;
  champId?: string;
  name: string;
  email: string;
  phone: string;
  mobile: string;
  gender?: string;
  champType?: string;
  subscribed?: string;
  preferredSport: string;
  preferredTimeSlot?: string;
  selectedCourt?: string;
  subscriptionType: string;
  paymentStatus: string;
  verifiedAt?: string;
  createdAt: string;
  comments?: string;
  mode?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  // Enhanced payment tracking fields
  paymentCompletedDate?: string;
  nextDueDate?: string;
  billingCycleLength?: number;
  paymentMethod?: string;
  transactionId?: string;
  overdueDays?: number;
  gracePeriodDays?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionAmount?: number;
}

interface Stats {
  totalBookings: number;
  todaysBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const isAdmin = session?.user?.role === "admin";
  const attendanceTabIndex = isAdmin ? 5 : 1;
  
  const [tabValue, setTabValue] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    todaysBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // Sorting state for user table
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  });
  
  // Edit User Dialog states
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Booking edit state
  const [bookingEditOpen, setBookingEditOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: '',
    sport: '',
    court: '',
    date: '',
    timeSlots: [] as string[],
    bookingStatus: '',
    paymentStatus: '',
    totalAmount: 0,
    receivedBy: '',
    paymentMethod: '',
    notes: '',
    cancellationReason: '',
    isCancelling: false
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  // User filtering states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [champTypeFilter, setChampTypeFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [preferredSportFilter, setPreferredSportFilter] = useState('all');
  
  // Booking date filter states for alerts
  const [bookingStartDateFilter, setBookingStartDateFilter] = useState('');
  const [bookingEndDateFilter, setBookingEndDateFilter] = useState('');
  const [showBookingAlerts, setShowBookingAlerts] = useState(false);
  const [bookingDateFilter, setBookingDateFilter] = useState<'today' | 'tomorrow' | 'all'>('today');
  
  // User pagination states
  const [userPage, setUserPage] = useState(0);
  const [userRowsPerPage, setUserRowsPerPage] = useState(10);
  
  const [editUserFormData, setEditUserFormData] = useState({
    champId: '',
    name: '',
    email: '',
    mobile: '',
    gender: '',
    champType: '',
    subscribed: '',
    preferredSport: '',
    preferredTimeSlot: '',
    selectedCourt: '',
    subscriptionType: '',
    paymentStatus: '',
    comments: '',
    mode: '',
    height: '',
    weight: '',
    bmi: '',
    // Enhanced payment fields
    billingCycleLength: 1,
    subscriptionAmount: 0,
    paymentMethod: '',
    transactionId: '',
    gracePeriodDays: 5,
    nextDueDate: ''
  });

  // ChampID validation states
  const [champIdValidation, setChampIdValidation] = useState<{
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isValid: null,
    message: ''
  });

  // Slot details dialog state
  const [slotDetailsDialog, setSlotDetailsDialog] = useState<{
    open: boolean;
    courtId: string;
    timeSlot: string;
    registeredUsers: User[];
    hourlyBookings: Booking[];
  }>({
    open: false,
    courtId: '',
    timeSlot: '',
    registeredUsers: [],
    hourlyBookings: []
  });

  // Delete User Dialog states
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);

  // Authentication check
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin");
      return;
    }
    
    if (session.user?.role !== "admin") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Sorting functions for user table
  const handleSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Optimized filtering and sorting with useMemo
  const filteredUsers = React.useMemo(() => {
    // First, filter the users
    let filtered = users.filter(user => {
      const matchesSearch = userSearchTerm === '' || 
        user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.champId?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.mobile?.includes(userSearchTerm) ||
        user.phone?.includes(userSearchTerm);
        
      const matchesChampType = champTypeFilter === 'all' || user.champType === champTypeFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'all' || user.paymentStatus === paymentStatusFilter;
      const matchesSport = preferredSportFilter === 'all' || 
        user.preferredSport === preferredSportFilter ||
        (preferredSportFilter === 'Other' && !user.preferredSport) ||
        (preferredSportFilter === 'Other' && user.preferredSport && 
         !['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events', 'Body Zorb'].includes(user.preferredSport));
      
      return matchesSearch && matchesChampType && matchesPaymentStatus && matchesSport;
    });

    // Then, sort the filtered users
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

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

    return filtered;
  }, [users, userSearchTerm, champTypeFilter, paymentStatusFilter, preferredSportFilter, sortConfig]);
  
  // Apply pagination to filtered users with useMemo
  const paginatedUsers = React.useMemo(() => {
    return filteredUsers.slice(
      userPage * userRowsPerPage,
      userPage * userRowsPerPage + userRowsPerPage
    );
  }, [filteredUsers, userPage, userRowsPerPage]);

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

  // Optimized fetch data function with useCallback
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch bookings and users concurrently for better performance with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const [bookingsRes, usersRes] = await Promise.all([
        fetch('/api/admin/bookings?limit=1000', { signal: controller.signal }),
        fetch('/api/admin/users?limit=1000', { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);

      const bookingsData = await bookingsRes.json();
      const usersData = await usersRes.json();

      if (bookingsData.success) {
        // Sort bookings by date in chronological order (oldest first)
        const sortedBookings = [...bookingsData.bookings].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB; // Ascending order (oldest first)
        });
        setBookings(sortedBookings);
      }

      if (usersData.success) {
        setUsers(usersData.users);
      }

      // Filter bookings by subscription validity
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
      
      // Create a map of user IDs to user objects for quick lookup
      const userMap = new Map((usersData.users || []).map((user: User) => [user._id, user]));
      
      // Filter bookings to only include those with valid subscriptions
      const validBookings = (bookingsData.bookings || []).filter((booking: Booking) => {
        // If booking has no userId, include it (guest bookings or legacy data)
        if (!booking.userId) return true;
        
        const user = userMap.get(booking.userId) as User | undefined;
        if (!user) return true; // Include if user not found
        
        // Check if user has active subscription
        if (!user.subscriptionStartDate || !user.subscriptionEndDate) {
          return false; // No subscription dates, exclude
        }
        
        const bookingDate = new Date(booking.date);
        const subscriptionStart = new Date(user.subscriptionStartDate);
        const subscriptionEnd = new Date(user.subscriptionEndDate);
        const nextDueDate = user.nextDueDate ? new Date(user.nextDueDate) : null;
        
        // Booking must be within subscription period
        if (bookingDate < subscriptionStart || bookingDate > subscriptionEnd) {
          return false;
        }
        
        // Subscription must not be expired (nextDueDate > today)
        if (nextDueDate && nextDueDate <= today) {
          return false; // Subscription is overdue/expired
        }
        
        return true; // Valid subscription
      });

      // Calculate stats efficiently using filtered bookings
      const todaysBookings = validBookings.filter(
        (booking: Booking) => new Date(booking.date).toDateString() === today.toDateString()
      ).length;

      const totalRevenue = validBookings.filter(
        (booking: Booking) => booking.paymentStatus === 'paid'
      ).reduce((sum: number, booking: Booking) => sum + booking.totalAmount, 0) || 0;

      // Calculate monthly revenue for current month
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      const monthlyRevenue = validBookings.filter(
        (booking: Booking) => {
          if (booking.paymentStatus !== 'paid') return false;
          const bookingDate = new Date(booking.date);
          return isWithinInterval(bookingDate, { start: monthStart, end: monthEnd });
        }
      ).reduce((sum: number, booking: Booking) => sum + booking.totalAmount, 0) || 0;

      // Console logging for debugging
      console.log('📊 Slot Stats Debug:', {
        totalAllBookings: bookingsData.bookings?.length || 0,
        validBookings: validBookings.length,
        todaysBookings,
        totalRevenue,
        monthlyRevenue,
        filterDetails: {
          todayDate: today.toISOString().split('T')[0],
          validSubscriptions: (usersData.users || []).filter((u: User) => {
            const nextDue = u.nextDueDate ? new Date(u.nextDueDate) : null;
            return nextDue && nextDue > today;
          }).length
        }
      });

      setStats({
        totalBookings: validBookings.length,
        todaysBookings,
        totalRevenue,
        monthlyRevenue,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchData();
    }
  }, [session]);

  // Reset user page when filters change to avoid pagination errors
  useEffect(() => {
    setUserPage(0);
  }, [userSearchTerm, champTypeFilter, paymentStatusFilter, preferredSportFilter]);

  // Auto-calculate subscription amount based on time-based pricing
  useEffect(() => {
    if (editUserFormData.champType && editUserFormData.subscriptionType && editUserFormData.gender) {
      const calculatedAmount = calculateSubscriptionAmount(
        editUserFormData.champType,
        editUserFormData.subscriptionType,
        editUserFormData.gender,
        editUserFormData.preferredTimeSlot
      );
      
      setEditUserFormData(prev => ({
        ...prev,
        subscriptionAmount: calculatedAmount
      }));
    }
  }, [editUserFormData.champType, editUserFormData.subscriptionType, editUserFormData.gender, editUserFormData.preferredTimeSlot]);

  const handleEditUser = (user: User) => {
    console.log('Opening edit dialog for user:', user);
    console.log('Available TIME_SLOTS:', TIME_SLOTS);
    
    setSelectedUser(user);
    setEditUserFormData({
      champId: user.champId || '',
      name: user.name || '',
      email: user.email || '',
      mobile: user.phone || user.mobile || '',
      gender: user.gender || '',
      champType: user.champType || 'adult', // Default to adult for existing users
      subscribed: user.subscribed || 'no', // Default to no for existing users
      preferredSport: user.preferredSport || '',
      preferredTimeSlot: user.preferredTimeSlot || '',
      selectedCourt: user.selectedCourt || '',
      subscriptionType: user.subscriptionType || '',
      paymentStatus: user.paymentStatus || 'pending',
      comments: user.comments || '',
      mode: user.mode || '',
      height: user.height ? user.height.toString() : '',
      weight: user.weight ? user.weight.toString() : '',
      bmi: user.bmi ? user.bmi.toString() : '',
      // Enhanced payment fields
      billingCycleLength: user.billingCycleLength || 1,
      subscriptionAmount: user.subscriptionAmount || 0,
      paymentMethod: user.paymentMethod || '',
      transactionId: user.transactionId || '',
      gracePeriodDays: user.gracePeriodDays || 5,
      nextDueDate: user.nextDueDate || ''
    });
    
    // Reset ChampID validation to valid if user already has a ChampID
    if (user.champId) {
      setChampIdValidation({ 
        isChecking: false, 
        isValid: true, 
        message: 'Current ChampID' 
      });
    } else {
      setChampIdValidation({ 
        isChecking: false, 
        isValid: null, 
        message: '' 
      });
    }
    
    setEditUserDialogOpen(true);
  };

    const handleUserUpdate = async () => {
    if (!selectedUser) return;

    console.log('Starting user update...');
    console.log('Edit user form data:', editUserFormData);
    console.log('ChampID validation:', champIdValidation);

    try {
      // Validate ChampID is required
      if (!editUserFormData.champId || editUserFormData.champId.trim() === '') {
        console.log('ChampID is required');
        setAlert({ 
          type: "error", 
          message: "ChampID is required for all users" 
        });
        setTimeout(() => setAlert(null), 5000);
        return;
      }

      // Validate ChampID if changed
      if (editUserFormData.champId !== (selectedUser.champId || '') && 
          champIdValidation.isValid !== true) {
        console.log('ChampID validation failed');
        setAlert({ 
          type: "error", 
          message: "Please provide a valid and available ChampID before saving" 
        });
        setTimeout(() => setAlert(null), 5000);
        return;
      }

      // Check for duplicate court bookings if this is a badminton user
      if (editUserFormData.preferredSport === 'Shuttle Badminton' && 
          editUserFormData.preferredTimeSlot && 
          editUserFormData.selectedCourt) {
        
        console.log('Checking court availability for badminton user...');
        
        // Check if there are already 6 users with same court, time slot and sport
        const availabilityResponse = await fetch('/api/check-court-availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeSlot: editUserFormData.preferredTimeSlot,
            requestedCourt: editUserFormData.selectedCourt,
            sport: 'Shuttle Badminton',
            excludeUserId: selectedUser._id // Exclude current user from count
          }),
        });

        const availabilityData = await availabilityResponse.json();
        console.log('Court availability check result:', availabilityData);

        if (!availabilityData.canBook) {
          setAlert({ 
            type: 'error', 
            message: `Court ${editUserFormData.selectedCourt} is fully booked for ${editUserFormData.preferredTimeSlot}. Maximum 6 slots per court. Please choose a different time slot or court.` 
          });
          setTimeout(() => setAlert(null), 5000);
          return;
        }
      }

      // Check for subscription creation when setting subscribed to Yes
      if (editUserFormData.subscribed === 'Yes' && selectedUser.subscribed !== 'Yes') {
        console.log('🔔 User subscription status changing to Yes - this should trigger subscription entry creation');
        console.log('🔍 Subscription details:', {
          subscriptionType: editUserFormData.subscriptionType,
          paymentStatus: editUserFormData.paymentStatus,
          champType: editUserFormData.champType,
          amount: editUserFormData.subscriptionAmount
        });
      }

      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          champId: editUserFormData.champId || undefined, // Only include if not empty
          name: editUserFormData.name,
          email: editUserFormData.email,
          mobile: editUserFormData.mobile,
          phone: editUserFormData.mobile,
          gender: editUserFormData.gender,
          champType: editUserFormData.champType,
          subscribed: editUserFormData.subscribed,
          preferredSport: editUserFormData.preferredSport,
          preferredTimeSlot: editUserFormData.preferredTimeSlot,
          selectedCourt: editUserFormData.selectedCourt,
          subscriptionType: editUserFormData.subscriptionType,
          paymentStatus: editUserFormData.paymentStatus,
          height: editUserFormData.height ? parseFloat(editUserFormData.height) : undefined,
          weight: editUserFormData.weight ? parseFloat(editUserFormData.weight) : undefined,
          bmi: editUserFormData.bmi ? parseFloat(editUserFormData.bmi) : undefined,
          // Enhanced payment fields
          billingCycleLength: editUserFormData.billingCycleLength,
          subscriptionAmount: editUserFormData.subscriptionAmount,
          // Only include paymentMethod if it has a value and is not empty string
          ...(editUserFormData.paymentMethod && editUserFormData.paymentMethod !== '' && { paymentMethod: editUserFormData.paymentMethod }),
          // Only include transactionId if it has a value and is not empty string
          ...(editUserFormData.transactionId && editUserFormData.transactionId !== '' && { transactionId: editUserFormData.transactionId }),
          gracePeriodDays: editUserFormData.gracePeriodDays,
          // Include nextDueDate if provided
          ...(editUserFormData.nextDueDate && editUserFormData.nextDueDate !== '' && { nextDueDate: editUserFormData.nextDueDate }),
        }),
      });

      console.log('Update response status:', response.status);
      const data = await response.json();
      console.log('Update response data:', data);

      if (data.success) {
        console.log('✅ User update successful');
        
        // Check if subscription was created
        if (data.subscriptionCreated) {
          console.log('🎉 Subscription entry was created for user. Staying on user page.');
          setAlert({ 
            type: 'success', 
            message: 'User updated and subscription created!' 
          });
          // Refresh the users list from server to get the latest data
          await fetchData();
          setEditUserDialogOpen(false);
          setSelectedUser(null);
          return;
        }
        // Refresh the users list from server to get the latest data
        await fetchData();
        setAlert({ 
          type: 'success', 
          message: 'User updated successfully!' 
        });
        setEditUserDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error(data.message || 'Failed to update user');
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to update user' 
      });
    }
    
    setTimeout(() => setAlert(null), 3000);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteUserDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.filter(u => u._id !== selectedUser._id));
        setAlert({ type: 'success', message: 'User deleted successfully!' });
        setDeleteUserDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error(data.message || 'Failed to delete user');
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to delete user' 
      });
    }

    setTimeout(() => setAlert(null), 3000);
  };

  // Handle slot click to show booking details
  const handleSlotClick = (courtId: string, timeSlot: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    
    // Get registered users ONLY if they have PAID and ACTIVE subscription for current month
    const registeredUsers = users.filter(user => 
      user.selectedCourt === courtId && 
      user.preferredTimeSlot === timeSlot &&
      user.preferredSport === 'Shuttle Badminton' &&
      user.paymentStatus === 'completed' && // Must have paid
      user.subscriptionStartDate && // Must have subscription
      user.subscriptionEndDate &&
      user.nextDueDate &&
      new Date(user.nextDueDate) > today && // Subscription must be active (not overdue)
      new Date(user.subscriptionStartDate) <= today && // Subscription must have started
      new Date(user.subscriptionEndDate) >= today // Subscription must not have ended
    );

    // Get hourly bookings for this slot and court for today
    const todayString = today.toDateString();
    const hourlyBookings = bookings.filter(booking => 
      booking.court === courtId &&
      booking.sport === 'Shuttle Badminton' &&
      new Date(booking.date).toDateString() === todayString &&
      booking.timeSlots.some(bookingSlot => {
        // Normalize time slot format for comparison
        const normalizeSlot = (s: string) => s.replace(/\s+/g, ' ').trim();
        return normalizeSlot(bookingSlot) === normalizeSlot(timeSlot);
      }) &&
      ['confirmed', 'pending'].includes(booking.bookingStatus) &&
      booking.paymentStatus !== 'expired'
    );

    setSlotDetailsDialog({
      open: true,
      courtId,
      timeSlot,
      registeredUsers,
      hourlyBookings
    });
  };

  // ChampID validation function
  const validateChampId = async (champId: string, currentUserId?: string) => {
    if (!champId) {
      setChampIdValidation({ isChecking: false, isValid: null, message: '' });
      return;
    }

    // Validate ChampID pattern (S + 5 digits starting from 25911)
    const champIdPattern = /^S\d{5,}$/;
    if (!champIdPattern.test(champId)) {
      setChampIdValidation({ 
        isChecking: false, 
        isValid: false, 
        message: 'ChampID must be in format S##### (e.g., S25911)' 
      });
      return;
    }

    const numberPart = parseInt(champId.substring(1));
    if (numberPart < 25911) {
      setChampIdValidation({ 
        isChecking: false, 
        isValid: false, 
        message: 'ChampID number must be 25911 or higher' 
      });
      return;
    }

    setChampIdValidation({ isChecking: true, isValid: null, message: 'Checking availability...' });

    try {
      const response = await fetch(`/api/admin/check-champid?champId=${encodeURIComponent(champId)}&currentUserId=${currentUserId || ''}`);
      const data = await response.json();

      if (response.ok) {
        setChampIdValidation({
          isChecking: false,
          isValid: data.available,
          message: data.available ? 'ChampID is available' : 'ChampID is already taken'
        });
      } else {
        throw new Error(data.message || 'Failed to check ChampID availability');
      }
    } catch (error) {
      console.error('Error validating ChampID:', error);
      setChampIdValidation({
        isChecking: false,
        isValid: false,
        message: 'Error checking ChampID availability'
      });
    }
  };

  // Payment management functions
  const updateOverdueStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/overdue-status', {
        method: 'POST',
      });
      
      if (response.ok) {
        setAlert({ type: 'success', message: 'Overdue status updated successfully!' });
        await fetchData(); // Refresh the data
      } else {
        throw new Error('Failed to update overdue status');
      }
    } catch (error) {
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update overdue status' 
      });
    } finally {
      setLoading(false);
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const registerUser = async (userId: string, subscriptionData: {
    subscriptionType: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
    cycleLength?: number;
    amount: number;
  }) => {
    try {
      const response = await fetch('/api/admin/payment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...subscriptionData }),
      });
      
      if (response.ok) {
        setAlert({ type: 'success', message: 'User registered successfully!' });
        await fetchData(); // Refresh the data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register user');
      }
    } catch (error) {
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to register user' 
      });
    }
    setTimeout(() => setAlert(null), 3000);
  };

  const markPaymentCompleted = async (userId: string, paymentData: {
    amount: number;
    method: string;
    transactionId?: string;
  }) => {
    try {
      // Use the user update endpoint instead of payment-status endpoint
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentStatus: 'completed',
          paymentMethod: paymentData.method,
          transactionId: paymentData.transactionId || `TXN${Date.now()}`,
          // The user update endpoint will automatically set subscription dates
        }),
      });
      
      if (response.ok) {
        setAlert({ type: 'success', message: 'Payment marked as completed and subscription activated!' });
        await fetchData(); // Refresh the data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete payment');
      }
    } catch (error) {
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to complete payment' 
      });
    }
    setTimeout(() => setAlert(null), 3000);
  };

  const handleMarkComplete = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingStatus: 'completed',
          paymentStatus: 'paid',
          updatedAt: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: "success", message: "Booking marked as complete" });
        fetchData(); // Refresh the data
      } else {
        throw new Error(data.message || 'Failed to mark booking complete');
      }
    } catch (error) {
      console.error('Error marking booking complete:', error);
      setAlert({ 
        type: "error", 
        message: error instanceof Error ? error.message : 'Failed to mark booking complete' 
      });
    }
    setTimeout(() => setAlert(null), 3000);
  };

  // Booking management handlers
  const handleEditBooking = (booking: Booking) => {
    const isCricket = booking.sport === 'Cricket';
    const bookedTimeSlots = normalizeBookedTimeSlots(booking);
    const normalizedTimeSlots = bookedTimeSlots.length > 0
      ? bookedTimeSlots
      : (isCricket ? [CRICKET_DEFAULT_SLOT] : []);

    setEditingBooking(booking);
    setEditForm({
      customerName: booking.customerName || '',
      sport: booking.sport || '',
      court: booking.sport === 'Shuttle Badminton' ? (booking.court || '') : '',
      date: formatDateForInput(booking.date),
      timeSlots: normalizedTimeSlots,
      bookingStatus: booking.bookingStatus || '',
      paymentStatus: booking.paymentStatus === 'completed' ? 'paid' : (booking.paymentStatus || ''),
      totalAmount: booking.totalAmount || 0,
      receivedBy: booking.receivedBy || '',
      paymentMethod: booking.paymentMethod || '',
      notes: booking.notes || '',
      cancellationReason: '',
      isCancelling: false
    });
    setBookingEditOpen(true);
  };

  const handleSaveBooking = async () => {
    if (!editingBooking) return;

    try {
      const normalizedSport = editForm.sport || editingBooking.sport;
      const normalizedTimeSlots = editForm.timeSlots.length > 0
        ? editForm.timeSlots
        : (normalizedSport === 'Cricket' ? [CRICKET_DEFAULT_SLOT] : []);

      const normalizedPaymentStatus = editForm.paymentStatus || editingBooking.paymentStatus || 'pending';
      const normalizedBookingStatus = editForm.bookingStatus || editingBooking.bookingStatus || 'confirmed';

      const updateData = {
        ...editForm,
        sport: normalizedSport,
        court: normalizedSport === 'Shuttle Badminton' ? (editForm.court || undefined) : undefined,
        timeSlots: normalizedTimeSlots,
        paymentStatus: normalizedPaymentStatus,
        bookingStatus: normalizedBookingStatus,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`/api/admin/bookings/${editingBooking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: "success", message: "Booking updated successfully" });
        setBookingEditOpen(false);
        setEditingBooking(null);
        fetchData(); // Refresh the data
      } else {
        throw new Error(data.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error saving booking:', error);
      setAlert({ type: "error", message: `Failed to save booking: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleCancelBooking = async (bookingId: string, currentStatus: string) => {
    // If already cancelled, just show a message
    if (currentStatus === 'cancelled') {
      setAlert({ type: "info", message: "This booking is already cancelled" });
      return;
    }

    if (!confirm('Are you sure you want to cancel this booking? This action can be undone by editing.')) return;
    
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingStatus: 'cancelled',
          paymentStatus: 'refunded',
          cancellationDate: new Date().toISOString(),
          cancellationReason: 'Cancelled by admin',
          updatedAt: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: "success", message: "Booking cancelled successfully (record saved)" });
        fetchData(); // Refresh the data
      } else {
        throw new Error(data.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setAlert({ type: "error", message: `Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: "success", message: "Booking deleted successfully" });
        fetchData(); // Refresh the data
      } else {
        throw new Error(data.message || 'Failed to delete booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      setAlert({ type: "error", message: `Failed to delete booking: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleVerifyBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingStatus: 'confirmed',
          paymentStatus: 'paid' // Auto-complete payment when admin verifies
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: "success", message: "✅ Booking verified & payment auto-completed" });
        fetchData(); // Refresh the data including stats
      } else {
        throw new Error(data.message || 'Failed to verify booking');
      }
    } catch (error) {
      console.error('Error verifying booking:', error);
      setAlert({ type: "error", message: `Failed to verify booking: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'registered':
        return 'info';
      case 'overdue':
        return 'error';
      case 'failed':
      case 'rejected':
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  // Helper function to sort time slots chronologically by date first, then time
  // Same-day slots (05:00-23:59) first, then next-day early slots (00:00-04:59)
  const sortTimeSlots = (slots: string[]): string[] => {
    return [...slots].sort((a, b) => {
      const getTimeInMinutes = (slot: string): number => {
        const startTime = slot.split(' - ')[0]; // Get "HH:MM"
        const [hours, minutes] = startTime.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const aMinutes = getTimeInMinutes(a);
      const bMinutes = getTimeInMinutes(b);
      
      // Separate same-day (05:00-23:59 = 300-1439 minutes) from next-day (00:00-04:59 = 0-299 minutes)
      const aIsSameDay = aMinutes >= 300; // 5:00 AM onwards
      const bIsSameDay = bMinutes >= 300;
      
      // If one is same-day and the other is next-day, same-day comes first
      if (aIsSameDay !== bIsSameDay) {
        return aIsSameDay ? -1 : 1;
      }
      
      // Both same-day or both next-day, sort by time
      return aMinutes - bMinutes;
    });
  };

  // Enhanced function to get payment status display with overdue highlighting
  const getPaymentStatusChip = (user: User) => {
    const status = user.paymentStatus || 'pending';
    const isOverdue = status === 'overdue' || (user.overdueDays && user.overdueDays > 0);
    
    return (
      <Chip 
        label={
          isOverdue 
            ? `Overdue (${user.overdueDays || 0} days)` 
            : status.charAt(0).toUpperCase() + status.slice(1)
        }
        color={getStatusColor(status) as any}
        size="small"
        sx={isOverdue ? { 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          fontWeight: 'bold',
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': {
              transform: 'scale(1)',
            },
            '50%': {
              transform: 'scale(1.05)',
            },
            '100%': {
              transform: 'scale(1)',
            },
          }
        } : {}}
      />
    );
  };

  const bookingSlotOptions = Array.from(new Set([...editForm.timeSlots, ...CRICKET_FULL_DAY_TIME_SLOTS]));

  // Function to format and display due dates
  const formatDueDate = (dueDateStr: string | undefined) => {
    if (!dueDateStr) return 'Not Set';
    
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formatted = format(dueDate, 'MMM dd, yyyy');
    
    if (diffDays < 0) {
      return `${formatted} (${Math.abs(diffDays)} days overdue)`;
    } else if (diffDays <= 7) {
      return `${formatted} (${diffDays} days left)`;
    }
    
    return formatted;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, mt: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>Loading dashboard data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
        <Alert severity="error" action={
          <Button color="inherit" onClick={fetchData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!session || (session.user?.role !== "admin" && session.user?.role !== "coach")) {
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
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        borderRadius: 3,
        p: { xs: 2, sm: 3, md: 4 },
        mb: 4,
        color: 'white',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'center', md: 'center' },
        gap: { xs: 3, md: 0 }
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          textAlign: { xs: 'center', md: 'left' }
        }}>
          <Dashboard sx={{ fontSize: { xs: 32, sm: 40, md: 48 } }} />
          <Box>
            <Typography variant="h3" sx={{ 
              fontWeight: 800, 
              mb: 0.5,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' }
            }}>
              Sathiyan Sports Admin
            </Typography>
            <Typography variant="h6" sx={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontStyle: 'italic',
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
            }}>
              Coaching Excellence Dashboard
            </Typography>
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          width: { xs: '100%', sm: 'auto' },
          minWidth: { xs: '280px', sm: 'auto' },
          justifyContent: 'center'
        }}>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => router.push('/admin/subscriptions')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              padding: { xs: '12px 16px', sm: '16px 24px' },
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
              }
            }}
          >
            Subscription Management
          </Button>
          <Button
            variant="contained"
            color="warning"
            size="large"
            onClick={() => router.push('/admin/fee-collection')}
            sx={{
              bgcolor: 'rgba(255,193,7,0.2)',
              backdropFilter: 'blur(10px)',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              padding: { xs: '12px 16px', sm: '16px 24px' },
              '&:hover': {
                bgcolor: 'rgba(255,193,7,0.3)',
              }
            }}
          >
            Fee Collection
          </Button>
          <Button
            variant="contained"
            color="info"
            size="large"
            onClick={() => router.push('/admin/attendance')}
            sx={{
              bgcolor: 'rgba(33,150,243,0.2)',
              backdropFilter: 'blur(10px)',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              padding: { xs: '12px 16px', sm: '16px 24px' },
              '&:hover': {
                bgcolor: 'rgba(33,150,243,0.3)',
              }
            }}
          >
            Attendance Tracking
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={() => router.push('/admin/universal-qr')}
            sx={{
              bgcolor: 'rgba(76,175,80,0.2)',
              backdropFilter: 'blur(10px)',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              padding: { xs: '12px 16px', sm: '16px 24px' },
              '&:hover': {
                bgcolor: 'rgba(76,175,80,0.3)',
              }
            }}
          >
            Generate QR Code
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { title: "Total Bookings", value: stats.totalBookings, color: "primary.main" },
          { title: "Today's Bookings", value: stats.todaysBookings, color: "success.main" },
          { title: "Total Revenue", value: `₹${stats.totalRevenue.toFixed(2)}`, color: "warning.main" },
          { title: "Monthly Revenue", value: `₹${stats.monthlyRevenue.toFixed(2)}`, color: "info.main" },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <CardContent sx={{ textAlign: "center", flex: 1 }}>
                <Typography color="textSecondary" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography variant="h4" sx={{ color: stat.color, fontWeight: "bold" }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%", cursor: "pointer", '&:hover': { elevation: 8 } }} 
                onClick={() => router.push('/admin/tournaments')}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                🏆 Tournaments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create & manage tournaments, view registrations, update match results
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%", cursor: "pointer", '&:hover': { elevation: 8 } }} 
                onClick={() => router.push('/admin/subscription-management')}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                🔄 Subscription Migration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Migrate users and sync subscriptions, view data integrity status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: "100%" }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          sx={{ 
            borderBottom: 1, 
            borderColor: "divider",
            '& .MuiTabs-flexContainer': {
              flexWrap: { xs: 'wrap', sm: 'nowrap' }
            },
            '& .MuiTab-root': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minWidth: { xs: 'auto', sm: '120px' },
              padding: { xs: '6px 8px', sm: '12px 16px' }
            }
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Booking" />
          <Tab label="Users" />
          <Tab label="Slots Stats" />
          <Tab label="Expenses" />
          <Tab label="Inventory" />
        </Tabs>

        {/* Bookings Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Booking Date Filters & Alerts */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }} elevation={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <FilterList sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Booking Filters & Alerts</Typography>
            </Box>
            
            <Grid container spacing={2} alignItems="center">
              {/* Date Filter - Today/Tomorrow/All */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl component="fieldset" size="small">
                  <FormLabel component="legend" sx={{ fontSize: '0.9rem', mb: 1 }}>Date Filter</FormLabel>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Radio
                          checked={bookingDateFilter === 'today'}
                          onChange={() => setBookingDateFilter('today')}
                          size="small"
                        />
                      }
                      label="Today"
                    />
                    <FormControlLabel
                      control={
                        <Radio
                          checked={bookingDateFilter === 'tomorrow'}
                          onChange={() => setBookingDateFilter('tomorrow')}
                          size="small"
                        />
                      }
                      label="Tomorrow"
                    />
                    <FormControlLabel
                      control={
                        <Radio
                          checked={bookingDateFilter === 'all'}
                          onChange={() => setBookingDateFilter('all')}
                          size="small"
                        />
                      }
                      label="All Bookings"
                    />
                  </Box>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={bookingStartDateFilter}
                  onChange={(e) => setBookingStartDateFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={bookingEndDateFilter}
                  onChange={(e) => setBookingEndDateFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Radio
                      checked={!showBookingAlerts}
                      onChange={() => setShowBookingAlerts(false)}
                      size="small"
                    />
                  }
                  label="All Statuses"
                />
                <FormControlLabel
                  control={
                    <Radio
                      checked={showBookingAlerts}
                      onChange={() => setShowBookingAlerts(true)}
                      size="small"
                    />
                  }
                  label="Alerts Only"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => {
                    setBookingDateFilter('today');
                    setBookingStartDateFilter('');
                    setBookingEndDateFilter('');
                    setShowBookingAlerts(false);
                  }}
                >
                  Reset Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Sport</TableCell>
                  <TableCell>Court</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Slots</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.filter(booking => {
                  const bookingDate = new Date(booking.date);
                  const today = startOfDay(new Date());
                  const tomorrow = addDays(today, 1);

                  // Filter by date type
                  if (bookingDateFilter === 'today') {
                    if (startOfDay(bookingDate).getTime() !== today.getTime()) return false;
                  } else if (bookingDateFilter === 'tomorrow') {
                    if (startOfDay(bookingDate).getTime() !== tomorrow.getTime()) return false;
                  }

                  // Filter by custom date range (inclusive on both start and end)
                  if (bookingStartDateFilter || bookingEndDateFilter) {
                    if (bookingStartDateFilter) {
                      const startDate = startOfDay(new Date(bookingStartDateFilter));
                      if (bookingDate < startDate) return false;
                    }
                    if (bookingEndDateFilter) {
                      const endDate = endOfDay(new Date(bookingEndDateFilter));
                      if (bookingDate > endDate) return false;
                    }
                  }

                  // Filter by alert status (pending or failed payments)
                  if (showBookingAlerts) {
                    return booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed';
                  }

                  return true;
                })
                .sort((a, b) => {
                  // Sort by date descending (newest first)
                  return new Date(b.date).getTime() - new Date(a.date).getTime();
                })
                .map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>{booking.customerName}</TableCell>
                    <TableCell>{booking.sport}</TableCell>
                    <TableCell>{booking.court || 'N/A'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Primary Date: {formatSafeDate(booking.date, 'MMM dd, yyyy')}
                        </Typography>
                        {booking.nextDayDate && booking.nextDayTimeSlots && booking.nextDayTimeSlots.length > 0 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Includes previous-day slots ({formatSafeDate(booking.nextDayDate, 'MMM dd, yyyy')})
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ fontSize: '0.85rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {booking.timeSlots && booking.timeSlots.length > 0 
                          ? sortTimeSlots(booking.timeSlots).map((slot, idx) => (
                              <div key={idx}>{slot}</div>
                            ))
                          : 'N/A'
                        }
                        {booking.nextDayTimeSlots && booking.nextDayTimeSlots.length > 0 && (
                          <>
                            <div style={{ marginTop: '6px', fontWeight: 600, color: '#616161' }}>Prev day:</div>
                            {sortTimeSlots(booking.nextDayTimeSlots).map((slot, idx) => (
                              <div key={`next-${idx}`}>{slot}</div>
                            ))}
                          </>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.bookingStatus} 
                        color={getStatusColor(booking.bookingStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.paymentStatus} 
                        color={getStatusColor(booking.paymentStatus) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>₹{booking.totalAmount}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {/* Verify Button - Show for confirmed bookings that are not marked paid */}
                        {booking.bookingStatus === 'confirmed' && booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'completed' && (
                          <Tooltip title="Mark Payment Complete">
                            <IconButton 
                              size="small" 
                              sx={{ 
                                color: '#4caf50',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.2)' }
                              }}
                              onClick={() => handleVerifyBooking(booking._id)}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Cancel Button - Only for active bookings */}
                        {booking.bookingStatus !== 'cancelled' && booking.bookingStatus !== 'completed' && (
                          <Tooltip title="Cancel Booking">
                            <IconButton 
                              size="small" 
                              sx={{ 
                                color: '#ff9800',
                                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.2)' }
                              }}
                              onClick={() => handleCancelBooking(booking._id, booking.bookingStatus)}
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Delete Button - Permanently remove */}
                        <Tooltip title="Delete Booking">
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: '#f44336',
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.2)' }
                            }}
                            onClick={() => handleDeleteBooking(booking._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Edit Button */}
                        <Tooltip title="Edit Booking">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditBooking(booking)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">User Management</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="contained" 
                startIcon={<Add />} 
                onClick={() => router.push('/register')}
                sx={{ mr: 1 }}
              >
                Add New User
              </Button>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>
                Refresh
              </Button>
            </Box>
          </Box>

          {/* User Filters */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search Users"
                  placeholder="Search by name, email, Champion ID, or mobile"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Champion Type</InputLabel>
                  <Select
                    value={champTypeFilter}
                    label="Champion Type"
                    onChange={(e) => setChampTypeFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="kids">Kids</MenuItem>
                    <MenuItem value="adult">Adult</MenuItem>
                    <MenuItem value="veteran">Veteran</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={paymentStatusFilter}
                    label="Payment Status"
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Payments</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sport</InputLabel>
                  <Select
                    value={preferredSportFilter}
                    label="Sport"
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
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setUserSearchTerm('');
                    setChampTypeFilter('all');
                    setPaymentStatusFilter('all');
                    setPreferredSportFilter('all');
                  }}
                  size="small"
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
          
          <Paper sx={{ mt: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <SortableHeader column="champId">Champ ID</SortableHeader>
                    <SortableHeader column="name">Name</SortableHeader>
                    <SortableHeader column="mobile">Mobile</SortableHeader>
                    <SortableHeader column="champType">Type</SortableHeader>
                    <SortableHeader column="subscribed">Subscribed</SortableHeader>
                    <SortableHeader column="subscriptionType">Sub Type</SortableHeader>
                    <TableCell>Comments</TableCell>
                    <TableCell>Height</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>BMI</TableCell>
                    <SortableHeader column="paymentStatus">Payment Status</SortableHeader>
                    <SortableHeader column="selectedCourt">Court</SortableHeader>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Chip 
                        label={user.champId || 'Legacy User'} 
                        size="small" 
                        color={user.champId ? "primary" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.mobile || user.phone}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.champType || 'Not Set'} 
                        size="small" 
                        color={user.champType === 'kids' ? 'primary' : user.champType === 'adult' ? 'secondary' : user.champType === 'veteran' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.subscribed === 'yes' ? 'Yes' : 'No'} 
                        size="small" 
                        color={user.subscribed === 'yes' ? 'success' : 'error'}
                        variant="outlined"
                        onClick={user.subscribed === 'yes' ? () => router.push('/admin/subscriptions') : undefined}
                        sx={{ 
                          cursor: user.subscribed === 'yes' ? 'pointer' : 'default',
                          '&:hover': user.subscribed === 'yes' ? { 
                            backgroundColor: 'rgba(46, 125, 50, 0.1)' 
                          } : {}
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.subscriptionType || 'Not Set'} 
                        size="small" 
                        color={user.subscriptionType ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.comments || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.height ? `${user.height} cm` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.weight ? `${user.weight} kg` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.bmi ? user.bmi : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusChip(user)}
                    </TableCell>
                    <TableCell>
                      {user.selectedCourt ? (
                        <Chip label={user.selectedCourt} size="small" color="primary" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="textSecondary">No Court</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" onClick={() => handleEditUser(user)} startIcon={<Edit />}>
                          Edit
                        </Button>
                        <Button size="small" color="error" onClick={() => handleDeleteUser(user)} startIcon={<Delete />}>
                          Delete
                        </Button>
                        {user.subscribed === 'yes' && (
                          <Button 
                            size="small" 
                            color="primary" 
                            variant="contained"
                            onClick={() => router.push('/admin/subscriptions')}
                            sx={{ fontSize: '0.75rem' }}
                          >
                            View Sub
                          </Button>
                        )}
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
            count={filteredUsers.length}
            rowsPerPage={userRowsPerPage}
            page={Math.min(userPage, Math.max(0, Math.ceil(filteredUsers.length / userRowsPerPage) - 1))}
            onPageChange={(_, newPage) => {
              const maxPage = Math.max(0, Math.ceil(filteredUsers.length / userRowsPerPage) - 1);
              setUserPage(Math.min(newPage, maxPage));
            }}
            onRowsPerPageChange={(event) => {
              setUserRowsPerPage(parseInt(event.target.value, 10));
              setUserPage(0);
            }}
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`} filtered users`
            }
          />
        </Paper>
        </TabPanel>

        {/* Slots Stats Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Court Slots Overview</Typography>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />} 
              onClick={fetchData}
            >
              Refresh Data
            </Button>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Real-time view of court availability across all time slots. Each court can accommodate up to 6 players per slot.
            </Alert>
            
            <Grid container spacing={2}>
              {['S1', 'S2', 'S3'].map((courtId) => (
                <Grid item xs={12} md={4} key={courtId}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                      Court {courtId}
                    </Typography>
                    
                    <Grid container spacing={1}>
                      {TIME_SLOTS.map((slot) => {
                        // Get registered users for this slot and court (only PAID, ACTIVE subscribers)
                        const todayDate = new Date();
                        const registeredUsers = users.filter(user => {
                          if (user.selectedCourt !== courtId || 
                              user.preferredTimeSlot !== slot ||
                              user.preferredSport !== 'Shuttle Badminton') {
                            return false;
                          }
                          
                          // STRICT validation: Must be PAID + SUBSCRIBED for current month
                          if (user.paymentStatus !== 'completed') return false;
                          if (!user.nextDueDate || new Date(user.nextDueDate) <= todayDate) return false;
                          
                          // Check subscription is active (current month)
                          const subStartDate = user.subscriptionStartDate ? new Date(user.subscriptionStartDate) : null;
                          const subEndDate = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
                          if (!subStartDate || !subEndDate) return false;
                          if (todayDate < subStartDate || todayDate > subEndDate) return false;
                          
                          return true;
                        });

                        // Get hourly bookings for this slot and court for today
                        const today = new Date().toDateString();
                        const hourlyBookings = bookings.filter(booking => 
                          booking.court === courtId &&
                          booking.sport === 'Shuttle Badminton' &&
                          new Date(booking.date).toDateString() === today &&
                          booking.timeSlots.some(bookingSlot => {
                            // Normalize time slot format for comparison
                            const normalizeSlot = (s: string) => s.replace(/\s+/g, ' ').trim();
                            return normalizeSlot(bookingSlot) === normalizeSlot(slot);
                          }) &&
                          ['confirmed', 'pending'].includes(booking.bookingStatus) &&
                          booking.paymentStatus !== 'expired'
                        );

                        // Calculate total occupancy (registered users + hourly bookings)
                        const registeredCount = registeredUsers.length;
                        const hourlyBookingCount = hourlyBookings.length;
                        const totalOccupancy = registeredCount + hourlyBookingCount;
                        const isAvailable = totalOccupancy < 6;
                        
                        return (
                          <Grid item xs={6} key={slot}>
                            <Paper 
                              onClick={() => handleSlotClick(courtId, slot)}
                              sx={{ 
                                p: 1, 
                                textAlign: 'center',
                                backgroundColor: isAvailable ? '#e8f5e8' : '#ffebee',
                                border: isAvailable ? '1px solid #4caf50' : '1px solid #f44336',
                                minHeight: '80px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                '&:hover': {
                                  opacity: 0.8,
                                  transform: 'scale(1.02)',
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                                {slot}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: isAvailable ? '#2e7d32' : '#d32f2f',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {totalOccupancy}/6
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {registeredCount > 0 && (
                                  <Chip 
                                    label={`${registeredCount} Reg`} 
                                    size="small"
                                    color="primary"
                                    sx={{ fontSize: '0.5rem', height: '14px' }}
                                  />
                                )}
                                {hourlyBookingCount > 0 && (
                                  <Chip 
                                    label={`${hourlyBookingCount} Book`} 
                                    size="small"
                                    color="secondary"
                                    sx={{ fontSize: '0.5rem', height: '14px' }}
                                  />
                                )}
                                {totalOccupancy === 0 && (
                                  <Chip 
                                    label="Available" 
                                    size="small"
                                    color="success"
                                    sx={{ fontSize: '0.5rem', height: '14px' }}
                                  />
                                )}
                                {totalOccupancy >= 6 && (
                                  <Chip 
                                    label="Full" 
                                    size="small"
                                    color="error"
                                    sx={{ fontSize: '0.5rem', height: '14px' }}
                                  />
                                )}
                              </Box>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                    
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Total: {(() => {
                          const registeredUsers = users.filter(user => 
                            user.selectedCourt === courtId && 
                            user.preferredSport === 'Shuttle Badminton'
                          ).length;
                          
                          const today = new Date().toDateString();
                          const hourlyBookings = bookings.filter(booking => 
                            booking.court === courtId &&
                            booking.sport === 'Shuttle Badminton' &&
                            new Date(booking.date).toDateString() === today &&
                            ['confirmed', 'pending'].includes(booking.bookingStatus) &&
                            booking.paymentStatus !== 'expired'
                          ).length;
                          
                          return `${registeredUsers + hourlyBookings} (${registeredUsers} Reg + ${hourlyBookings} Book)`;
                        })()}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Quick Stats</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Total Available Slots
                      </Typography>
                      <Typography variant="h4" component="div">
                        {(() => {
                          const totalCapacity = TIME_SLOTS.length * 3 * 6;
                          const registeredUsers = users.filter(user => 
                            user.preferredSport === 'Shuttle Badminton' && 
                            ['S1', 'S2', 'S3'].includes(user.selectedCourt || '')
                          ).length;
                          
                          const today = new Date().toDateString();
                          const hourlyBookings = bookings.filter(booking => 
                            booking.sport === 'Shuttle Badminton' &&
                            ['S1', 'S2', 'S3'].includes(booking.court || '') &&
                            new Date(booking.date).toDateString() === today &&
                            ['confirmed', 'pending'].includes(booking.bookingStatus) &&
                            booking.paymentStatus !== 'expired'
                          ).reduce((total, booking) => total + booking.timeSlots.length, 0);
                          
                          return totalCapacity - registeredUsers - hourlyBookings;
                        })()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Total Occupied Slots
                      </Typography>
                      <Typography variant="h4" component="div">
                        {(() => {
                          const registeredUsers = users.filter(user => 
                            user.preferredSport === 'Shuttle Badminton' && 
                            ['S1', 'S2', 'S3'].includes(user.selectedCourt || '')
                          ).length;
                          
                          const today = new Date().toDateString();
                          const hourlyBookings = bookings.filter(booking => 
                            booking.sport === 'Shuttle Badminton' &&
                            ['S1', 'S2', 'S3'].includes(booking.court || '') &&
                            new Date(booking.date).toDateString() === today &&
                            ['confirmed', 'pending'].includes(booking.bookingStatus) &&
                            booking.paymentStatus !== 'expired'
                          ).reduce((total, booking) => total + booking.timeSlots.length, 0);
                          
                          return registeredUsers + hourlyBookings;
                        })()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(() => {
                          const registeredUsers = users.filter(user => 
                            user.preferredSport === 'Shuttle Badminton' && 
                            ['S1', 'S2', 'S3'].includes(user.selectedCourt || '')
                          ).length;
                          
                          const today = new Date().toDateString();
                          const hourlyBookings = bookings.filter(booking => 
                            booking.sport === 'Shuttle Badminton' &&
                            ['S1', 'S2', 'S3'].includes(booking.court || '') &&
                            new Date(booking.date).toDateString() === today &&
                            ['confirmed', 'pending'].includes(booking.bookingStatus) &&
                            booking.paymentStatus !== 'expired'
                          ).reduce((total, booking) => total + booking.timeSlots.length, 0);
                          
                          return `${registeredUsers} Registered + ${hourlyBookings} Hourly`;
                        })()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Peak Time Slots
                      </Typography>
                      <Typography variant="h6" component="div">
                        {(() => {
                          const today = new Date().toDateString();
                          const slotCounts = TIME_SLOTS.map(slot => {
                            const registeredCount = users.filter(user => 
                              user.preferredTimeSlot === slot && 
                              user.preferredSport === 'Shuttle Badminton'
                            ).length;
                            
                            const hourlyBookingCount = bookings.filter(booking => 
                              booking.sport === 'Shuttle Badminton' &&
                              new Date(booking.date).toDateString() === today &&
                              booking.timeSlots.some(bookingSlot => {
                                const normalizeSlot = (s: string) => s.replace(/\s+/g, ' ').trim();
                                return normalizeSlot(bookingSlot) === normalizeSlot(slot);
                              }) &&
                              ['confirmed', 'pending'].includes(booking.bookingStatus) &&
                              booking.paymentStatus !== 'expired'
                            ).length;
                            
                            return {
                              slot,
                              count: registeredCount + hourlyBookingCount
                            };
                          });
                          
                          const maxCount = Math.max(...slotCounts.map(s => s.count));
                          const peakSlots = slotCounts.filter(s => s.count === maxCount);
                          return peakSlots.length > 0 ? peakSlots[0].slot : 'N/A';
                        })()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Capacity Utilization
                      </Typography>
                      <Typography variant="h4" component="div">
                        {(() => {
                          const totalCapacity = TIME_SLOTS.length * 3 * 6;
                          const registeredUsers = users.filter(user => 
                            user.preferredSport === 'Shuttle Badminton' && 
                            ['S1', 'S2', 'S3'].includes(user.selectedCourt || '')
                          ).length;
                          
                          const today = new Date().toDateString();
                          const hourlyBookings = bookings.filter(booking => 
                            booking.sport === 'Shuttle Badminton' &&
                            ['S1', 'S2', 'S3'].includes(booking.court || '') &&
                            new Date(booking.date).toDateString() === today &&
                            ['confirmed', 'pending'].includes(booking.bookingStatus) &&
                            booking.paymentStatus !== 'expired'
                          ).reduce((total, booking) => total + booking.timeSlots.length, 0);
                          
                          const totalOccupied = registeredUsers + hourlyBookings;
                          return Math.round((totalOccupied / totalCapacity) * 100);
                        })()}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </TabPanel>

        {/* Expenses Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Expense Management</Typography>
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={() => router.push('/admin/expenses')}
            >
              Manage Expenses
            </Button>
          </Box>
          
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Full Expense Management System
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Track and manage all expenses with detailed analytics and reporting.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => router.push('/admin/expenses')}
            >
              Go to Expenses Management
            </Button>
          </Box>
        </TabPanel>

        {/* Inventory Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Inventory Management</Typography>
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={() => router.push('/admin/inventory')}
            >
              Manage Inventory
            </Button>
          </Box>
          
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Sports Equipment Inventory
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Track stock levels, manage inflows and outflows for balls, bats, cork, and body zorbs.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => router.push('/admin/inventory')}
            >
              Go to Inventory Management
            </Button>
          </Box>
        </TabPanel>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onClose={() => setEditUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              {/* ChampID Field */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Champion ID"
                  placeholder="S25911"
                  value={editUserFormData.champId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditUserFormData(prev => ({ ...prev, champId: value }));
                    // Validate ChampID with debounce
                    setTimeout(() => {
                      validateChampId(value, selectedUser?._id);
                    }, 300);
                  }}
                  helperText={
                    champIdValidation.isChecking 
                      ? "Checking availability..." 
                      : champIdValidation.message || "Required. Format: S##### (e.g., S25911)"
                  }
                  error={!editUserFormData.champId || champIdValidation.isValid === false}
                  InputProps={{
                    style: { 
                      color: champIdValidation.isValid === true ? '#2e7d32' : 
                             champIdValidation.isValid === false ? '#d32f2f' : 'inherit'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editUserFormData.name}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editUserFormData.email}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mobile"
                  value={editUserFormData.mobile}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, mobile: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={editUserFormData.gender}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, gender: e.target.value }))}
                    label="Gender"
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Champion Type</InputLabel>
                  <Select
                    value={editUserFormData.champType}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, champType: e.target.value }))}
                    label="Champion Type"
                  >
                    <MenuItem value="kids">Kids</MenuItem>
                    <MenuItem value="adult">Adult</MenuItem>
                    <MenuItem value="veteran">Veteran</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Subscribed</InputLabel>
                  <Select
                    value={editUserFormData.subscribed}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, subscribed: e.target.value }))}
                    label="Subscribed"
                  >
                    <MenuItem value="no">No</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Health Information Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
                  Health Information (Optional)
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Height (cm)"
                  type="number"
                  value={editUserFormData.height}
                  onChange={(e) => {
                    const height = e.target.value;
                    const weight = editUserFormData.weight;
                    let bmi = '';
                    
                    if (height && weight && parseFloat(height) > 0 && parseFloat(weight) > 0) {
                      const h = parseFloat(height) / 100; // convert cm to m
                      const w = parseFloat(weight);
                      bmi = (w / (h * h)).toFixed(1);
                    }
                    
                    setEditUserFormData(prev => ({ 
                      ...prev, 
                      height, 
                      bmi 
                    }));
                  }}
                  InputProps={{
                    inputProps: { min: 50, max: 300 }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Weight (kg)"
                  type="number"
                  value={editUserFormData.weight}
                  onChange={(e) => {
                    const weight = e.target.value;
                    const height = editUserFormData.height;
                    let bmi = '';
                    
                    if (height && weight && parseFloat(height) > 0 && parseFloat(weight) > 0) {
                      const h = parseFloat(height) / 100; // convert cm to m
                      const w = parseFloat(weight);
                      bmi = (w / (h * h)).toFixed(1);
                    }
                    
                    setEditUserFormData(prev => ({ 
                      ...prev, 
                      weight, 
                      bmi 
                    }));
                  }}
                  InputProps={{
                    inputProps: { min: 10, max: 300 }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="BMI"
                  value={editUserFormData.bmi}
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Calculated automatically"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Sport</InputLabel>
                  <Select
                    value={editUserFormData.preferredSport}
                    onChange={(e) => {
                      const newSport = e.target.value;
                      setEditUserFormData(prev => ({ 
                        ...prev, 
                        preferredSport: newSport,
                        selectedCourt: newSport === "Shuttle Badminton" ? prev.selectedCourt : "",
                        preferredTimeSlot: newSport === prev.preferredSport ? prev.preferredTimeSlot : ""
                      }));
                    }}
                    label="Preferred Sport"
                  >
                    <MenuItem value="Cricket">Cricket</MenuItem>
                    <MenuItem value="Football">Football</MenuItem>
                    <MenuItem value="Shuttle Badminton">Shuttle Badminton</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Time Slot</InputLabel>
                  <Select
                    value={editUserFormData.preferredTimeSlot}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, preferredTimeSlot: e.target.value }))}
                    label="Preferred Time Slot"
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Select a time slot</em>
                    </MenuItem>
                    {TIME_SLOTS.map((slot) => (
                      <MenuItem key={slot} value={slot}>
                        {slot}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {editUserFormData.preferredSport === "Shuttle Badminton" && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Selected Court</InputLabel>
                    <Select
                      value={editUserFormData.selectedCourt || ''}
                      onChange={(e) => setEditUserFormData(prev => ({ ...prev, selectedCourt: e.target.value }))}
                      label="Selected Court"
                      disabled={editUserFormData.paymentStatus !== 'completed'}
                    >
                      <MenuItem value="">
                        <em>No Court Assigned</em>
                      </MenuItem>
                      <MenuItem value="S1">Court S1</MenuItem>
                      <MenuItem value="S2">Court S2</MenuItem>
                      <MenuItem value="S3">Court S3</MenuItem>
                    </Select>
                    {editUserFormData.paymentStatus !== 'completed' && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Court can only be assigned to users with completed payment
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Subscription Type</FormLabel>
                  <RadioGroup
                    value={editUserFormData.subscriptionType}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, subscriptionType: e.target.value }))}
                    row
                  >
                    <FormControlLabel value="monthly" control={<Radio />} label="Monthly" />
                    <FormControlLabel value="quarterly" control={<Radio />} label="Quarterly" />
                    <FormControlLabel value="half yearly" control={<Radio />} label="Half Yearly" />
                    <FormControlLabel value="yearly" control={<Radio />} label="Yearly" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={editUserFormData.paymentStatus}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    label="Payment Status"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Billing Cycle Length for Monthly Subscriptions */}
              {editUserFormData.subscriptionType === 'monthly' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Billing Cycle (Months)</InputLabel>
                    <Select
                      value={editUserFormData.billingCycleLength}
                      onChange={(e) => setEditUserFormData(prev => ({ ...prev, billingCycleLength: Number(e.target.value) }))}
                      label="Billing Cycle (Months)"
                    >
                      <MenuItem value={1}>1 Month</MenuItem>
                      <MenuItem value={2}>2 Months</MenuItem>
                      <MenuItem value={3}>3 Months</MenuItem>
                      <MenuItem value={4}>4 Months</MenuItem>
                      <MenuItem value={5}>5 Months</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              {/* Subscription Amount */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Subscription Amount (₹)"
                  value={editUserFormData.subscriptionAmount}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, subscriptionAmount: Number(e.target.value) }))}
                  inputProps={{ min: 0 }}
                />
                {editUserFormData.gender === 'female' && editUserFormData.preferredTimeSlot && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {(() => {
                      const timeSlot = editUserFormData.preferredTimeSlot;
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
                        ? '✅ Female discount applied (10 AM - 4 PM slot)'
                        : '⚠️ Using standard pricing (outside 10 AM - 4 PM)';
                    })()}
                  </Typography>
                )}
              </Grid>
              
              {/* Payment Method */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={editUserFormData.paymentMethod}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    label="Payment Method"
                  >
                    <MenuItem value="">Not Selected</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="gpay">GPay</MenuItem>
                    <MenuItem value="phonepe">PhonePe</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="whatsapp">WhatsApp Payment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Transaction ID */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Transaction ID"
                  value={editUserFormData.transactionId}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                  placeholder="Enter transaction reference"
                />
              </Grid>
              
              {/* Grace Period Days */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Grace Period (Days)"
                  value={editUserFormData.gracePeriodDays}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, gracePeriodDays: Number(e.target.value) }))}
                  inputProps={{ min: 0, max: 30 }}
                  helperText="Days after due date before marking as overdue"
                />
              </Grid>
              
              {/* Next Due Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Next Due Date"
                  value={editUserFormData.nextDueDate ? new Date(editUserFormData.nextDueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  helperText="Next payment due date"
                />
              </Grid>
              
              {/* Comments Field */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Comments"
                  value={editUserFormData.comments}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Any additional comments or notes..."
                />
              </Grid>
              
              {/* Mode Field */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Mode</InputLabel>
                  <Select
                    value={editUserFormData.mode}
                    onChange={(e) => setEditUserFormData(prev => ({ ...prev, mode: e.target.value }))}
                    label="Mode"
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="fixed">Fixed</MenuItem>
                    <MenuItem value="flexible">Flexible</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUserUpdate} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserDialogOpen} onClose={() => setDeleteUserDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user? This action cannot be undone.
          </Typography>
          {selectedUser && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2">User Details:</Typography>
              <Typography variant="body2">Name: {selectedUser.name}</Typography>
              <Typography variant="body2">Email: {selectedUser.email}</Typography>
              <Typography variant="body2">Phone: {selectedUser.phone || selectedUser.mobile}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteUser} variant="contained" color="error">
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Slot Details Dialog */}
      <Dialog 
        open={slotDetailsDialog.open}
        onClose={() => setSlotDetailsDialog(prev => ({ ...prev, open: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Slot Details - Court {slotDetailsDialog.courtId} ({slotDetailsDialog.timeSlot})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Registered Users Section */}
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Registered Users ({slotDetailsDialog.registeredUsers.length})
            </Typography>
            {slotDetailsDialog.registeredUsers.length > 0 ? (
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Champion ID</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell>Payment Status</TableCell>
                      <TableCell>Subscription</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {slotDetailsDialog.registeredUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.champId || '-'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || user.mobile}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.paymentStatus} 
                            color={user.paymentStatus === 'paid' ? 'success' : 
                                   user.paymentStatus === 'pending' ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.subscriptionType} 
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                No registered users for this slot
              </Alert>
            )}

            {/* Hourly Bookings Section */}
            <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
              Hourly Bookings ({slotDetailsDialog.hourlyBookings.length})
            </Typography>
            {slotDetailsDialog.hourlyBookings.length > 0 ? (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Payment Status</TableCell>
                      <TableCell>Booking Status</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {slotDetailsDialog.hourlyBookings.map((booking) => (
                      <TableRow key={booking._id}>
                        <TableCell>{booking.customerName}</TableCell>
                        <TableCell>{booking.customerEmail}</TableCell>
                        <TableCell>{booking.customerPhone}</TableCell>
                        <TableCell>₹{booking.totalAmount}</TableCell>
                        <TableCell>
                          <Chip 
                            label={booking.paymentStatus} 
                            color={booking.paymentStatus === 'confirmed' ? 'success' : 
                                   booking.paymentStatus === 'pending' ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={booking.bookingStatus} 
                            color={booking.bookingStatus === 'confirmed' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {formatSafeDate(booking.createdAt, 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No hourly bookings for this slot today
              </Alert>
            )}

            {/* Summary */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Total Occupancy:</strong> {slotDetailsDialog.registeredUsers.length + slotDetailsDialog.hourlyBookings.length}/6
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Available Slots:</strong> {6 - (slotDetailsDialog.registeredUsers.length + slotDetailsDialog.hourlyBookings.length)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Registered:</strong> {slotDetailsDialog.registeredUsers.length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Hourly Bookings:</strong> {slotDetailsDialog.hourlyBookings.length}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSlotDetailsDialog(prev => ({ ...prev, open: false }))}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Booking Edit Dialog */}
      <Dialog open={bookingEditOpen} onClose={() => setBookingEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Booking</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer Name"
                value={editForm.customerName}
                onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Sport</InputLabel>
                <Select
                  value={editForm.sport}
                  label="Sport"
                  onChange={(e) => {
                    const nextSport = e.target.value;
                    setEditForm(prev => ({
                      ...prev,
                      sport: nextSport,
                      court: nextSport === 'Shuttle Badminton' ? prev.court : '',
                      timeSlots: nextSport === 'Cricket' && prev.timeSlots.length === 0
                        ? [CRICKET_DEFAULT_SLOT]
                        : prev.timeSlots,
                    }));
                  }}
                >
                  <MenuItem value="Cricket">Cricket</MenuItem>
                  <MenuItem value="Football">Football</MenuItem>
                  <MenuItem value="Shuttle Badminton">Shuttle Badminton</MenuItem>
                  <MenuItem value="Functions and Events">Functions and Events</MenuItem>
                  <MenuItem value="Body Zorb">Body Zorb</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {editForm.sport === 'Shuttle Badminton' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Court</InputLabel>
                  <Select
                    value={editForm.court}
                    label="Court"
                    onChange={(e) => setEditForm(prev => ({ ...prev, court: e.target.value }))}
                  >
                    <MenuItem value="S1">S1</MenuItem>
                    <MenuItem value="S2">S2</MenuItem>
                    <MenuItem value="S3">S3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Time Slots (30 min)</InputLabel>
                <Select
                  multiple
                  value={editForm.timeSlots}
                  label="Time Slots (30 min)"
                  onChange={(e) => setEditForm(prev => ({ ...prev, timeSlots: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value }))}
                >
                  {bookingSlotOptions.map((slot) => (
                    <MenuItem key={slot} value={slot}>{slot}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Amount"
                value={editForm.totalAmount}
                onChange={(e) => setEditForm(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Booking Status</InputLabel>
                <Select
                  value={editForm.bookingStatus}
                  label="Booking Status"
                  onChange={(e) => setEditForm(prev => ({ ...prev, bookingStatus: e.target.value }))}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={editForm.paymentStatus}
                  label="Payment Status"
                  onChange={(e) => setEditForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Received By"
                value={editForm.receivedBy}
                onChange={(e) => setEditForm(prev => ({ ...prev, receivedBy: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Payment Method"
                value={editForm.paymentMethod}
                onChange={(e) => setEditForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
            {editForm.bookingStatus === 'cancelled' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Cancellation Reason"
                  value={editForm.cancellationReason}
                  onChange={(e) => setEditForm(prev => ({ ...prev, cancellationReason: e.target.value }))}
                  placeholder="Enter reason for cancellation"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingEditOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveBooking} 
            variant="contained"
            color={editForm.bookingStatus === 'cancelled' ? 'error' : 'primary'}
          >
            {editForm.bookingStatus === 'cancelled' ? 'Save & Cancel Booking' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}