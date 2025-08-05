"use client";
import React, { useState, useMemo, useEffect } from "react";
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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import QRCode from "react-qr-code";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, isWeekend, setHours, setMinutes } from "date-fns";

const sports = [
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
    basePrice: 699,
    weekendPrice: 999,
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
    description: "Premium venue for corporate events, weddings, and celebrations",
    features: [
      "Spacious hall for 200+ guests",
      "Audio/Visual equipment",
      "Catering facilities",
      "Parking space",
      "Event coordination support"
    ]
  },
];

// Special session slots for Functions and Events
const eventSessions = [
  { time: "Morning Session (6:00 AM - 12:00 PM)", hours: 6 },
  { time: "Afternoon Session (12:00 PM - 6:00 PM)", hours: 6 },
  { time: "Evening Session (6:00 PM - 12:00 AM)", hours: 6 },
  { time: "Full Day (6:00 AM - 12:00 AM)", hours: 18 },
  { time: "Custom Hours (Minimum 3 hours)", hours: 3 }
];

// Update the timeSlots generation to show hourly ranges
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 4; hour < 24; hour++) {
    // 4 AM to 11 PM (4-5, 5-6, ..., 23-24)
    const startTime = format(
      setHours(setMinutes(new Date(), 0), hour),
      "HH:mm"
    );
    const endTime = format(
      setHours(setMinutes(new Date(), 0), hour + 1),
      "HH:mm"
    );
    const timeRange = `${startTime} - ${endTime}`;
    
    slots.push({
      time: timeRange,
      available: Math.random() > 0.3, // Random availability for demo
    });
  }
  return slots;
};

