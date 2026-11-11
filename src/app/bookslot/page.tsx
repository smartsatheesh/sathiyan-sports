"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { SITE_HOST } from "@/app/lib/site";
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from 'date-fns/locale';
import { format, setHours, setMinutes, addMinutes } from "date-fns";
import {
  Payment,
  CheckCircle,
  ContentCopy,
} from "@mui/icons-material";
import UpiPaymentDialog from "../components/UpiPaymentDialog";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { bookingRuleError, calculateBookingPrice, courtPriceLabel, getCourt, EVENT_SESSIONS } from "../lib/pricing";

// Custom weekend function that includes Friday, Saturday, and Sunday
type SportName = "Cricket" | "Football" | "Shuttle Badminton" | "Cricket Nets" | "Functions and Events" | "Body Zorb";

// Sports data with proper typing to match selectedSport state
const sports: Array<{
  id: number;
  name: SportName;
  icon: string;
  color: string;
  description: string;
  features: string[];
}> = [
  {
    id: 1,
    name: "Cricket",
    icon: "🏏",
    color: "#4caf50",
    description: "Professional cricket ground with all facilities",
    features: ["Full-size pitch", "Changing rooms"]
  },
  {
    id: 2,
    name: "Football",
    icon: "⚽",
    color: "#2196f3",
    description: "FIFA standard football turf",
    features: ["Professional turf", "Floodlights"]
  },
  {
    id: 3,
    name: "Shuttle Badminton",
    icon: "🏸",
    color: "#ff9800",
    description: "Indoor badminton courts with wooden flooring",
    features: ["3 courts available", "Professional nets", "Rackets available"]
  },
  {
    id: 6,
    name: "Cricket Nets",
    icon: "🏏",
    color: "#00897b",
    description: "Batting and bowling practice in the nets",
    features: ["Practice nets", "Priced per person"]
  },
  {
    id: 4,
    name: "Functions and Events",
    icon: "🎉",
    color: "#9c27b0",
    description: "Premium venue for corporate events, birthday parties, and celebrations",
    features: [
      "Spacious hall for 500+ guests",
      "Audio/Visual equipment",
      "Catering facilities",
      "Parking space",
      "Event coordination support"
    ]
  },
  {
    id: 5,
    name: "Body Zorb",
    icon: "⚪",
    color: "#FF6B6B",
    description: "Thrilling inflatable bubble football experience",
    features: [
      "Waterproof bubble suits",
      "Safety equipment included",
      "Professional supervision",
      "🎉 Launching Offer: 1 hour FREE on weekdays!"
    ]
  },
];

// Update the timeSlots generation with 30-minute intervals and sport-specific blocking
const generateTimeSlots = (
  isEvent = false,
  selectedDate: Date | null = null,
  sport: string = "",
  allowPastBooking = false
) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isToday = selectedDate && 
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  if (isEvent) {
    return EVENT_SESSIONS.map(session => {
      let available = true;
      
      // If it's today, check if the session time has passed
      if (isToday && !allowPastBooking) {
        // Extract start hour from session time
        const sessionMatch = session.time.match(/\((\d{2}):00/);
        if (sessionMatch) {
          const sessionStartHour = parseInt(sessionMatch[1], 10);
          // Disable if session has already started (with 1 hour buffer)
          available = currentHour < sessionStartHour;
        }
      }
      
      return {
        time: session.time,
        hours: session.hours,
        available,
        isPast: !available && isToday // For event sessions, past means unavailable
      };
    });
  }
  
  const slots = [];
  
  // Define sport-specific blocked and hidden time ranges
  // Blocked ranges for specific sports
  const blockedRanges: Record<string, Array<{ start: number; startMin: number; end: number; endMin: number }>> = {
    "Shuttle Badminton": [{ start: 17, startMin: 0, end: 19, endMin: 0 }], // 5pm-7pm blocked
    "Cricket": [{ start: 17, startMin: 0, end: 18, endMin: 0 }], // 5pm-6pm blocked
    "Football": [{ start: 17, startMin: 0, end: 18, endMin: 0 }] // 5pm-6pm blocked
  };
  
  // Hidden ranges - only Badminton hides 5-8 AM
  const hiddenRanges: Record<string, Array<{ start: number; startMin: number; end: number; endMin: number }>> = {
    "Shuttle Badminton": [{ start: 5, startMin: 0, end: 8, endMin: 0 }] // 5am-8am hidden (only for Badminton)
  };
  
  // Generate 30-minute interval slots in strict chronological order: 00:00 to 23:30
  const slotRanges = [
    { startHour: 0, endHour: 23 },
  ];

  for (const range of slotRanges) {
    for (let hour = range.startHour; hour <= range.endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startDate = setHours(setMinutes(new Date(), minute), hour);
      const startTime = format(startDate, "HH:mm");
      const endTime = format(addMinutes(startDate, 30), "HH:mm");
      
      // Skip if this slot should be hidden for this sport
      const hidden = sport && hiddenRanges[sport] && hiddenRanges[sport].some(range => 
        (hour > range.start || (hour === range.start && minute >= range.startMin)) &&
        (hour < range.end || (hour === range.end && minute < range.endMin))
      );
      
      if (hidden) continue;
      
      const timeString = `${startTime} - ${endTime}`;
      
      // Check if this time slot is in the past for today
      let available = true;
      let isPast = false;
      if (isToday && !allowPastBooking) {
        // Don't mark next-day early slots as past (they belong to tomorrow)
        const isNextDaySlot = hour < 5;
        if (!isNextDaySlot) {
          // Mark slots that have already passed (with 30 min buffer for booking)
          isPast = !(hour > currentHour || (hour === currentHour && (minute + 30) > currentMinute));
          available = !isPast;
        }
      }
      
      // Check if slot is in blocked range for this sport
      const isBlocked = sport && blockedRanges[sport] && blockedRanges[sport].some(range =>
        (hour > range.start || (hour === range.start && minute >= range.startMin)) &&
        (hour < range.end || (hour === range.end && minute < range.endMin))
      );
      
      // If blocked, mark as unavailable
      if (isBlocked) {
        available = false;
      }
      
      slots.push({
        time: timeString,
        available, // Will be further updated based on API response
        isPast, // Track if slot is in the past
      });
    }
    }
  }
  return slots;
};

