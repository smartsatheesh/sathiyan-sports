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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
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
  },
  {
    id: 2,
    name: "Football",
    basePrice: 699,
    weekendPrice: 999,
    icon: "⚽",
    color: "#2196f3",
  },
  {
    id: 3,
    name: "Shuttle Badminton",
    basePrice: 699,
    weekendPrice: 999,
    icon: "🏸",
    color: "#ff9800",
  },
];

// Update the timeSlots generation
const generateTimeSlots = () => {
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
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
      }
    };

    fetchBookedSlots();
  }, [selectedSport, selectedDate]);

  // Reset selected slots when sport or date changes
  useEffect(() => {
    setSelectedTimeSlots([]);
  }, [selectedSport, selectedDate]);

  // Calculate total price based on number of slots
  const totalPrice = useMemo(() => {
    if (!selectedSport || !selectedDate || selectedTimeSlots.length === 0)
      return null;
    const sport = sports.find((s) => s.name === selectedSport);
    if (!sport) return null;
    const pricePerSlot = isWeekend(selectedDate)
      ? sport.weekendPrice
      : sport.basePrice;
    return pricePerSlot * selectedTimeSlots.length;
  }, [selectedSport, selectedDate, selectedTimeSlots]);

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
        setAlert({ type: 'success', message: 'Booking created successfully!' });
        setBookingDialogOpen(false);
        // Reset form
        setSelectedSport("");
        setSelectedDate(null);
        setSelectedTimeSlots([]);
        setCustomerInfo({ name: "", email: "", phone: "" });
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