export default function BookSlot() {
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [paymentTimer, setPaymentTimer] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'gpay'>('upi');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [paymentTabValue, setPaymentTabValue] = useState(0);
  const [timeSlots, setTimeSlots] = useState(generateTimeSlots());
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Calculate total price based on number of slots
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
  }, [selectedSport, selectedDate, selectedTimeSlots]);

  // Utility functions
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateUpiUrl = (amount: number, bookingId: string) => {
    const upiId = 'smartsatheesh7-1@okhdfcbank';
    const name = 'Smart Satheesh';
    const note = `Booking payment for ${selectedSport}`;
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  };

  // Payment timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && paymentTimer > 0) {
      interval = setInterval(() => {
        setPaymentTimer((prev) => prev - 1);
      }, 1000);
    } else if (paymentTimer === 0 && currentBookingId) {
      // Timer expired
      setPaymentDialogOpen(false);
      setTimerActive(false);
      cancelExpiredBooking(currentBookingId);
    }
    return () => clearInterval(interval);
  }, [timerActive, paymentTimer, currentBookingId]);

  const cancelExpiredBooking = async (bookingId: string) => {
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'expired',
          bookingStatus: 'cancelled'
        })
      });
      setAlert({ type: 'error', message: 'Payment time expired. Booking cancelled.' });
    } catch (error) {
      console.error('Error cancelling expired booking:', error);
    }
  };

  // Tab Panel component for payment dialog
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
        id={`payment-tabpanel-${index}`}
        aria-labelledby={`payment-tab-${index}`}
        {...other}
      >
        {value === index && <Box>{children}</Box>}
      </div>
    );
  }

  // Handle UPI payment
  const handleUpiPayment = () => {
    const upiUrl = generateUpiUrl(totalPrice || 0, currentBookingId || '');
    
    // Log the URL for debugging
    console.log('Generated UPI URL:', upiUrl);
    
    // Copy UPI ID to clipboard for easier manual payment
    navigator.clipboard?.writeText('smartsatheesh7-1@okhdfcbank').then(() => {
      setAlert({ 
        type: 'success', 
        message: 'UPI ID copied to clipboard! Use any UPI app to pay.' 
      });
    }).catch(() => {
      console.log('Failed to copy UPI ID to clipboard');
    });
    
    // Check if user is on mobile device
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      try {
        // Try to open payment app directly on mobile
        window.location.href = upiUrl;
        
        // Show immediate instruction
        setTimeout(() => {
          setAlert({ 
            type: 'info', 
            message: 'Opening payment app... If it doesn\'t open, use the UPI ID copied to your clipboard.' 
          });
        }, 1000);
      } catch (error) {
        console.error('Error opening UPI URL:', error);
        setAlert({ 
          type: 'info', 
          message: 'Please open any UPI app and pay using UPI ID: smartsatheesh7-1@okhdfcbank' 
        });
      }
    } else {
      // For desktop users, show QR code and manual instructions
      setAlert({ 
        type: 'info', 
        message: 'Use any UPI app on your phone to scan QR code or pay using UPI ID: smartsatheesh7-1@okhdfcbank' 
      });
    }
  };

  // Handle payment confirmation
  const handlePaymentConfirmation = async () => {
    if (!upiTransactionId.trim()) {
      setAlert({ type: 'error', message: 'Please enter UPI transaction ID' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${currentBookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'completed',
          bookingStatus: 'confirmed',
          paymentMethod: paymentMethod,
          upiTransactionId: upiTransactionId.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Payment confirmed! Your booking is confirmed.' });
        setPaymentDialogOpen(false);
        setTimerActive(false);
        // Reset form
        setSelectedSport("");
        setSelectedDate(null);
        setSelectedTimeSlots([]);
        setCustomerInfo({ name: "", email: "", phone: "", eventType: "Corporate Event", specialRequirements: "" });
        setUpiTransactionId('');
        setCurrentBookingId(null);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to confirm payment' });
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
      setAlert({ type: 'error', message: 'Failed to confirm payment' });
    }
    setLoading(false);
  };

  // Handle time slot selection/deselection
  const handleTimeSlotToggle = (time: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  // Handle selecting all available slots
  const handleSelectAllAvailable = () => {
    const availableSlots = timeSlots.filter(slot => slot.available).map(slot => slot.time);
    setSelectedTimeSlots(availableSlots);
  };

  // Handle clearing all selected slots
  const handleClearAll = () => {
    setSelectedTimeSlots([]);
  };

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
        id={`payment-tabpanel-${index}`}
        aria-labelledby={`payment-tab-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ p: 3 } as any}>{children}</Box>}
      </div>
    );
  }

  // Timer effect for payment countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && paymentTimer > 0) {
      interval = setInterval(() => {
        setPaymentTimer((prev) => prev - 1);
      }, 1000);
    } else if (paymentTimer === 0 && timerActive) {
      setTimerActive(false);
      setPaymentDialogOpen(false);
      setAlert({ type: 'error', message: 'Payment time expired. Please try booking again.' });
      if (currentBookingId) {
        cancelExpiredBooking(currentBookingId);
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, paymentTimer, currentBookingId]);

  // Cancel expired booking
  const cancelExpiredBooking = async (bookingId: string) => {
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'expired', bookingStatus: 'expired' })
      });
    } catch (error) {
      console.error('Error canceling expired booking:', error);
    }
  };

  // Format timer display
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate UPI payment URL
  const generateUpiUrl = (amount: number, bookingId: string) => {
    const upiId = 'smartsatheesh7-1@okhdfcbank';
    const name = 'Smart Satheesh';
    const note = `Booking payment for ${selectedSport} - ${bookingId}`;
    
    // Generate shorter transaction reference (max 25 characters)
    const timestamp = Date.now().toString();
    const transactionRef = `TXN${timestamp.slice(-10)}${Math.random().toString(36).substr(2, 5)}`;
    
    // Properly encode all parameters
    const params = new URLSearchParams({
      pa: upiId,                    // Payee VPA
      pn: name,                     // Payee Name
      am: amount.toString(),        // Amount
      cu: 'INR',                    // Currency
      tn: note,                     // Transaction Note
      tr: transactionRef            // Transaction Reference
    });
    
    // Use more reliable schemes
    if (paymentMethod === 'gpay') {
      return `tez://upi/pay?${params.toString()}`;
    } else {
      return `upi://pay?${params.toString()}`;
    }
  };

  // Handle UPI payment
  const handleUpiPayment = () => {
    const upiUrl = generateUpiUrl(totalPrice || 0, currentBookingId || '');
    
    // Log the URL for debugging
    console.log('Generated UPI URL:', upiUrl);
    
    // Copy UPI ID to clipboard for easier manual payment
    navigator.clipboard?.writeText('smartsatheesh7-1@okhdfcbank').then(() => {
      setAlert({ 
        type: 'success', 
        message: 'UPI ID copied to clipboard! Use any UPI app to pay.' 
      });
    }).catch(() => {
      console.log('Failed to copy UPI ID to clipboard');
    });
    
    // Check if user is on mobile device
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      try {
        // Try to open payment app directly on mobile
        window.location.href = upiUrl;
        
        // Show immediate instruction
        setTimeout(() => {
          setAlert({ 
            type: 'info', 
            message: 'Opening payment app... If it doesn\'t open, use the UPI ID copied to your clipboard.' 
          });
        }, 1000);
      } catch (error) {
        console.error('Error opening UPI URL:', error);
        setAlert({ 
          type: 'info', 
          message: 'Please open any UPI app and pay using UPI ID: smartsatheesh7-1@okhdfcbank' 
        });
      }
    } else {
      // For desktop users, show QR code and manual instructions
      setAlert({ 
        type: 'info', 
        message: 'Use any UPI app on your phone to scan QR code or pay using UPI ID: smartsatheesh7-1@okhdfcbank' 
      });
    }
  };

  // Handle booking submission
  const handleBooking = async () => {
    if (!selectedSport || !selectedDate || selectedTimeSlots.length === 0 || !customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      setAlert({ type: 'error', message: 'Please fill all required fields' });
      return;
    }

    setLoading(true);
    try {
      const sport = sports.find((s) => s.name === selectedSport);
      const pricePerSlot = isWeekend(selectedDate) ? sport!.weekendPrice : sport!.basePrice;
      
      const paymentExpiry = new Date();
      paymentExpiry.setMinutes(paymentExpiry.getMinutes() + 5);
      
      const bookingData = {
        sport: selectedSport,
        date: selectedDate.toISOString(),
        timeSlots: selectedTimeSlots,
        totalAmount: totalPrice,
        pricePerSlot,
        isWeekend: isWeekend(selectedDate),
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        paymentExpiry: paymentExpiry.toISOString(),
        paymentStatus: 'pending',
        bookingStatus: 'pending'
      };

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
        setBookingDialogOpen(false);
        setPaymentDialogOpen(true);
        setPaymentTimer(300);
        setTimerActive(true);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to create booking' });
      }
    } catch (error) {
      console.error("Booking error:", error);
      setAlert({ type: 'error', message: 'Failed to create booking' });
    }
    setLoading(false);
  };

  // Handle payment confirmation
  const handlePaymentConfirmation = async () => {
    if (!upiTransactionId.trim()) {
      setAlert({ type: 'error', message: 'Please enter UPI transaction ID' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${currentBookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'completed',
          bookingStatus: 'confirmed',
          paymentMethod: paymentMethod,
          upiTransactionId: upiTransactionId.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Payment confirmed! Your booking is confirmed.' });
        setPaymentDialogOpen(false);
        setTimerActive(false);
        // Reset form
        setSelectedSport("");
        setSelectedDate(null);
        setSelectedTimeSlots([]);
        setCustomerInfo({ name: "", email: "", phone: "" });
        setUpiTransactionId('');
        setCurrentBookingId(null);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to confirm payment' });
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
      setAlert({ type: 'error', message: 'Failed to confirm payment' });
    }
    setLoading(false);
  };

  // Fetch booked slots when sport and date change
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (selectedSport && selectedDate) {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/bookings?sport=${encodeURIComponent(selectedSport)}&date=${selectedDate.toISOString()}`
          );
          const data = await response.json();
          
          if (data.success) {
            setBookedSlots(data.bookedSlots);
            // Update time slots availability
            const updatedSlots = generateTimeSlots().map(slot => ({
              ...slot,
              available: !data.bookedSlots.includes(slot.time)
            }));
            setTimeSlots(updatedSlots);
          }
        } catch (error) {
          console.error("Error fetching booked slots:", error);
          setAlert({ type: 'error', message: 'Failed to fetch available slots' });
        }
        setLoading(false);
      } else {
        // Reset to default availability when no sport/date selected
        setTimeSlots(generateTimeSlots());
      }
    };

    fetchBookedSlots();
  }, [selectedSport, selectedDate]);

  // Reset selected slots when sport or date changes
  useEffect(() => {
    setSelectedTimeSlots([]);
  }, [selectedSport, selectedDate]);

  return (
    <Box style={{ height: "calc(100vh - 64px)" }}>
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ m: 2 }}
        >
          {alert.message}
        </Alert>
      )}
      {/* Subtract header height */}
      <Container maxWidth="xl" sx={{ height: "100%", py: 2 }}>
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
                    onClick={() => setSelectedSport(sport.name)}
                  >
                    <div className="sport-icon">{sport.icon}</div>
                    <div className="sport-name">{sport.name}</div>
                    <div className="price-tags">
                      <div className="price-tag weekday">
                        Weekday: ₹{sport.basePrice}
                      </div>
                      <div className="price-tag weekend">
                        Weekend: ₹{sport.weekendPrice}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedSport && (
                <>
                  <Typography
                    variant="h5"
                    className="date-time-section"
                  >
                    Select Date & Time
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Select Date"
                      value={selectedDate}
                      onChange={(newValue) => setSelectedDate(newValue)}
                      className="date-picker-container"
                    />
                  </LocalizationProvider>

                  {selectedDate && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Select multiple time slots (click to add/remove):
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleSelectAllAvailable}
                            disabled={timeSlots.filter(slot => slot.available).length === 0}
                          >
                            Select All Available
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={handleClearAll}
                            disabled={selectedTimeSlots.length === 0}
                          >
                            Clear All
                          </Button>
                        </Box>
                      </Box>
                      <Grid container spacing={2}>
                        {timeSlots.map((slot) => (
                          <Grid item xs={12} sm={6} md={4} key={slot.time}>
                            <Button
                              className={`time-slot-button ${
                                slot.available ? "available" : "unavailable"
                              } ${
                                selectedTimeSlots.includes(slot.time)
                                  ? "selected"
                                  : ""
                              }`}
                              variant={
                                selectedTimeSlots.includes(slot.time)
                                  ? "contained"
                                  : "outlined"
                              }
                              color={
                                selectedTimeSlots.includes(slot.time)
                                  ? "primary"
                                  : "inherit"
                              }
                              disabled={!slot.available}
                              onClick={() => handleTimeSlotToggle(slot.time)}
                              sx={{
                                position: "relative",
                                width: "100%",
                                height: "60px",
                                fontSize: "0.9rem",
                                fontWeight: selectedTimeSlots.includes(slot.time) ? 'bold' : 'normal',
                                border: selectedTimeSlots.includes(slot.time) ? '2px solid' : '1px solid',
                                borderColor: selectedTimeSlots.includes(slot.time) 
                                  ? 'primary.main' 
                                  : slot.available ? 'grey.300' : 'grey.500',
                                bgcolor: selectedTimeSlots.includes(slot.time)
                                  ? 'primary.main'
                                  : slot.available ? 'white' : 'grey.100',
                                color: selectedTimeSlots.includes(slot.time)
                                  ? 'white'
                                  : slot.available ? 'text.primary' : 'text.disabled',
                                "&:hover": {
                                  bgcolor: selectedTimeSlots.includes(slot.time)
                                    ? 'primary.dark'
                                    : slot.available ? 'grey.50' : 'grey.100',
                                  borderColor: slot.available ? 'primary.main' : 'grey.500',
                                },
                                "&::before": {
                                  content: '""',
                                  position: "absolute",
                                  top: 6,
                                  right: 6,
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  backgroundColor: slot.available
                                    ? "#4caf50"
                                    : "#f44336",
                                },
                                "&::after": selectedTimeSlots.includes(slot.time) ? {
                                  content: '"✓"',
                                  position: "absolute",
                                  top: 6,
                                  left: 6,
                                  fontSize: "14px",
                                  fontWeight: "bold",
                                  color: "white",
                                } : {},
                              }}
                            >
                              {slot.time}
                            </Button>
                          </Grid>
                        ))}
                      </Grid>
                      
                      {selectedTimeSlots.length > 0 && (
                        <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                            Selected Slots ({selectedTimeSlots.length}):
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {selectedTimeSlots.map((time) => (
                              <Chip
                                key={time}
                                label={time}
                                onDelete={() => handleTimeSlotToggle(time)}
                                color="primary"
                                size="small"
                                sx={{ fontSize: '0.75rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
            </Paper>

            {/* Right Side - Booking Summary */}
            <Paper
              elevation={3}
              className="booking-summary-card"
            >
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Booking Summary
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Typography variant="body1" gutterBottom>
                  Sport: <strong>{selectedSport || "Not selected"}</strong>
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Date:{" "}
                  <strong>
                    {selectedDate
                      ? format(selectedDate, "dd MMM yyyy")
                      : "Not selected"}
                  </strong>
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Selected Time Slots ({selectedTimeSlots.length} hours):
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    my: 2,
                    maxHeight: "120px",
                    overflowY: "auto",
                  }}
                >
                  {selectedTimeSlots.length > 0 ? (
                    selectedTimeSlots.map((time) => (
                      <Chip
                        key={time}
                        label={time}
                        onDelete={() => handleTimeSlotToggle(time)}
                        color="primary"
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No slots selected
                    </Typography>
                  )}
                </Box>
                {totalPrice && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTimeSlots.length} hour{selectedTimeSlots.length !== 1 ? 's' : ''} × ₹{
                        sports.find(s => s.name === selectedSport)?.[
                          selectedDate && isWeekend(selectedDate) ? 'weekendPrice' : 'basePrice'
                        ]
                      } {selectedDate && isWeekend(selectedDate) ? '(Weekend)' : '(Weekday)'}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        color: "primary.main",
                        fontWeight: "bold",
                        mt: 1
                      }}
                    >
                      Total Amount: ₹{totalPrice}
                    </Typography>
                  </Box>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  className="proceed-button"
                  onClick={() => setBookingDialogOpen(true)}
                  disabled={
                    !selectedSport ||
                    !selectedDate ||
                    selectedTimeSlots.length === 0 ||
                    loading
                  }
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Processing...' : 'Proceed to Pay'}
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Your Booking</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Full Name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              margin="normal"
              required
            />
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Booking Summary</Typography>
              <Typography variant="body2">Sport: {selectedSport}</Typography>
              <Typography variant="body2">Date: {selectedDate ? format(selectedDate, "dd MMM yyyy") : ""}</Typography>
              <Typography variant="body2">Time Slots: {selectedTimeSlots.join(", ")}</Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>Total: ₹{totalPrice}</Typography>
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

      {/* Payment Dialog */}
      <Dialog 
        open={paymentDialogOpen} 
        onClose={() => {
          setPaymentDialogOpen(false);
          setTimerActive(false);
        }} 
        maxWidth="md" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
          Complete Payment
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
            Time Remaining: <span className={paymentTimer < 60 ? 'payment-timer-warning' : ''}>{formatTimer(paymentTimer)}</span>
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Please complete payment within {formatTimer(paymentTimer)} to confirm your booking.
            </Alert>
            
            <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>Booking Details</Typography>
              <Typography variant="body2">Sport: {selectedSport}</Typography>
              <Typography variant="body2">Date: {selectedDate ? format(selectedDate, "dd MMM yyyy") : ""}</Typography>
              <Typography variant="body2">Time: {selectedTimeSlots.join(", ")}</Typography>
              <Typography variant="body2">Customer: {customerInfo.name}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" color="primary">Total Amount: ₹{totalPrice}</Typography>
            </Paper>

            <Tabs value={paymentTabValue} onChange={(e, newValue) => setPaymentTabValue(newValue)} sx={{ mb: 2 }}>
              <Tab label="UPI Payment" />
              <Tab label="Manual Entry" />
            </Tabs>

            {/* Tab 1: UPI Payment */}
            <TabPanel value={paymentTabValue} index={0}>
              <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                <FormLabel component="legend">Choose Payment App</FormLabel>
                <RadioGroup
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'upi' | 'gpay')}
                  row
                >
                  <FormControlLabel value="upi" control={<Radio />} label="Any UPI App" />
                  <FormControlLabel value="gpay" control={<Radio />} label="Google Pay" />
                </RadioGroup>
              </FormControl>

              <Box style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleUpiPayment}
                  style={{ marginBottom: '16px' }}
                >
                  Pay ₹{totalPrice} with {paymentMethod === 'gpay' ? 'Google Pay' : 'UPI'}
                </Button>
                <Typography variant="body2" color="text.secondary" style={{ marginBottom: '8px' }}>
                  Click above to open {paymentMethod === 'gpay' ? 'Google Pay' : 'your UPI app'} and complete the payment
                </Typography>
                
                <Divider style={{ margin: '16px 0' }} />
                
                {/* QR Code Section */}
                <Typography variant="body2" style={{ fontWeight: 'bold', marginBottom: '16px' }}>
                  Scan QR Code to Pay:
                </Typography>
                <Box style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <QRCode 
                    value={generateUpiUrl(totalPrice || 0, currentBookingId || '')}
                    size={180}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" style={{ marginBottom: '16px' }}>
                  Scan this QR code with any UPI app (GPay, PhonePe, Paytm, etc.)
                </Typography>
                
                <Divider style={{ margin: '16px 0' }} />
                
                <Typography variant="body2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  Or pay manually using these details:
                </Typography>
                <Paper elevation={1} style={{ padding: '16px', backgroundColor: '#f5f5f5' }}>
                  <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Typography variant="body2">
                      <strong>UPI ID:</strong> smartsatheesh7-1@okhdfcbank
                    </Typography>
                    <Button 
                      size="small" 
                      onClick={() => {
                        navigator.clipboard?.writeText('smartsatheesh7-1@okhdfcbank');
                        setAlert({ type: 'success', message: 'UPI ID copied to clipboard!' });
                      }}
                    >
                      Copy
                    </Button>
                  </Box>
                  <Typography variant="body2" style={{ marginBottom: '8px' }}>
                    <strong>Name:</strong> Smart Satheesh
                  </Typography>
                  <Typography variant="body2" style={{ marginBottom: '8px' }}>
                    <strong>Amount:</strong> ₹{totalPrice}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Note:</strong> Booking payment for {selectedSport}
                  </Typography>
                </Paper>
                
                <Typography variant="body2" style={{ fontWeight: 'bold', marginBottom: '16px', color: 'green' }}>
                  After payment, enter your transaction ID in the Manual Entry tab
                </Typography>
              </Box>
            </TabPanel>

            {/* Tab 2: Manual Entry */}
            <TabPanel value={paymentTabValue} index={1}>
              <Alert severity="info" style={{ marginBottom: '16px' }}>
                After completing payment via UPI, enter your transaction ID below to confirm your booking.
              </Alert>
              <Typography variant="body2" style={{ marginBottom: '16px' }}>
                Enter the UPI transaction ID you received after completing the payment:
              </Typography>
              <TextField
                fullWidth
                label="UPI Transaction ID"
                value={upiTransactionId}
                onChange={(e) => setUpiTransactionId(e.target.value)}
                placeholder="Enter UPI transaction ID after payment (e.g., T12345678)"
                helperText="Find this in your payment app under transaction history"
                required
                variant="outlined"
                autoComplete="off"
              />
              <Typography variant="body2" color="text.secondary" style={{ marginTop: '8px' }}>
                <strong>Where to find Transaction ID:</strong><br/>
                • GPay: Go to Activity → Your payment → Transaction ID<br/>
                • PhonePe: Go to History → Your payment → Transaction details<br/>
                • Paytm: Go to Passbook → Your payment → Transaction ID
              </Typography>
            </TabPanel>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setPaymentDialogOpen(false);
              setTimerActive(false);
              if (currentBookingId) {
                cancelExpiredBooking(currentBookingId);
              }
            }}
            color="error"
          >
            Cancel Booking
          </Button>
          {paymentTabValue === 1 && (
            <Button 
              onClick={handlePaymentConfirmation} 
              variant="contained" 
              disabled={loading || !upiTransactionId.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Confirming...' : 'Confirm Payment'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