// Check if selected time slots span across midnight
const checkCrossMidnightBooking = (slots: string[]) => {
  if (slots.length === 0) return { spansMidnight: false, beforeMidnight: [], afterMidnight: [] };
  
  const beforeMidnight: string[] = [];
  const afterMidnight: string[] = [];
  
  slots.forEach(slot => {
    const [startTime] = slot.split(' - ');
    const [hours] = startTime.split(':').map(Number);
    
    // Early morning slots (00:00 - 04:59) are considered next-day slots.
    if (hours >= 0 && hours < 5) {
      afterMidnight.push(slot);
    } else {
      // Everything else (5 AM - 12:00 AM) is on the same day
      beforeMidnight.push(slot);
    }
  });
  
  const spansMidnight = beforeMidnight.length > 0 && afterMidnight.length > 0;
  
  return { spansMidnight, beforeMidnight, afterMidnight };
};

const isNextDayEarlySlot = (slot: string) => {
  const [startTime] = slot.split(' - ');
  const [hours] = startTime.split(':').map(Number);
  return hours >= 0 && hours < 5;
};

const resolveBookingDateForSelection = (baseDate: Date, slots: string[]) => {
  const hasSameDaySlots = slots.some((slot) => !isNextDayEarlySlot(slot));
  const hasNextDaySlots = slots.some((slot) => isNextDayEarlySlot(slot));

  // If user selected only next-day early slots, shift booking anchor date to latest day.
  if (!hasSameDaySlots && hasNextDaySlots) {
    const shifted = new Date(baseDate);
    shifted.setDate(shifted.getDate() + 1);
    return shifted;
  }

  // For mixed selections (e.g., 22:00-02:00), keep base date and use cross-midnight split.
  return baseDate;
};

