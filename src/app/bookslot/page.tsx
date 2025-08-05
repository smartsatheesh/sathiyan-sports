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
  Select,
  MenuItem,
  InputLabel,
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

// Update the timeSlots generation
const generateTimeSlots = (isEvent = false) => {
  if (isEvent) {
    return eventSessions.map(session => ({
      time: session.time,
      hours: session.hours,
      available: true
    }));
  }
  
  const slots = [];
  for (let hour = 5; hour <= 24; hour++) {
    // 5 AM to 12 PM
    const timeString = format(
      setHours(setMinutes(new Date(), 0), hour),
      "hh:mm aa"
    );
    slots.push({
      time: timeString,
      available: true, // Will be updated based on API response
    });
  }
  return slots;
};

export default function BookSlot() {
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState(generateTimeSlots());
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    eventType: "Corporate Event",
    specialRequirements: ""
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'gpay'>('upi');
  const [paymentTabValue, setPaymentTabValue] = useState(0);
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [paymentTimer, setPaymentTimer] = useState(300); // 5 minutes
  const [timerActive, setTimerActive] = useState(false);

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
            const isEvent = selectedSport === "Functions and Events";
            const updatedSlots = generateTimeSlots(isEvent).map(slot => ({
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
      }
    };

    fetchBookedSlots();
  }, [selectedSport, selectedDate]);

  // Reset selected slots when sport or date changes and update time slots
  useEffect(() => {
    setSelectedTimeSlots([]);
    if (selectedSport) {
      const isEvent = selectedSport === "Functions and Events";
      setTimeSlots(generateTimeSlots(isEvent));
    }
  }, [selectedSport, selectedDate]);

  // Calculate total price based on sport type and hours/slots
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
      
      const bookingData: any = {
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
        setBookingDialogOpen(false);
        setPaymentDialogOpen(true);
        setPaymentTimer(300); // Reset to 5 minutes
        setTimerActive(true);
        setUpiTransactionId('');
        setAlert({ type: 'success', message: 'Booking created! Please complete payment within 5 minutes.' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to create booking' });
      }
    } catch (error) {
      console.error("Booking error:", error);
      setAlert({ type: 'error', message: 'Failed to create booking' });
    }
    setLoading(false);
  };

  return (
    <Box className="book-slot-main-box">
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          className="booking-alert"
        >
          {alert.message}
        </Alert>
      )}
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
                    <Grid container spacing={2} className="time-slots-grid">
                      {timeSlots.map((slot) => (
                        <Grid item xs={6} sm={3} key={slot.time}>
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
                            disabled={!slot.available}
                            onClick={() => handleTimeSlotToggle(slot.time)}
                          >
                            {slot.time}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
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
                  Selected Time Slots:
                </Typography>
                <Box className="time-slots-container">
                  {selectedTimeSlots.length > 0 ? (
                    selectedTimeSlots.map((time) => (
                      <Chip
                        key={time}
                        label={time}
                        onDelete={() => handleTimeSlotToggle(time)}
                        color="primary"
                        variant="outlined"
                        size="small"
                        className="selected-time-chip"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No slots selected
                    </Typography>
                  )}
                </Box>
                {totalPrice && (
                  <Typography
                    variant="h5"
                    className="booking-total-price"
                  >
                    Total Amount: ₹{totalPrice}
                  </Typography>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  className="proceed-button"
                  disabled={
                    !selectedSport ||
                    !selectedDate ||
                    selectedTimeSlots.length === 0 ||
                    loading
                  }
                  onClick={() => setBookingDialogOpen(true)}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Processing...' : 'Proceed to Book'}
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
              
              <Box className="booking-dialog-summary">
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
      </Box>
    );
  }
