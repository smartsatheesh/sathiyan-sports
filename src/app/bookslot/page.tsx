"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import QRCode from "react-qr-code";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from 'date-fns/locale';
import { format, setHours, setMinutes } from "date-fns";
import {
  CreditCard,
  AccountBalance,
  Payment,
  PhoneAndroid,
  Security,
  CheckCircle,
  ExpandMore,
  ContentCopy,
  Timer,
  Verified,
} from "@mui/icons-material";
import SimplePaymentDialog from "../components/SimplePaymentDialog";

// Custom weekend function that includes Friday, Saturday, and Sunday
const isWeekend = (date: Date): boolean => {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return day === 0 || day === 5 || day === 6; // Sunday, Friday, Saturday
};

// Sports data with proper typing to match selectedSport state
const sports: Array<{
  id: number;
  name: "Cricket" | "Football" | "Shuttle Badminton" | "Functions and Events";
  basePrice: number;
  weekendPrice: number;
  icon: string;
  color: string;
  description: string;
  features: string[];
}> = [
  {
    id: 1,
    name: "Cricket",
    basePrice: 699,
    weekendPrice: 999,
    icon: "🏏",
    color: "#4caf50",
    description: "Professional cricket ground with all facilities",
    features: ["Full-size pitch", "Changing rooms", "Equipment available"]
  },
  {
    id: 2,
    name: "Football",
    basePrice: 699,
    weekendPrice: 999,
    icon: "⚽",
    color: "#2196f3",
    description: "FIFA standard football turf",
    features: ["Professional turf", "Floodlights", "Goal posts included"]
  },
  {
    id: 3,
    name: "Shuttle Badminton",
    basePrice: 299,
    weekendPrice: 399,
    icon: "🏸",
    color: "#ff9800",
    description: "Indoor badminton courts with wooden flooring",
    features: ["3 courts available", "Professional nets", "Rackets available"]
  },
  {
    id: 4,
    name: "Functions and Events",
    basePrice: 2000,
    weekendPrice: 2500,
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
];

// Special session slots for Functions and Events
const eventSessions = [
  { time: "Morning Session (06:00 - 12:00)", hours: 6 },
  { time: "Afternoon Session (12:00 - 18:00)", hours: 6 },
  { time: "Evening Session (18:00 - 24:00)", hours: 6 },
  { time: "Full Day (06:00 - 24:00)", hours: 18 },
  { time: "Custom Hours (Minimum 3 hours)", hours: 3 }
];

// Bank list for Net Banking
const bankList = [
  { code: 'HDFC', name: 'HDFC Bank', popular: true },
  { code: 'ICICI', name: 'ICICI Bank', popular: true },
  { code: 'SBI', name: 'State Bank of India', popular: true },
  { code: 'AXIS', name: 'Axis Bank', popular: true },
  { code: 'KOTAK', name: 'Kotak Mahindra Bank', popular: true },
  { code: 'PNB', name: 'Punjab National Bank', popular: false },
  { code: 'CANARA', name: 'Canara Bank', popular: false },
  { code: 'BOB', name: 'Bank of Baroda', popular: false },
  { code: 'UNION', name: 'Union Bank of India', popular: false },
  { code: 'IDBI', name: 'IDBI Bank', popular: false },
];

// Wallet options
const walletOptions = [
  { code: 'PAYTM', name: 'Paytm Wallet', icon: '💰' },
  { code: 'PHONEPE', name: 'PhonePe Wallet', icon: '📱' },
  { code: 'AMAZON', name: 'Amazon Pay', icon: '🛒' },
  { code: 'MOBIKWIK', name: 'MobiKwik', icon: '💳' },
];

// UPI Apps
const upiApps = [
  { code: 'GPAY', name: 'Google Pay', icon: '🎯' },
  { code: 'PHONEPE', name: 'PhonePe', icon: '💜' },
  { code: 'PAYTM', name: 'Paytm UPI', icon: '💙' },
  { code: 'BHIM', name: 'BHIM UPI', icon: '🇮🇳' },
  { code: 'AMAZONPAY', name: 'Amazon Pay UPI', icon: '🛒' },
  { code: 'WHATSAPP', name: 'WhatsApp Pay', icon: '💚' },
];

// Update the timeSlots generation with past date/time filtering
const generateTimeSlots = (isEvent = false, selectedDate: Date | null = null) => {
  const now = new Date();
  const currentHour = now.getHours();
  const isToday = selectedDate && 
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  if (isEvent) {
    return eventSessions.map(session => {
      let available = true;
      
      // If it's today, check if the session time has passed
      if (isToday) {
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
        available
      };
    });
  }
  
  const slots = [];
  for (let hour = 5; hour <= 24; hour++) {
    // 5:00 to 24:00 (5-6, 6-7, ..., 23-24)
    const startTime = format(
      setHours(setMinutes(new Date(), 0), hour),
      "HH:mm"
    );
    const endTime = format(
      setHours(setMinutes(new Date(), 0), hour + 1),
      "HH:mm"
    );
    const timeString = `${startTime} - ${endTime}`;
    
    // Check if this time slot is in the past for today
    let available = true;
    if (isToday) {
      // Disable slots that have already passed (with 1 hour buffer for booking)
      available = hour > currentHour;
    }
    
    slots.push({
      time: timeString,
      available, // Will be further updated based on API response
    });
  }
  return slots;
};

export default function BookSlot() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // All useState hooks must be at the top level
  const [selectedSport, setSelectedSport] = useState<"Cricket" | "Football" | "Shuttle Badminton" | "Functions and Events" | "">("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>(""); // Court selection for Shuttle Badminton
  const [timeSlots, setTimeSlots] = useState<Array<{time: string; available: boolean; hours?: number}>>(generateTimeSlots(false, null));
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'netbanking' | 'card' | 'wallet' | 'phonepe'>('phonepe');
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing' | 'verification' | 'success'>('method');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState('GPAY');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [paymentTimer, setPaymentTimer] = useState(300); // 5 minutes

  // Ref for date-time selection area to enable auto-scroll
  const dateTimeSelectionRef = useRef<HTMLDivElement>(null);
  const [isScrollHighlighted, setIsScrollHighlighted] = useState(false);
  const [isScrollingToDate, setIsScrollingToDate] = useState(false);

  // Function to handle sport selection and auto-scroll to date selection
  const handleSportSelection = (sportName: "Cricket" | "Football" | "Shuttle Badminton" | "Functions and Events") => {
    setSelectedSport(sportName);
    setIsScrollingToDate(true); // Show loading state
    
    // Auto-scroll to date selection after a brief delay to allow rendering
    setTimeout(() => {
      if (dateTimeSelectionRef.current) {
        // Add highlight animation
        setIsScrollHighlighted(true);
        
        // Enhanced mobile detection - multiple checks for better accuracy
        const isMobile = window.innerWidth <= 768 || 
                         window.innerHeight <= 1024 || 
                         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0;
        
        if (isMobile) {
          // For mobile devices - enhanced scroll behavior
          const element = dateTimeSelectionRef.current;
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          
          // Calculate better scroll position for mobile - account for mobile browsers' varying UI heights
          const viewportHeight = window.innerHeight;
          const headerOffset = 100; // Account for header and some spacing
          const targetPosition = Math.max(0, absoluteElementTop - headerOffset);
          
          // Primary scroll method
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          
          // Enhanced fallback for problematic mobile browsers
          setTimeout(() => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            if (Math.abs(currentScroll - targetPosition) > 100) {
              // Try alternative scroll method
              try {
                element.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                  inline: 'nearest'
                });
              } catch (error) {
                // Final fallback - instant scroll
                window.scrollTo(0, targetPosition);
              }
            }
          }, 800);
          
          // Additional iOS Safari specific fix
          if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            setTimeout(() => {
              window.scrollBy(0, 1); // Force iOS Safari to recognize scroll position
              window.scrollBy(0, -1);
            }, 1200);
          }
          
        } else {
          // For desktop, use standard scrollIntoView
          dateTimeSelectionRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
        
        // Remove highlight after animation
        setTimeout(() => {
          setIsScrollHighlighted(false);
          setIsScrollingToDate(false); // Remove loading state
        }, 2500);
      } else {
        setIsScrollingToDate(false); // Remove loading state if ref not found
      }
    }, 600); // Slightly longer delay for mobile rendering completion
  };
  const [timerActive, setTimerActive] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');

  // Simple Payment Dialog states
  const [simplePaymentOpen, setSimplePaymentOpen] = useState(false);
  const [currentBookingData, setCurrentBookingData] = useState<any>(null);

  // Calculate total price based on sport type and hours/slots - MOVED TO TOP
  const totalPrice = useMemo(() => {
    if (!selectedSport || !selectedDate || selectedTimeSlots.length === 0)
      return null;
    const sport = sports.find((s) => s.name === selectedSport);
    if (!sport) return null;
    
    const pricePerUnit = isWeekend(selectedDate) ? sport.weekendPrice : sport.basePrice;
    
    if (selectedSport === "Functions and Events") {
      // For events, calculate based on hours
      const totalHours = selectedTimeSlots.reduce((acc, timeSlot) => {
        const slot = timeSlots.find(s => s.time === timeSlot);
        return acc + (slot?.hours || 1);
      }, 0);
      return pricePerUnit * totalHours;
    } else {
      // For sports, calculate based on number of slots
      return pricePerUnit * selectedTimeSlots.length;
    }
  }, [selectedSport, selectedDate, selectedTimeSlots, timeSlots]);

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
          let apiUrl = `/api/bookings?sport=${encodeURIComponent(selectedSport)}&date=${selectedDate.toISOString()}`;
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
              setRegisteredSlots(data.registeredSlots?.[selectedCourt] || []);
              
              // Update time slots availability for specific court with past time filtering
              // Since we're in Shuttle Badminton block, isEvent is always false
              const updatedSlots = generateTimeSlots(false, selectedDate).map(slot => ({
                ...slot,
                available: slot.available && !courtSpecificSlots.includes(slot.time)
              }));
              setTimeSlots(updatedSlots);
            } else {
              // For other sports or general booking data
              setBookedSlots(data.bookedSlots || []);
              setRegisteredSlots(data.registeredSlots || []);
              const isEvent = selectedSport === "Functions and Events";
              const updatedSlots = generateTimeSlots(isEvent, selectedDate).map(slot => ({
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
    
    // Reset court selection when sport changes
    if (selectedSport !== "Shuttle Badminton") {
      setSelectedCourt("");
    }
    
    if (selectedSport) {
      const isEvent = selectedSport === "Functions and Events";
      setTimeSlots(generateTimeSlots(isEvent, selectedDate));
    }
  }, [selectedSport, selectedDate]);

  // Payment timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && paymentTimer > 0) {
      interval = setInterval(() => {
        setPaymentTimer((prev) => prev - 1);
      }, 1000);
    } else if (paymentTimer === 0) {
      // Timer expired
      setPaymentDialogOpen(false);
      setTimerActive(false);
      setAlert({ type: 'error', message: 'Payment time expired. Please try again.' });
    }
    return () => clearInterval(interval);
  }, [timerActive, paymentTimer]);

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

  // Generate payment reference number
  const generatePaymentRef = () => {
    return 'SAS' + Date.now().toString().slice(-8);
  };

  // Utility functions
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateUpiUrl = (amount: number, reference: string) => {
    const upiId = 'smartsatheesh7-1@okhdfcbank';
    const name = 'Smart Satheesh';
    const note = `Booking payment for ${selectedSport} - Ref: ${reference}`;
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  };

  // HDFC Bank style payment processing with Razorpay and PhonePe
  const processPayment = async () => {
    setPaymentProcessing(true);
    setPaymentStep('processing');
    
    // Generate payment reference
    const ref = generatePaymentRef();
    setPaymentReference(ref);
    
    try {
      if (paymentMethod === 'phonepe') {
        // Create PhonePe payment order
        const orderResponse = await fetch('/api/phonepe/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalPrice,
            customerInfo,
            bookingReference: ref
          })
        });

        const orderData = await orderResponse.json();

        if (orderData.success) {
          // Store transaction details for verification
          setCurrentBookingId(orderData.transactionId);
          
          // Redirect to PhonePe payment page
          window.open(orderData.paymentUrl, '_blank');
          
          // Set to verification step and wait for user to complete payment
          setPaymentStep('verification');
          setAlert({ 
            type: 'info', 
            message: 'Complete payment in the new tab and then verify below' 
          });
        } else {
          setAlert({ type: 'error', message: orderData.message || 'Failed to create PhonePe payment' });
          setPaymentStep('method');
        }
      } else if (paymentMethod === 'upi') {
        // Create Razorpay order for real UPI payment
        const orderResponse = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalPrice,
            customerInfo,
            bookingReference: ref
          })
        });

        const orderData = await orderResponse.json();

        if (orderData.success) {
          // Store order details for payment
          setCurrentBookingId(orderData.orderId);
          
          // Initialize Razorpay payment
          const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'Sathiyan Sports',
            description: `${selectedSport} Booking`,
            order_id: orderData.orderId,
            handler: async function (response: any) {
              console.log('Payment successful:', response);
              
              // Verify payment with our backend
              const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingReference: ref
                })
              });

              const verifyData = await verifyResponse.json();

              if (verifyData.success) {
                // Payment verified successfully
                setUpiTransactionId(verifyData.payment.upiTransactionId);
                setPaymentStep('verification');
                setAlert({ 
                  type: 'success', 
                  message: `Payment successful! Transaction ID: ${verifyData.payment.upiTransactionId}` 
                });
                
                // Auto-confirm booking
                setTimeout(() => {
                  handlePaymentConfirmation();
                }, 1000);
              } else {
                setAlert({ type: 'error', message: 'Payment verification failed' });
                setPaymentStep('method');
              }
            },
            prefill: {
              name: customerInfo.name,
              email: customerInfo.email,
              contact: customerInfo.phone
            },
            theme: {
              color: '#1976d2'
            },
            method: {
              upi: true,
              card: false,
              netbanking: false,
              wallet: false
            }
          };

          // Create Razorpay instance and open checkout
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            console.log('Payment failed:', response);
            setAlert({ type: 'error', message: 'Payment failed. Please try again.' });
            setPaymentStep('method');
          });
          
          rzp.open();
          setPaymentStep('verification');
        } else {
          setAlert({ type: 'error', message: orderData.message || 'Failed to create payment order' });
          setPaymentStep('method');
        }
      } else {
        // Other payment methods are coming soon
        setAlert({ 
          type: 'info', 
          message: 'This payment method is coming soon. Please use PhonePe or UPI for now.' 
        });
        setPaymentStep('method');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setAlert({ type: 'error', message: 'Payment processing failed. Please try again.' });
      setPaymentStep('method');
    }
    
    setPaymentProcessing(false);
  };

  // Handle payment confirmation with enhanced verification
  const handlePaymentConfirmation = async () => {
    if (paymentMethod === 'phonepe') {
      // For PhonePe, verify using transaction ID
      if (!currentBookingId) {
        setAlert({ type: 'error', message: 'Transaction ID missing. Please restart payment process.' });
        return;
      }

      setLoading(true);
      try {
        // Verify PhonePe payment
        const verifyResponse = await fetch('/api/phonepe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: currentBookingId,
            bookingReference: paymentReference
          })
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
          // Payment verified successfully
          setUpiTransactionId(verifyData.payment.phonepeTransactionId);
          
          // Create booking in database
          const bookingId = await createBookingInDB();
          if (!bookingId) {
            setLoading(false);
            return;
          }

          // Update booking with payment details
          const updateResponse = await fetch(`/api/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentStatus: 'completed',
              bookingStatus: 'confirmed',
              paymentMethod: 'phonepe',
              upiTransactionId: verifyData.payment.phonepeTransactionId,
              paymentReference: paymentReference,
              phonepeTransactionId: verifyData.payment.transactionId
            })
          });

          const updateData = await updateResponse.json();

          if (updateData.success) {
            setPaymentStep('success');
            setTimerActive(false);
            setAlert({ 
              type: 'success', 
              message: `PhonePe payment successful! Booking confirmed with reference ${paymentReference}` 
            });
            
            // Auto close after 3 seconds
            setTimeout(() => {
              setPaymentDialogOpen(false);
              // Reset form
              setSelectedSport("");
              setSelectedDate(null);
              setSelectedTimeSlots([]);
              setCustomerInfo({ name: "", email: "", phone: "", eventType: "Corporate Event", specialRequirements: "" });
              setUpiTransactionId('');
              setCurrentBookingId(null);
              setPaymentStep('method');
              setPaymentReference('');
            }, 3000);
          } else {
            setAlert({ type: 'error', message: updateData.message || 'Failed to confirm booking' });
          }
        } else {
          setAlert({ type: 'error', message: verifyData.message || 'Payment verification failed' });
        }
      } catch (error) {
        console.error("PhonePe payment verification error:", error);
        setAlert({ type: 'error', message: 'Failed to verify PhonePe payment' });
      }
      setLoading(false);
      return;
    }

    // Original Razorpay/UPI verification logic
    if (!upiTransactionId.trim()) {
      setAlert({ type: 'error', message: 'Please enter transaction ID or reference number' });
      return;
    }

    setLoading(true);
    try {
      // First create the booking in database after payment verification
      const bookingId = await createBookingInDB();
      if (!bookingId) {
        setLoading(false);
        return;
      }

      // Then update the booking with payment details
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'completed',
          bookingStatus: 'confirmed',
          paymentMethod: paymentMethod,
          upiTransactionId: upiTransactionId.trim(),
          paymentReference: paymentReference,
          bankDetails: paymentMethod === 'netbanking' ? selectedBank : null,
          walletDetails: paymentMethod === 'wallet' ? selectedWallet : null,
          upiApp: paymentMethod === 'upi' ? selectedUpiApp : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentBookingId(bookingId);
        setPaymentStep('success');
        setTimerActive(false);
        setAlert({ 
          type: 'success', 
          message: `Payment successful! Booking confirmed with reference ${paymentReference}` 
        });
        
        // Auto close after 3 seconds
        setTimeout(() => {
          setPaymentDialogOpen(false);
          // Reset form
          setSelectedSport("");
          setSelectedDate(null);
          setSelectedTimeSlots([]);
          setCustomerInfo({ name: "", email: "", phone: "", eventType: "Corporate Event", specialRequirements: "" });
          setUpiTransactionId('');
          setCurrentBookingId(null);
          setPaymentStep('method');
          setPaymentReference('');
        }, 3000);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to confirm payment' });
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
      setAlert({ type: 'error', message: 'Failed to confirm payment' });
    }
    setLoading(false);
  };

  // Copy to clipboard functionality
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setAlert({ type: 'success', message });
    }).catch(() => {
      setAlert({ type: 'error', message: 'Failed to copy to clipboard' });
    });
  };

  // Handle time slot selection/deselection
  const handleTimeSlotToggle = (time: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  // Handle booking submission - Open simplified payment dialog
  const handleBooking = async () => {
    // Email is optional since we're only using WhatsApp notifications
    if (!selectedSport || !selectedDate || selectedTimeSlots.length === 0 || !customerInfo.name || !customerInfo.phone) {
      setAlert({ type: 'error', message: 'Please fill all required fields (Name and Phone are mandatory)' });
      return;
    }

    // Validate court selection for Shuttle Badminton
    if (selectedSport === "Shuttle Badminton" && !selectedCourt) {
      setAlert({ type: 'error', message: 'Please select a court for Shuttle Badminton booking' });
      return;
    }

    // Prepare booking data for payment
    const bookingData = {
      sport: selectedSport,
      date: selectedDate,
      timeSlot: selectedTimeSlots.join(', '),
      court: selectedSport === "Shuttle Badminton" ? selectedCourt : null,
      customerInfo,
      totalPrice: totalPrice
    };

    setCurrentBookingData(bookingData);
    setBookingDialogOpen(false);
    setSimplePaymentOpen(true);
  };

  // Handle payment completion from SimplePaymentDialog
  const handlePaymentComplete = async (transactionId: string, paymentMethod: string) => {
    if (!currentBookingData) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/bookings/simple-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentBookingData,
          transactionId,
          paymentMethod,
          paymentReference: `${paymentMethod.toUpperCase()}_${Date.now()}`
        })
      });

      const result = await response.json();

      if (result.success) {
        setAlert({ 
          type: 'success', 
          message: `Booking created successfully! Reference: ${result.booking.bookingReference}. Payment verification in progress.` 
        });
        
        // Reset form
        setSelectedSport('');
        setSelectedDate(null);
        setSelectedTimeSlots([]);
        setCustomerInfo({ name: '', email: '', phone: '', eventType: '', specialRequirements: '' });
        setSimplePaymentOpen(false);
        setCurrentBookingData(null);
      } else {
        setAlert({ type: 'error', message: result.message || 'Booking failed' });
      }
    } catch (error) {
      console.error('Booking error:', error);
      setAlert({ type: 'error', message: 'Failed to create booking. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Create booking in database after payment is initiated
  const createBookingInDB = async () => {
    setLoading(true);
    try {
      const sport = sports.find((s) => s.name === selectedSport);
      const pricePerSlot = isWeekend(selectedDate!) ? sport!.weekendPrice : sport!.basePrice;
      
      const paymentExpiry = new Date();
      paymentExpiry.setMinutes(paymentExpiry.getMinutes() + 5);
      
      const bookingData: any = {
        sport: selectedSport,
        date: selectedDate!.toISOString(),
        timeSlots: selectedTimeSlots,
        totalAmount: totalPrice,
        pricePerSlot,
        isWeekend: isWeekend(selectedDate!),
        userId: session?.user?.id, // Add user reference for authenticated bookings
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        paymentExpiry: paymentExpiry.toISOString(),
        paymentStatus: "pending",
        bookingStatus: "pending"
      };

      // Add Functions and Events specific fields
      if (selectedSport === "Functions and Events") {
        const totalHours = selectedTimeSlots.reduce((acc, timeSlot) => {
          const slot = timeSlots.find(s => s.time === timeSlot);
          return acc + (slot?.hours || 1);
        }, 0);
        
        bookingData.totalHours = totalHours;
        bookingData.eventType = customerInfo.eventType;
        if (customerInfo.specialRequirements) {
          bookingData.specialRequirements = customerInfo.specialRequirements;
        }
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentBookingId(data.bookingId);
        return data.bookingId;
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to create booking' });
        return null;
      }
    } catch (error) {
      console.error("Booking error:", error);
      setAlert({ type: 'error', message: 'Failed to create booking' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Payment Step Components
  const PaymentMethodSelection = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Security color="primary" />
        Secure Payment Options
      </Typography>
      
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={6} md={2.4}>
          <Card 
            variant={paymentMethod === 'phonepe' ? 'elevation' : 'outlined'}
            sx={{ 
              cursor: 'pointer', 
              border: paymentMethod === 'phonepe' ? '2px solid' : 'none',
              borderColor: paymentMethod === 'phonepe' ? 'primary.main' : 'transparent'
            }}
            onClick={() => setPaymentMethod('phonepe')}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography sx={{ fontSize: '2rem', mb: 1 }}>💜</Typography>
              <Typography variant="subtitle2">PhonePe</Typography>
              <Typography variant="caption" color="success.main" fontWeight="bold">100% FREE</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2.4}>
          <Card 
            variant={paymentMethod === 'upi' ? 'elevation' : 'outlined'}
            sx={{ 
              cursor: 'pointer', 
              border: paymentMethod === 'upi' ? '2px solid' : 'none',
              borderColor: paymentMethod === 'upi' ? 'primary.main' : 'transparent'
            }}
            onClick={() => setPaymentMethod('upi')}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <PhoneAndroid color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle2">UPI</Typography>
              <Typography variant="caption" color="text.secondary">Instant & Secure</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={2.4}>
          <Card 
            variant="outlined"
            sx={{ 
              cursor: 'not-allowed', 
              opacity: 0.6,
              position: 'relative'
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2, position: 'relative' }}>
              <AccountBalance color="disabled" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle2" color="text.disabled">Net Banking</Typography>
              <Typography variant="caption" color="text.disabled">All Major Banks</Typography>
              <Box sx={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'primary.main',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 'bold'
              }}>
                COMING SOON
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={2.4}>
          <Card 
            variant="outlined"
            sx={{ 
              cursor: 'not-allowed', 
              opacity: 0.6,
              position: 'relative'
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2, position: 'relative' }}>
              <CreditCard color="disabled" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle2" color="text.disabled">Debit/Credit Card</Typography>
              <Typography variant="caption" color="text.disabled">Visa, MasterCard</Typography>
              <Box sx={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'primary.main',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 'bold'
              }}>
                COMING SOON
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={2.4}>
          <Card 
            variant="outlined"
            sx={{ 
              cursor: 'not-allowed', 
              opacity: 0.6,
              position: 'relative'
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2, position: 'relative' }}>
              <Payment color="disabled" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle2" color="text.disabled">Wallets</Typography>
              <Typography variant="caption" color="text.disabled">Paytm, PhonePe</Typography>
              <Box sx={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'primary.main',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 'bold'
              }}>
                COMING SOON
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* PhonePe Information */}
      {paymentMethod === 'phonepe' && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              🎉 PhonePe for Business - 100% FREE
            </Typography>
            <Typography variant="body2">
              • Zero transaction fees for small businesses<br/>
              • Direct UPI payments through PhonePe, GPay, Paytm<br/>
              • Instant payment confirmation<br/>
              • No monthly charges or setup fees
            </Typography>
          </Alert>
          
          <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Ready to Pay with PhonePe</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click "Pay" to redirect to PhonePe secure payment page
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              {upiApps.slice(0, 4).map((app) => (
                <Chip 
                  key={app.code}
                  label={app.icon + ' ' + app.name}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Method-specific options */}
      {paymentMethod === 'upi' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Select UPI App</Typography>
          <Grid container spacing={1}>
            {upiApps.map((app) => (
              <Grid item xs={6} md={2} key={app.code}>
                <Card 
                  variant={selectedUpiApp === app.code ? 'elevation' : 'outlined'}
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedUpiApp === app.code ? '2px solid' : 'none',
                    borderColor: selectedUpiApp === app.code ? 'primary.main' : 'transparent'
                  }}
                  onClick={() => setSelectedUpiApp(app.code)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>{app.icon}</Typography>
                    <Typography variant="caption">{app.name}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* QR Code Preview - Show immediately when UPI is selected */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="h6" gutterBottom>Pay via UPI - Quick Preview</Typography>
            <Paper elevation={3} sx={{ p: 2, display: 'inline-block', mb: 2, bgcolor: 'white' }}>
              <Typography variant="subtitle2" gutterBottom color="text.primary">
                QR Code will be generated for payment
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2, minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {totalPrice ? (
                  <QRCode 
                    value={`upi://pay?pa=smartsatheesh7-1@okhdfcbank&pn=Smart Satheesh&am=${totalPrice}&cu=INR&tn=Sports Booking Payment`}
                    size={160}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    QR Code will appear here
                  </Typography>
                )}
              </Box>
              
              {/* UPI Apps Icons */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                {upiApps.slice(0, 4).map((app) => (
                  <Chip 
                    key={app.code}
                    label={app.icon + ' ' + app.name}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>

              {/* UPI Details */}
              <Box sx={{ textAlign: 'left', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Payment Details:</Typography>
                <Typography variant="body2">• UPI ID: smartsatheesh7-1@okhdfcbank</Typography>
                <Typography variant="body2">• Amount: ₹{totalPrice?.toLocaleString()}</Typography>
                <Typography variant="body2">• To: Smart Satheesh</Typography>
              </Box>
            </Paper>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              After clicking "Pay", you can scan this QR code with any UPI app or copy the UPI ID for manual payment.
            </Alert>
          </Box>
        </Box>
      )}
    </Box>
  );

  const PaymentProcessing = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <CircularProgress size={60} sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom>Processing Payment</Typography>
      <Typography variant="body2" color="text.secondary">
        Please wait while we initialize your payment...
      </Typography>
    </Box>
  );

  const PaymentVerification = () => (
    <Box sx={{ mt: 2 }}>
      {paymentMethod === 'phonepe' && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" gutterBottom>PhonePe Payment Verification</Typography>
          
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              📱 Complete your PhonePe payment:
            </Typography>
            <Typography variant="body2" component="div">
              1. A new tab/window should have opened with PhonePe payment page<br/>
              2. Complete the payment using any UPI app (PhonePe, GPay, Paytm, etc.)<br/>
              3. After successful payment, return to this page<br/>
              4. Click "Verify Payment" below to confirm your booking<br/>
              5. <strong>No need to enter transaction ID manually!</strong>
            </Typography>
          </Alert>

          <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <Typography variant="h6" gutterBottom>
              💜 PhonePe Payment - 100% FREE
            </Typography>
            <Typography variant="body2">
              Amount: ₹{totalPrice?.toLocaleString()}<br/>
              Reference: {paymentReference}<br/>
              Transaction ID: {currentBookingId}
            </Typography>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setPaymentStep('method')}
              disabled={loading}
            >
              Change Payment Method
            </Button>
            <Button
              variant="contained"
              onClick={handlePaymentConfirmation}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Verified />}
              size="large"
              color="success"
            >
              {loading ? 'Verifying PhonePe Payment...' : 'Verify PhonePe Payment'}
            </Button>
          </Box>

          <Typography variant="caption" display="block" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Click verify only after completing payment in PhonePe
          </Typography>
        </Box>
      )}

      {paymentMethod === 'upi' && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" gutterBottom>Pay via UPI</Typography>
          
          {/* Instructions */}
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              📱 How to complete payment:
            </Typography>
            <Typography variant="body2" component="div">
              1. Scan the QR code below with any UPI app (GPay, PhonePe, Paytm, etc.)<br/>
              2. Complete the payment in your UPI app<br/>
              3. Copy the <strong>Transaction ID</strong> from your payment app<br/>
              4. Enter the Transaction ID in the field below<br/>
              5. Click "Verify Payment" to confirm your booking
            </Typography>
          </Alert>
          
          {/* QR Code Section */}
          <Paper elevation={3} sx={{ p: 3, display: 'inline-block', mb: 3, bgcolor: 'white' }}>
            <Typography variant="subtitle2" gutterBottom color="text.primary" fontWeight="bold">
              Scan QR Code with any UPI App
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, mb: 2, border: '1px solid #e0e0e0' }}>
              <QRCode 
                value={generateUpiUrl(totalPrice || 0, paymentReference)}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </Box>
            
            {/* UPI Apps Icons */}
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              Compatible with all UPI apps:
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
              {upiApps.slice(0, 6).map((app) => (
                <Chip 
                  key={app.code}
                  label={app.icon + ' ' + app.name}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Paper>

          {/* Manual UPI Options */}
          <Divider sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">OR Pay Manually</Typography>
          </Divider>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopy />}
              onClick={() => copyToClipboard('smartsatheesh7-1@okhdfcbank', 'UPI ID copied!')}
            >
              Copy UPI ID
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopy />}
              onClick={() => copyToClipboard(totalPrice?.toString() || '0', 'Amount copied!')}
            >
              ₹{totalPrice?.toLocaleString()}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopy />}
              onClick={() => copyToClipboard(paymentReference, 'Reference copied!')}
            >
              Ref: {paymentReference}
            </Button>
          </Box>

          <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timer />
              Payment Reference: {paymentReference}
            </Typography>
            <Typography variant="body2">
              Amount: ₹{totalPrice?.toLocaleString()} | 
              Method: {paymentMethod.toUpperCase()} | 
              Time Left: {formatTimer(paymentTimer)}
            </Typography>
          </Paper>

          {/* Manual Transaction ID Entry */}
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              ⚠️ Important: Enter your actual transaction details
            </Typography>
            <List dense>
              <ListItem>• Complete payment first using the QR code or UPI ID above</ListItem>
              <ListItem>• Find the Transaction ID in your payment app's history</ListItem>
              <ListItem>• Transaction ID format: Usually 12 digits (e.g., 123456789012)</ListItem>
              <ListItem>• Without valid Transaction ID, booking cannot be confirmed</ListItem>
            </List>
          </Alert>

          <TextField
            fullWidth
            label="Transaction ID / UTR Number"
            value={upiTransactionId}
            onChange={(e) => {
              console.log('Transaction ID input changed:', e.target.value);
              setUpiTransactionId(e.target.value);
            }}
            onFocus={() => console.log('Transaction ID field focused')}
            onBlur={() => console.log('Transaction ID field blurred')}
            placeholder="Enter 12-digit transaction ID from your payment app"
            variant="outlined"
            helperText="Find this in your payment app's transaction history (required)"
            sx={{ mb: 3 }}
            required
            autoComplete="off"
            autoFocus
            error={upiTransactionId.length > 0 && upiTransactionId.length < 8}
            inputProps={{
              'data-testid': 'transaction-id-input',
              style: { backgroundColor: 'white' }
            }}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setPaymentStep('method')}
              disabled={loading}
            >
              Change Payment Method
            </Button>
            <Button
              variant="contained"
              onClick={handlePaymentConfirmation}
              disabled={loading || !upiTransactionId.trim() || upiTransactionId.length < 8}
              startIcon={loading ? <CircularProgress size={20} /> : <Verified />}
              size="large"
            >
              {loading ? 'Verifying Payment...' : 'Verify & Confirm Booking'}
            </Button>
          </Box>

          <Typography variant="caption" display="block" sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}>
            Your booking will be confirmed after payment verification
          </Typography>
        </Box>
      )}
    </Box>
  );

  const PaymentSuccess = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
      <Typography variant="h5" gutterBottom color="success.main">
        Payment Successful!
      </Typography>
      <Typography variant="body1" gutterBottom>
        Your booking has been confirmed
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Reference: {paymentReference}
      </Typography>
      <Alert severity="success">
        {/* COMMENTED OUT: Email notifications disabled */}
        {/* A confirmation email has been sent to {customerInfo.email} */}
        A WhatsApp confirmation will be sent to your registered number
      </Alert>
    </Box>
  );

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
                      <div className="sport-pricing">
                        <span className="price-label">Weekday:</span>
                        <span className="price-amount">₹{sport.basePrice.toLocaleString()}</span>
                        {sport.name === "Functions and Events" ? "/hr" : "/slot"}
                      </div>
                      <div className="sport-pricing">
                        <span className="price-label">Weekend (Fri-Sun):</span>
                        <span className="price-amount">₹{sport.weekendPrice.toLocaleString()}</span>
                        {sport.name === "Functions and Events" ? "/hr" : "/slot"}
                      </div>
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
                        minDate={new Date()}
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
                          {selectedSport === "Functions and Events" ? "🎉 Available Sessions" : "⏰ Available Time Slots"}
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
                        
                        <Grid container spacing={1.5} sx={{ mb: 3 }}>
                          {timeSlots.map((slot, index) => {
                            const isSelected = selectedTimeSlots.includes(slot.time);
                            const isBooked = !slot.available;
                            const isRegistered = registeredSlots.includes(slot.time);
                            
                            // Check if user is yearly Shuttle Badminton subscriber who should be blocked from registered slots
                            const isYearlyBadmintonUser = currentUser?.preferredSport === "Shuttle Badminton" && 
                                                         currentUser?.subscriptionType === "yearly";
                            const isBlockedRegisteredSlot = isRegistered && isYearlyBadmintonUser;
                            const isClickable = slot.available && !isBlockedRegisteredSlot;
                            
                            return (
                              <Grid item xs={6} sm={4} md={3} lg={2.4} key={index}>
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
                                  onClick={() => isClickable && handleTimeSlotToggle(slot.time)}
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

                      {selectedTimeSlots.length > 0 && (
                        <div className="booking-summary">
                          <h4>Booking Summary</h4>
                          <div className="summary-details">
                            <p><strong>Sport:</strong> {selectedSport}</p>
                            {selectedSport === "Shuttle Badminton" && selectedCourt && (
                              <p><strong>Court:</strong> {selectedCourt}</p>
                            )}
                            <p><strong>Date:</strong> {format(selectedDate, "dd MMM yyyy")}</p>
                            <p><strong>Selected Time{selectedTimeSlots.length > 1 ? 's' : ''}:</strong></p>
                            <ul>
                              {selectedTimeSlots.map((slot, index) => (
                                <li key={index}>{slot}</li>
                              ))}
                            </ul>
                            {selectedSport === "Functions and Events" && (
                              <p><strong>Total Hours:</strong> {selectedTimeSlots.reduce((acc, timeSlot) => {
                                const slot = timeSlots.find(s => s.time === timeSlot);
                                return acc + (slot?.hours || 1);
                              }, 0)} hours</p>
                            )}
                            <p className="total-amount"><strong>Total Amount: ₹{totalPrice?.toLocaleString()}</strong></p>
                          </div>
                          <Button
                            variant="contained"
                            color="primary"
                            className="proceed-button"
                            onClick={() => setBookingDialogOpen(true)}
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
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
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
              <Typography variant="body2">Date: {selectedDate ? format(selectedDate, "dd MMM yyyy") : ""}</Typography>
              <Typography variant="body2">Time: {selectedTimeSlots.join(", ")}</Typography>
              {selectedSport === "Functions and Events" && (
                <>
                  <Typography variant="body2">Event Type: {customerInfo.eventType}</Typography>
                  <Typography variant="body2">
                    Total Hours: {selectedTimeSlots.reduce((acc, timeSlot) => {
                      const slot = timeSlots.find(s => s.time === timeSlot);
                      return acc + (slot?.hours || 1);
                    }, 0)} hours
                  </Typography>
                </>
              )}
              <Typography variant="h6" sx={{ mt: 1 }}>Total: ₹{totalPrice?.toLocaleString()}</Typography>
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

      {/* Enhanced Payment Dialog - HDFC Bank Style */}
      <Dialog 
        open={paymentDialogOpen} 
        onClose={() => {
          if (paymentStep !== 'processing') {
            setPaymentDialogOpen(false);
            setTimerActive(false);
          }
        }} 
        maxWidth="lg" 
        fullWidth
        disableEscapeKeyDown={paymentStep === 'processing'}
      >
        <DialogTitle sx={{ 
          textAlign: 'center', 
          bgcolor: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', 
          color: 'white',
          backgroundImage: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Secure Payment Gateway</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timer fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {formatTimer(paymentTimer)}
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Amount: ₹{totalPrice?.toLocaleString()} | Reference: {paymentReference}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, py: 2, bgcolor: 'grey.50' }}>
            <Stepper activeStep={
              paymentStep === 'method' ? 0 : 
              paymentStep === 'processing' ? 1 : 
              paymentStep === 'verification' ? 2 : 3
            } alternativeLabel>
              <Step>
                <StepLabel>Choose Method</StepLabel>
              </Step>
              <Step>
                <StepLabel>Processing</StepLabel>
              </Step>
              <Step>
                <StepLabel>Verification</StepLabel>
              </Step>
              <Step>
                <StepLabel>Complete</StepLabel>
              </Step>
            </Stepper>
          </Box>

          <Box sx={{ p: 3 }}>
            {paymentStep === 'method' && <PaymentMethodSelection />}
            {paymentStep === 'processing' && <PaymentProcessing />}
            {paymentStep === 'verification' && <PaymentVerification />}
            {paymentStep === 'success' && <PaymentSuccess />}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: 'grey.50', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Security color="primary" fontSize="small" />
            <Typography variant="caption" color="text.secondary">
              256-bit SSL encrypted • PCI DSS compliant
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {paymentStep === 'method' && (
              <>
                <Button 
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setTimerActive(false);
                  }}
                  color="error"
                  disabled={paymentProcessing}
                >
                  Cancel Payment
                </Button>
                <Button 
                  onClick={processPayment}
                  variant="contained"
                  disabled={paymentProcessing}
                  startIcon={paymentProcessing ? <CircularProgress size={20} /> : <Security />}
                >
                  {paymentProcessing ? 'Processing...' : `Pay ₹${totalPrice?.toLocaleString()}`}
                </Button>
              </>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Simplified Payment Dialog - WhatsApp & GPay Only */}
      <SimplePaymentDialog
        open={simplePaymentOpen}
        onClose={() => {
          setSimplePaymentOpen(false);
          setCurrentBookingData(null);
        }}
        amount={totalPrice || 0}
        customerInfo={customerInfo}
        bookingReference={`BK_${selectedSport}_${new Date().getTime().toString().slice(-6)}`}
        onPaymentComplete={handlePaymentComplete}
      />
    </Box>
  );
}