export default function BookSlot() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdminUser = session?.user?.role === 'admin';

  // All useState hooks must be at the top level
  const [selectedSport, setSelectedSport] = useState<SportName | "">("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [selectedNextDayTimeSlots, setSelectedNextDayTimeSlots] = useState<string[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>(""); // Court selection for Shuttle Badminton
  const [timeSlots, setTimeSlots] = useState<Array<{time: string; available: boolean; hours?: number; isPast?: boolean}>>(generateTimeSlots(false, null, "", false));
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [overlapBookedSlots, setOverlapBookedSlots] = useState<string[]>([]);
  const [registeredSlots, setRegisteredSlots] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null); // User data for subscription checking
  const [loading, setLoading] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    eventType: "Corporate Event",
    specialRequirements: ""
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  
  // Enhanced Payment dialog states - HDFC Bank Style
  const [whatsAppShare, setWhatsAppShare] = useState<{
    open: boolean;
    message: string;
    url: string;
  }>({
    open: false,
    message: '',
    url: ''
  });

  // Ref for date-time selection area to enable auto-scroll
  const dateTimeSelectionRef = useRef<HTMLDivElement>(null);
  const [isScrollHighlighted, setIsScrollHighlighted] = useState(false);
  const [isScrollingToDate, setIsScrollingToDate] = useState(false);

  // Function to handle sport selection and auto-scroll to date selection
  const handleSportSelection = (sportName: SportName) => {
    setSelectedSport(sportName);
  };

  // Scroll to date panel after React commits the new sport to DOM
  const prevScrolledSport = useRef('');
  useEffect(() => {
    if (!selectedSport || selectedSport === prevScrolledSport.current) return;
    prevScrolledSport.current = selectedSport;
    setIsScrollingToDate(true);
    setIsScrollHighlighted(true);

    // Double-rAF waits for browser to paint the newly rendered panel before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = dateTimeSelectionRef.current;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Backup: direct window scroll (more reliable on some mobile browsers)
          const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }
        setTimeout(() => {
          setIsScrollHighlighted(false);
          setIsScrollingToDate(false);
        }, 2000);
      });
    });
  }, [selectedSport]);
  const [upiPayment, setUpiPayment] = useState<{ bookingId: string; amount: number; note: string } | null>(null);
  const { settings } = useSiteSettings();

  // Ball extras state
  const [ballCount, setBallCount] = useState(0);
  const BALL_PRICE = settings.extras.find((e) => e.key === 'ball')?.price ?? 0;
  const [editableAmount, setEditableAmount] = useState<number | null>(null);

  const allSelectedSlots = useMemo(
    () => [...selectedTimeSlots, ...selectedNextDayTimeSlots],
    [selectedTimeSlots, selectedNextDayTimeSlots]
  );

  const bookingBreakdown = useMemo(() => {
    if (!selectedDate) {
      return {
        spansTwoDays: false,
        primaryDate: null as Date | null,
        primarySlots: [] as string[],
        secondaryDate: null as Date | null,
        secondarySlots: [] as string[],
      };
    }

    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    if (selectedTimeSlots.length === 0 && selectedNextDayTimeSlots.length > 0) {
      return {
        spansTwoDays: false,
        primaryDate: nextDay,
        primarySlots: selectedNextDayTimeSlots,
        secondaryDate: null,
        secondarySlots: [],
      };
    }

    if (selectedTimeSlots.length > 0 && selectedNextDayTimeSlots.length > 0) {
      return {
        spansTwoDays: true,
        primaryDate: selectedDate,
        primarySlots: selectedTimeSlots,
        secondaryDate: nextDay,
        secondarySlots: selectedNextDayTimeSlots,
      };
    }

    return {
      spansTwoDays: false,
      primaryDate: selectedDate,
      primarySlots: selectedTimeSlots,
      secondaryDate: null,
      secondarySlots: [],
    };
  }, [selectedDate, selectedTimeSlots, selectedNextDayTimeSlots]);

  // Players, for courts priced per person (cricket nets)
  const selectedCourtPrice = selectedSport ? getCourt(settings, selectedSport) : undefined;
  const [people, setPeople] = useState(2);
  useEffect(() => {
    if (selectedCourtPrice?.perPerson) setPeople(selectedCourtPrice.minPeople || 1);
  }, [selectedSport]); // eslint-disable-line react-hooks/exhaustive-deps

  // Price from the owner's settings (server recalculates the same way)
  const priceDetails = useMemo(() => {
    if (!selectedSport || !bookingBreakdown.primaryDate || allSelectedSlots.length === 0) return null;
    return calculateBookingPrice(settings, {
      sport: selectedSport,
      date: format(bookingBreakdown.primaryDate, 'yyyy-MM-dd'),
      slots: allSelectedSlots,
      people,
    });
  }, [selectedSport, bookingBreakdown.primaryDate, allSelectedSlots, settings, people]);
  const baseSlotPrice = priceDetails ? priceDetails.slotTotal : null;

  // Booking rules shown before the customer proceeds (admins may override)
  const ruleError = useMemo(() => {
    if (isAdminUser || !selectedSport || !bookingBreakdown.primaryDate || allSelectedSlots.length === 0) return null;
    if ((selectedSport === "Cricket" || selectedSport === "Football") && allSelectedSlots.length < 2) {
      return `Minimum 1 hour (2 slots) required for ${selectedSport}`;
    }
    return bookingRuleError(settings, {
      sport: selectedSport,
      date: format(bookingBreakdown.primaryDate, 'yyyy-MM-dd'),
      slots: allSelectedSlots,
      people,
    });
  }, [isAdminUser, selectedSport, bookingBreakdown.primaryDate, allSelectedSlots, settings, people]);

  // Total price = slot price + ball extras (or manual override)
  const totalPrice = useMemo(() => {
    if (editableAmount !== null) return editableAmount + ballCount * BALL_PRICE;
    if (baseSlotPrice === null) return null;
    return baseSlotPrice + ballCount * BALL_PRICE;
  }, [baseSlotPrice, ballCount, editableAmount]);

  // Authentication check - Optional for guests
  // Removed redirect so guests can book without login
  // useEffect(() => {
  //   if (status !== 'loading' && !session) {
  //     router.push(`/auth/login?callbackUrl=${encodeURIComponent('/bookslot')}`);
  //   }
  // }, [session, status, router]);

  // Auto-fill customer information for authenticated users
  useEffect(() => {
    if (session?.user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: session.user.name || prev.name,
        email: session.user.email || prev.email,
        phone: session.user.mobile || prev.phone,
      }));
    }
  }, [session]);

  // Load customer details from localStorage if available
  useEffect(() => {
    const loadSavedCustomerDetails = () => {
      try {
        const saved = localStorage.getItem('sathiyanSportsCustomers');
        if (saved) {
          const customers = JSON.parse(saved);
          return customers;
        }
      } catch (error) {
        console.log('Could not load saved customers:', error);
      }
      return {};
    };

    // Make it available globally for phone number lookup
    (window as any).savedCustomers = loadSavedCustomerDetails();
  }, []);

  // Save customer details to localStorage when they complete a booking
  const saveCustomerDetails = (customerData: { name: string; email: string; phone: string }) => {
    try {
      const saved = localStorage.getItem('sathiyanSportsCustomers');
      let customers = saved ? JSON.parse(saved) : {};
      
      // Save by phone number as unique key
      if (customerData.phone) {
        customers[customerData.phone] = {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          lastUsed: new Date().toISOString()
        };
        
        localStorage.setItem('sathiyanSportsCustomers', JSON.stringify(customers));
      }
    } catch (error) {
      console.log('Could not save customer details:', error);
    }
  };

  // Load customer details when phone number is entered in the form
  const handlePhoneChange = (phone: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      phone
    }));

    // Try to load saved details for this phone number
    if (phone && phone.length >= 10) {
      try {
        const saved = localStorage.getItem('sathiyanSportsCustomers');
        if (saved) {
          const customers = JSON.parse(saved);
          if (customers[phone]) {
            // Pre-populate the form with saved details
            setCustomerInfo(prev => ({
              ...prev,
              name: customers[phone].name || prev.name,
              email: customers[phone].email || prev.email,
              phone: customers[phone].phone || prev.phone,
            }));
            
            // Show a notification that details were loaded
            setAlert({
              type: 'info',
              message: `Welcome back! Your details have been pre-filled.`
            });
          }
        }
      } catch (error) {
        console.log('Could not load saved customer details:', error);
      }
    }
  };

  // Fetch current user data for subscription checking
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user);
          }
        } catch (error) {
          console.log('Could not fetch user data:', error);
          // Non-critical error, don't show alert
        }
      }
    };

    fetchCurrentUser();
  }, [session]);

  // Re-populate customer info when booking dialog opens
  useEffect(() => {
    if (bookingDialogOpen) {
      // Refresh customer info from session and saved data
      if (session?.user) {
        setCustomerInfo(prev => ({
          ...prev,
          name: prev.name || session.user.name || '',
          email: prev.email || session.user.email || '',
          phone: prev.phone || session.user.mobile || '',
        }));
      }
      
      // Ensure form is ready for input
      // If customer info is empty, keep it empty for user to fill in
      if (!customerInfo.name && !customerInfo.phone && !session?.user) {
        setCustomerInfo({
          name: '',
          email: '',
          phone: '',
          eventType: 'Corporate Event',
          specialRequirements: ''
        });
      }
    }
  }, [bookingDialogOpen, session?.user?.name, session?.user?.email, session?.user?.mobile]);

  // Fetch booked slots when sport, date, or court change
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (selectedSport && selectedDate) {
        // For Shuttle Badminton, wait for court selection
        if (selectedSport === "Shuttle Badminton" && !selectedCourt) {
          return;
        }

        setLoading(true);
        try {
          // Build API URL with court parameter for Shuttle Badminton
          const selectedDateParam = format(selectedDate, 'yyyy-MM-dd');
          let apiUrl = `/api/bookings?sport=${encodeURIComponent(selectedSport)}&date=${selectedDateParam}`;
          if (selectedSport === "Shuttle Badminton" && selectedCourt) {
            apiUrl += `&court=${selectedCourt}`;
          }

          const response = await fetch(apiUrl);
          const data = await response.json();
          
          if (data.success) {
            // For Shuttle Badminton with court selection, use court-specific data
            if (selectedSport === "Shuttle Badminton" && selectedCourt && data.courtBookings) {
              const courtSpecificSlots = data.courtBookings[selectedCourt] || [];
              setBookedSlots(courtSpecificSlots);
              setOverlapBookedSlots(data.nextDayCourtBookings?.[selectedCourt] || []);
              setRegisteredSlots(data.registeredSlots?.[selectedCourt] || []);
              
              // Update time slots availability for specific court with past time filtering
              // Since we're in Shuttle Badminton block, isEvent is always false
              const updatedSlots = generateTimeSlots(false, selectedDate, selectedSport, isAdminUser).map(slot => ({
                ...slot,
                available: slot.available && !courtSpecificSlots.includes(slot.time)
              }));
              setTimeSlots(updatedSlots);
            } else {
              // For other sports or general booking data
              setBookedSlots(data.bookedSlots || []);
              setOverlapBookedSlots(data.nextDayEarlyBookedSlots || []);
              setRegisteredSlots(data.registeredSlots || []);
              const isEvent = selectedSport === "Functions and Events";
              const updatedSlots = generateTimeSlots(isEvent, selectedDate, selectedSport, isAdminUser).map(slot => ({
                ...slot,
                available: slot.available && !(data.bookedSlots || []).includes(slot.time)
              }));
              setTimeSlots(updatedSlots);
            }
          }
        } catch (error) {
          console.error("Error fetching booked slots:", error);
          setAlert({ type: 'error', message: 'Failed to fetch available slots' });
        }
        setLoading(false);
      }
    };

    fetchBookedSlots();
  }, [selectedSport, selectedDate, selectedCourt]);

  // Reset selected slots and court when sport or date changes and update time slots
  useEffect(() => {
    setSelectedTimeSlots([]);
    setSelectedNextDayTimeSlots([]);
    setOverlapBookedSlots([]);
    
    // Reset court selection when sport changes
    if (selectedSport !== "Shuttle Badminton") {
      setSelectedCourt("");
    }
    
    if (selectedSport) {
      const isEvent = selectedSport === "Functions and Events";
      setTimeSlots(generateTimeSlots(isEvent, selectedDate, selectedSport, isAdminUser));
    }
  }, [selectedSport, selectedDate, isAdminUser]);

  // Show loading while checking authentication (optional for guests)
  // Removed authentication requirement - guests can book without login
  // if (status === 'loading') {
  //   return (
  //     <Container sx={{ 
  //       display: 'flex', 
  //       justifyContent: 'center', 
  //       alignItems: 'center', 
  //       minHeight: '50vh',
  //       py: 4 
  //     }}>
  //       <CircularProgress />
  //       <Typography variant="h6" sx={{ ml: 2 }}>
  //         Checking authentication...
  //       </Typography>
  //     </Container>
  //   );
  // }

  // Guests can book without authentication
  // if (!session) {
  //   return null;
  // }

  // Copy to clipboard functionality
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setAlert({ type: 'success', message });
    }).catch(() => {
      setAlert({ type: 'error', message: 'Failed to copy to clipboard' });
    });
  };

  // Handle time slot selection/deselection
  const isBallSport = (sport: string) => sport === "Cricket" || sport === "Football";

  const handleTimeSlotToggle = (time: string, source: 'same-day' | 'next-day-overlap' = 'same-day') => {
    const setter = source === 'next-day-overlap' ? setSelectedNextDayTimeSlots : setSelectedTimeSlots;
    const otherSlots = source === 'next-day-overlap' ? selectedTimeSlots : selectedNextDayTimeSlots;

    setter((prev) => {
      const exists = prev.includes(time);

      // Adding a slot should always work; minimum rule is enforced on submit.
      if (!exists) {
        return [...prev, time];
      }

      // Only block deselection when it would leave exactly 1 slot for ball sports.
      const candidate = prev.filter((t) => t !== time);
      const totalSelectedAfterRemove = candidate.length + otherSlots.length;
      if (!isAdminUser && isBallSport(selectedSport) && totalSelectedAfterRemove === 1) {
        setAlert({ type: 'info', message: 'Minimum 1 hour (2 slots) required for ' + selectedSport + '. Please select at least 2 slots.' });
        return prev;
      }

      return candidate;
    });
  };

  // Handle booking submission - Open simplified payment dialog
  const handleBooking = async () => {
    // Email is optional since we're only using WhatsApp notifications
    if (!selectedSport || !selectedDate || allSelectedSlots.length === 0 || !customerInfo.name || !customerInfo.phone) {
      setAlert({ type: 'error', message: 'Please fill all required fields (Name and Phone are mandatory)' });
      return;
    }

    if (selectedSport === "Shuttle Badminton" && !selectedCourt) {
      setAlert({ type: 'error', message: 'Please select a court for Shuttle Badminton booking' });
      return;
    }

    if (ruleError) {
      setAlert({ type: 'error', message: ruleError });
      return;
    }

    if (!bookingBreakdown.primaryDate || bookingBreakdown.primarySlots.length === 0) {
      setAlert({ type: 'error', message: 'Please select at least one valid slot' });
      return;
    }

    saveCustomerDetails(customerInfo);

    const bookingData: any = {
      sport: selectedSport,
      date: format(bookingBreakdown.primaryDate, 'yyyy-MM-dd'),
      timeSlots: bookingBreakdown.primarySlots,
      court: selectedSport === "Shuttle Badminton" ? selectedCourt : null,
      customerInfo,
      extras: ballCount > 0 ? { ball: ballCount } : undefined,
      people: selectedCourtPrice?.perPerson ? people : undefined,
      // Only honoured for admins (manual override); customers are priced by the server
      totalPrice: isAdminUser ? totalPrice : undefined,
    };

    if (bookingBreakdown.secondaryDate && bookingBreakdown.secondarySlots.length > 0) {
      bookingData.nextDayDate = format(bookingBreakdown.secondaryDate, 'yyyy-MM-dd');
      bookingData.nextDayTimeSlots = bookingBreakdown.secondarySlots;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/bookings/simple-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      const result = await response.json();

      if (!result.success) {
        setAlert({ type: 'error', message: result.message || 'Booking failed' });
        return;
      }

      const booking = result.booking;
      const amount = Number(booking.totalAmount || 0);
      const dateText = format(bookingBreakdown.primaryDate, 'd MMM yyyy (EEEE)');
      const timeText = bookingBreakdown.primarySlots.join(', ');
      const slotText = bookingData.court
        ? `${selectedSport} (${bookingData.court})`
        : `${selectedSport}${isBallSport(selectedSport) ? ' (Full Ground)' : ''}`;

      const bookingMessage = `Dear ${customerInfo.name || 'Customer'},\n\nYour booking request has been received.\n\n*Booking Details*\n\n• Booking ID: *${booking.bookingReference}*\n• Venue: *Sathiyan Multisport Sport Club*\n• Slot: *${slotText}*\n• Date: *${dateText}*\n• Time: *${timeText}*\n\n• Amount: *₹${amount}*\n\nThank you for booking with us!\n\n${SITE_HOST}\n\nBest regards,\nSathiyan Multisport Sport Club`;

      setWhatsAppShare({
        open: isAdminUser, // admins share immediately; customers see it after paying
        message: bookingMessage,
        url: `https://wa.me/?text=${encodeURIComponent(bookingMessage)}`
      });

      setAlert({
        type: 'success',
        message: isAdminUser
          ? `✅ Booking confirmed! Ref: ${booking.bookingReference}`
          : `✅ Booking received! Ref: ${booking.bookingReference}. Pay by UPI to confirm your slot.`
      });

      setBookingDialogOpen(false);
      if (!isAdminUser && amount > 0) {
        setUpiPayment({ bookingId: booking.id, amount, note: `Booking ${booking.bookingReference}` });
      }

      setSelectedSport('');
      setSelectedDate(null);
      setSelectedTimeSlots([]);
      setSelectedNextDayTimeSlots([]);
      setBallCount(0);
      setEditableAmount(null);
      setCustomerInfo({ name: '', email: '', phone: '', eventType: '', specialRequirements: '' });
    } catch (error) {
      console.error('Booking error:', error);
      setAlert({ type: 'error', message: 'Failed to create booking. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="book-slot-main-box">
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          className="booking-alert"
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      )}
      <Container maxWidth="xl" sx={{ height: "100%", py: 2, mt: 8 }}>
        <Box className="book-slot-content-wrapper">
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 800,
              color: "primary.main",
              mb: 4,
            }}
            className="book-slot-title"
          >
            Book Your Slot
          </Typography>
          
          <Box className="book-slot-layout-box">
            {/* Left Side - Sport Selection */}
            <Paper
              elevation={3}
              className="book-slot-container"
            >
              <div className="sport-selection-grid">
                {sports.map((sport) => (
                  <div
                    key={sport.id}
                    className={`sport-card ${
                      selectedSport === sport.name ? "selected" : ""
                    }`}
                    onClick={() => handleSportSelection(sport.name)}
                    style={{ borderColor: sport.color }}
                  >
                    <div className="sport-icon" style={{ fontSize: "2.5rem" }}>
                      {sport.icon}
                    </div>
                    <div className="sport-details">
                      <h3 className="sport-name">{sport.name}</h3>
                      <p className="sport-description">{sport.description}</p>
                      <div className="sport-features">
                        {sport.features.map((feature, index) => (
                          <span key={index} className="feature-tag">
                            {feature}
                          </span>
                        ))}
                      </div>
                      {(() => {
                        const court = getCourt(settings, sport.name);
                        if (!court) return null;
                        const ball = settings.extras.find((e) => e.key === "ball");
                        return (
                          <>
                            <div className="sport-pricing">
                              <span className="price-label">{court.weekend !== court.weekday ? "Weekday:" : "Price:"}</span>
                              <span className="price-amount">{courtPriceLabel(court, "weekday")}</span>
                            </div>
                            {court.weekend !== court.weekday && (
                              <div className="sport-pricing">
                                <span className="price-label">Fri–Sun & holidays:</span>
                                <span className="price-amount">{courtPriceLabel(court, "weekend")}</span>
                              </div>
                            )}
                            {isBallSport(sport.name) && ball && (
                              <div className="sport-pricing" style={{ color: '#e65100', fontWeight: 600 }}>
                                🏐 {ball.name} optional • ₹{ball.price} each
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </Paper>

            {/* Right Side - Date and Time Selection */}
            {selectedSport && (
              <Paper 
                elevation={3} 
                className="book-slot-container" 
                ref={dateTimeSelectionRef}
                sx={{
                  transition: 'all 0.5s ease',
                  ...(isScrollHighlighted && {
                    boxShadow: '0 0 20px 4px rgba(33, 150, 243, 0.3)',
                    border: '2px solid #2196F3',
                    transform: 'scale(1.02)'
                  })
                }}
              >
                <div className="date-time-selection">
                  {isScrollingToDate && (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        mb: 2, 
                        p: 1, 
                        bgcolor: 'primary.light', 
                        borderRadius: 1,
                        animation: 'pulse 1.5s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%': { opacity: 0.7 },
                          '50%': { opacity: 1 },
                          '100%': { opacity: 0.7 }
                        }
                      }}
                    >
                      <Typography variant="body2" color="primary.contrastText" sx={{ fontWeight: 'bold' }}>
                        📅 Now select your date and time below
                      </Typography>
                    </Box>
                  )}
                  <h3>Select Date and Time</h3>
                  
                  <div className="date-picker-container">
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                      <DatePicker
                        label="Select Date"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        minDate={isAdminUser ? undefined : new Date()}
                        format="dd/MM/yyyy"
                        sx={{ width: "100%" }}
                      />
                    </LocalizationProvider>
                  </div>

                  {/* Court Selection for Shuttle Badminton */}
                  {selectedSport === "Shuttle Badminton" && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        🏸 Select Court
                      </Typography>
                      <Alert 
                        severity="info" 
                        sx={{ 
                          mb: 2,
                          background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%)',
                          border: '1px solid #4caf50'
                        }}
                      >
                        <Typography variant="body2">
                          Choose from our 3 premium shuttle courts (S1, S2, S3). Each court is independent - availability shown is specific to your selected court.
                        </Typography>
                      </Alert>
                      <Grid container spacing={2}>
                        {['S1', 'S2', 'S3'].map((court) => (
                          <Grid item xs={4} key={court}>
                            <Card
                              elevation={selectedCourt === court ? 6 : 2}
                              sx={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                transform: selectedCourt === court ? 'scale(1.05)' : 'scale(1)',
                                background: selectedCourt === court 
                                  ? 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)'
                                  : 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                                color: selectedCourt === court ? 'white' : 'inherit',
                                border: selectedCourt === court ? '2px solid #4caf50' : '1px solid #e0e0e0',
                                '&:hover': {
                                  transform: 'scale(1.03)',
                                  boxShadow: 4
                                }
                              }}
                              onClick={() => setSelectedCourt(court)}
                            >
                              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="h6" fontWeight="bold">
                                  Court {court}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                  Premium Court
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {selectedDate && (selectedSport !== "Shuttle Badminton" || selectedCourt) && (
                    <>
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                          {selectedSport === "Functions and Events" ? "🎉 Available Sessions" : "⏰ Selected Day Slots (00:00 - 23:30)"}
                        </Typography>
                        
                        {selectedSport === "Functions and Events" && (
                          <Alert 
                            severity="info" 
                            sx={{ 
                              mb: 3,
                              background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                              border: '1px solid #9c27b0'
                            }}
                          >
                            <Typography variant="body2" fontWeight="medium">
                              Select your preferred session(s). You can book multiple sessions for longer events.
                            </Typography>
                          </Alert>
                        )}
                        
                        {(() => {
                          const sameDaySlots = selectedSport === "Functions and Events"
                            ? timeSlots
                            : timeSlots;
                          const nextDayEarlySlots = selectedSport === "Functions and Events"
                            ? []
                            : timeSlots.filter((slot) => isNextDayEarlySlot(slot.time));

                          const renderSlotGrid = (
                            slotsToRender: typeof timeSlots,
                            source: 'same-day' | 'next-day-overlap' = 'same-day'
                          ) => (
                            <Grid container spacing={1.5} sx={{ mb: 3 }}>
                              {slotsToRender.map((slot, index) => {
                                const isSelected = source === 'next-day-overlap'
                                  ? selectedNextDayTimeSlots.includes(slot.time)
                                  : selectedTimeSlots.includes(slot.time);
                                const isPastSlot = slot.isPast || false;
                                const sourceBooked = source === 'next-day-overlap'
                                  ? overlapBookedSlots.includes(slot.time)
                                  : bookedSlots.includes(slot.time);
                                const ruleBlocked = !slot.available && !isPastSlot && !bookedSlots.includes(slot.time);
                                const isBooked = sourceBooked || ruleBlocked;
                                const isRegistered = registeredSlots.includes(slot.time);

                                // Check if user is yearly Shuttle Badminton subscriber who should be blocked from registered slots
                                const isYearlyBadmintonUser = currentUser?.preferredSport === "Shuttle Badminton" &&
                                                             currentUser?.subscriptionType === "yearly";
                                const isBlockedRegisteredSlot = isRegistered && isYearlyBadmintonUser;
                                const isClickable = !isBooked && !isPastSlot && !isBlockedRegisteredSlot;

                                return (
                                  <Grid item xs={6} sm={4} md={3} lg={2.4} key={`${slot.time}-${index}`}>
                                    <Card
                                      elevation={isSelected ? 6 : (isBooked || isBlockedRegisteredSlot) ? 1 : 2}
                                      sx={{
                                        cursor: isClickable ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s ease-in-out',
                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                        height: '48px',
                                        borderRadius: '8px',
                                        background: isSelected
                                          ? 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                                          : isPastSlot
                                            ? 'linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)' // Gray for past slots
                                            : isBlockedRegisteredSlot
                                              ? 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)' // Pink/Purple for blocked registered
                                              : isRegistered
                                                ? 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)' // Orange for registered but not blocked
                                                : isBooked
                                                  ? 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)' // Red for booked
                                                  : 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)', // Green for available
                                        '&:hover': isClickable ? {
                                          transform: isSelected ? 'scale(1.02)' : 'scale(1.01)',
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        } : {},
                                        border: isSelected ? '2px solid #fff' : 'none',
                                      }}
                                      onClick={() => isClickable && handleTimeSlotToggle(slot.time, source)}
                                    >
                                      <CardContent sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        p: 1,
                                        height: '100%',
                                        '&:last-child': { pb: 1 }
                                      }}>
                                        {/* Status Icon */}
                                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                          {isSelected ? (
                                            <CheckCircle sx={{ fontSize: 14, color: 'white' }} />
                                          ) : isPastSlot ? (
                                            <Typography sx={{ fontSize: '10px' }}>⏰</Typography>
                                          ) : isBlockedRegisteredSlot ? (
                                            <Typography sx={{ fontSize: '10px' }}>🚫</Typography>
                                          ) : isRegistered ? (
                                            <Typography sx={{ fontSize: '10px' }}>👑</Typography>
                                          ) : isBooked ? (
                                            <Typography sx={{ fontSize: '10px' }}>🔒</Typography>
                                          ) : (
                                            <Typography sx={{ fontSize: '10px' }}>✨</Typography>
                                          )}
                                        </Box>

                                        {/* Time Display - single line */}
                                        <Typography
                                          variant="body2"
                                          fontWeight="bold"
                                          sx={{
                                            fontSize: '0.75rem',
                                            lineHeight: 1,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          {selectedSport === "Functions and Events"
                                            ? `${slot.time.split(' ')[0]} ${slot.time.split(' ')[1]} (${slot.hours}h)`
                                            : slot.time
                                          }
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          );

                          return (
                            <>
                              {renderSlotGrid(sameDaySlots, 'same-day')}

                              {nextDayEarlySlots.length > 0 && (
                                <>
                                  <Alert
                                    severity="info"
                                    sx={{ mb: 2 }}
                                  >
                                    <Typography variant="body2" fontWeight="medium">
                                      🌙 Next Day Overlap Slots (00:00 - 05:00)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Use this section to book next-calendar-day early slots from the previous-day screen.
                                    </Typography>
                                  </Alert>
                                  {renderSlotGrid(nextDayEarlySlots, 'next-day-overlap')}
                                </>
                              )}
                            </>
                          );
                        })()}

                        {/* Legend - compact */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ 
                              width: 12, 
                              height: 12, 
                              background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)', 
                              borderRadius: '50%' 
                            }} />
                            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">Available</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ 
                              width: 12, 
                              height: 12, 
                              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', 
                              borderRadius: '50%' 
                            }} />
                            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">Selected</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ 
                              width: 12, 
                              height: 12, 
                              background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)', 
                              borderRadius: '50%' 
                            }} />
                            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">Reserved</Typography>
                          </Box>
                          {currentUser?.preferredSport === "Shuttle Badminton" && 
                           currentUser?.subscriptionType === "yearly" && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ 
                                width: 12, 
                                height: 12, 
                                background: 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)', 
                                borderRadius: '50%' 
                              }} />
                              <Typography variant="caption" color="text.secondary" fontSize="0.7rem">Blocked</Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ 
                              width: 12, 
                              height: 12, 
                              background: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)', 
                              borderRadius: '50%' 
                            }} />
                            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">Booked</Typography>
                          </Box>
                        </Box>
                      </Box>

                      {allSelectedSlots.length > 0 && (
                        <div className="booking-summary">
                          <h4>Booking Summary</h4>
                          <div className="summary-details">
                            <p><strong>Sport:</strong> {selectedSport}</p>
                            {selectedSport === "Shuttle Badminton" && selectedCourt && (
                              <p><strong>Court:</strong> {selectedCourt}</p>
                            )}
                            {(() => {
                              if (bookingBreakdown.secondaryDate && bookingBreakdown.secondarySlots.length > 0) {
                                return (
                                  <>
                                    <p><strong>📅 Booking Spans Two Days:</strong></p>
                                    <p style={{ marginLeft: '16px', color: '#1976d2', fontWeight: '500' }}>
                                      • {format(bookingBreakdown.primaryDate!, "dd MMM yyyy")}: {bookingBreakdown.primarySlots.length} slot(s)
                                    </p>
                                    <p style={{ marginLeft: '16px', color: '#1976d2', fontWeight: '500' }}>
                                      • {format(bookingBreakdown.secondaryDate, "dd MMM yyyy")}: {bookingBreakdown.secondarySlots.length} slot(s) (Early morning)
                                    </p>
                                  </>
                                );
                              } else {
                                return bookingBreakdown.primaryDate
                                  ? <p><strong>Date:</strong> {format(bookingBreakdown.primaryDate, "dd MMM yyyy")}</p>
                                  : null;
                              }
                            })()}
                            <p><strong>Selected Time{allSelectedSlots.length > 1 ? 's' : ''}:</strong></p>
                            <ul>
                              {bookingBreakdown.primarySlots.map((slot, index) => (
                                <li key={index}>{slot}</li>
                              ))}
                              {bookingBreakdown.secondarySlots.map((slot, index) => (
                                <li key={`next-${index}`}>{slot} (Next Day)</li>
                              ))}
                            </ul>
                            {selectedSport === "Functions and Events" && (
                              <p><strong>Total Hours:</strong> {allSelectedSlots.reduce((acc, timeSlot) => {
                                const slot = timeSlots.find(s => s.time === timeSlot);
                                return acc + (slot?.hours || 1);
                              }, 0)} hours</p>
                            )}
                            <p className="total-amount"><strong>Total Amount: ₹{totalPrice?.toLocaleString()}</strong></p>
                            {priceDetails?.holiday && (
                              <p style={{ color: '#2e7d32', fontSize: '13px', marginTop: '6px' }}>🎉 {priceDetails.holiday} — weekend price applies</p>
                            )}
                            {ruleError && (
                              <p style={{ color: '#ff9800', fontSize: '13px', marginTop: '6px' }}>⚠️ {ruleError}</p>
                            )}
                          </div>
                          <Button
                            variant="contained"
                            color="primary"
                            className="proceed-button"
                            onClick={() => {
                              if (ruleError) {
                                setAlert({ type: 'error', message: ruleError });
                                return;
                              }
                              setEditableAmount(null);
                              setBallCount(0);
                              setBookingDialogOpen(true);
                            }}
                          >
                            Proceed to Book
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Paper>
            )}
          </Box>
        </Box>
      </Container>

      {/* Booking Confirmation Dialog */}
      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Confirm Your Booking</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Customer Information */}
            <Typography variant="h6" gutterBottom>Customer Information</Typography>
            <TextField
              label="Full Name"
              fullWidth
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              required
            />
            <TextField
              label="Email (Optional)"
              type="email"
              fullWidth
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              helperText="Email notifications are disabled. Only WhatsApp notifications will be sent."
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={customerInfo.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              helperText="We'll pre-fill your details if you've booked with us before"
              required
            />

            {/* Functions and Events specific fields */}
            {selectedSport === "Functions and Events" && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Event Details</Typography>
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={customerInfo.eventType}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, eventType: e.target.value })}
                    label="Event Type"
                  >
                    <MenuItem value="Corporate Event">Corporate Event</MenuItem>
                    <MenuItem value="Wedding">Wedding</MenuItem>
                    <MenuItem value="Birthday Party">Birthday Party</MenuItem>
                    <MenuItem value="Conference">Conference</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Special Requirements"
                  multiline
                  rows={3}
                  fullWidth
                  value={customerInfo.specialRequirements}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, specialRequirements: e.target.value })}
                  placeholder="Any special arrangements, decorations, catering preferences, etc."
                />
              </>
            )}

            {/* Booking Summary */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Booking Summary</Typography>
              <Typography variant="body2">Sport: {selectedSport}</Typography>
              {selectedSport === "Shuttle Badminton" && selectedCourt && (
                <Typography variant="body2">Court: {selectedCourt}</Typography>
              )}
              {(() => {
                if (!selectedDate) return null;

                if (bookingBreakdown.secondaryDate && bookingBreakdown.secondarySlots.length > 0) {
                  return (
                    <>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Primary Date: {format(bookingBreakdown.primaryDate!, "dd MMM yyyy")}</Typography>
                      <Typography variant="body2" color="text.secondary">Primary Slots: {bookingBreakdown.primarySlots.join(', ') || '-'}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>Secondary Date: {format(bookingBreakdown.secondaryDate, "dd MMM yyyy")}</Typography>
                      <Typography variant="body2" color="text.secondary">Secondary Slots: {bookingBreakdown.secondarySlots.join(', ') || '-'}</Typography>
                    </>
                  );
                }

                return bookingBreakdown.primaryDate
                  ? <Typography variant="body2">Date: {format(bookingBreakdown.primaryDate, "dd MMM yyyy")}</Typography>
                  : null;
              })()}
              <Typography variant="body2">Time: {allSelectedSlots.join(", ")}</Typography>
              {selectedSport === "Functions and Events" && (
                <>
                  <Typography variant="body2">Event Type: {customerInfo.eventType}</Typography>
                  <Typography variant="body2">
                    Total Hours: {allSelectedSlots.reduce((acc, timeSlot) => {
                      const slot = timeSlots.find(s => s.time === timeSlot);
                      return acc + (slot?.hours || 1);
                    }, 0)} hours
                  </Typography>
                </>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>Slot charges: ₹{baseSlotPrice?.toLocaleString()}</Typography>

              {/* Players for per-person courts (cricket nets) */}
              {selectedCourtPrice?.perPerson && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#e0f2f1', borderRadius: 1, border: '1px solid #00897b' }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                    👥 How many players? (₹{selectedCourtPrice.weekday} per person per hour, minimum {selectedCourtPrice.minPeople || 1})
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button size="small" variant="outlined" onClick={() => setPeople(p => Math.max(selectedCourtPrice.minPeople || 1, p - 1))} sx={{ minWidth: 32, px: 0 }}>−</Button>
                    <Typography variant="body1" fontWeight="bold">{people}</Typography>
                    <Button size="small" variant="outlined" onClick={() => setPeople(p => Math.min(selectedCourtPrice.maxPeople || 12, p + 1))} sx={{ minWidth: 32, px: 0 }}>+</Button>
                    <Typography variant="body2" color="text.secondary">player{people !== 1 ? 's' : ''}</Typography>
                  </Box>
                </Box>
              )}

              {/* Ball extras for Cricket & Football */}
              {isBallSport(selectedSport) && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fff8e1', borderRadius: 1, border: '1px solid #ffb300' }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>🏐 Add Ball (Optional, ₹{BALL_PRICE} each)</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button size="small" variant="outlined" onClick={() => setBallCount(c => Math.max(0, c - 1))} sx={{ minWidth: 32, px: 0 }}>−</Button>
                    <Typography variant="body1" fontWeight="bold">{ballCount}</Typography>
                    <Button size="small" variant="outlined" onClick={() => setBallCount(c => c + 1)} sx={{ minWidth: 32, px: 0 }}>+</Button>
                    <Typography variant="body2" color="text.secondary">ball{ballCount !== 1 ? 's' : ''} × ₹{BALL_PRICE} = ₹{ballCount * BALL_PRICE}</Typography>
                  </Box>
                </Box>
              )}

              {/* Admins may override the amount (e.g. negotiated rate) */}
              {isAdminUser ? (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label="Total Amount (₹)"
                  type="number"
                  size="small"
                  value={editableAmount !== null ? editableAmount + ballCount * BALL_PRICE : (totalPrice ?? '')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setEditableAmount(Math.max(0, val - ballCount * BALL_PRICE));
                  }}
                  helperText="Admin override"
                  sx={{ flex: 1 }}
                  inputProps={{ min: 0 }}
                />
              </Box>
              ) : (
                <Typography variant="h6" sx={{ mt: 1.5 }}>Total: ₹{totalPrice?.toLocaleString() ?? '-'}</Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleBooking} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={whatsAppShare.open}
        onClose={() => setWhatsAppShare(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Booking Confirmed - Share on WhatsApp</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
            Copy this message and send it to your mobile WhatsApp.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={10}
            value={whatsAppShare.message}
            InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWhatsAppShare(prev => ({ ...prev, open: false }))}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<ContentCopy />}
            onClick={() => copyToClipboard(whatsAppShare.message, 'WhatsApp message copied')}
          >
            Copy Message
          </Button>
          <Button
            variant="contained"
            onClick={() => window.open(whatsAppShare.url, '_blank')}
          >
            Open WhatsApp
          </Button>
        </DialogActions>
      </Dialog>

      {upiPayment && (
        <UpiPaymentDialog
          open
          kind="booking"
          refId={upiPayment.bookingId}
          amount={upiPayment.amount}
          note={upiPayment.note}
          title="Pay to confirm your slot"
          allowPayLater
          onClose={() => {
            setUpiPayment(null);
            setWhatsAppShare((prev) => ({ ...prev, open: true }));
          }}
        />
      )}
    </Box>
  );
}
