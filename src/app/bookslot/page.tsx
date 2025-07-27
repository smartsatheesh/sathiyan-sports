"use client";
import React, { useState, useMemo } from "react";
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
      available: Math.random() > 0.3, // Random availability for demo
    });
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function BookSlot() {
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]); // Changed to array for multiple selection

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

  return (
    <Box sx={{ height: "calc(100vh - 64px)" }}>
      {" "}
      {/* Subtract header height */}
      <Container maxWidth="xl" sx={{ height: "100%", py: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Typography
            variant="h4"
            align="center"
            className="book-slot-title"
            sx={{ mb: 2 }}
          >
            Book Your Slot
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 3,
              flex: 1,
              minHeight: 0, // Important for nested scrolling
            }}
          >
            {/* Left Side - Sport Selection */}
            <Paper
              elevation={3}
              sx={{
                flex: "1 1 70%",
                overflow: "auto",
                borderRadius: 3,
                p: 3,
              }}
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
                    sx={{ mt: 4, mb: 2, fontWeight: 600 }}
                  >
                    Select Date & Time
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Select Date"
                      value={selectedDate}
                      onChange={(newValue) => setSelectedDate(newValue)}
                      sx={{ width: "100%", mb: 3 }}
                    />
                  </LocalizationProvider>

                  {selectedDate && (
                    <Grid container spacing={2}>
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
                            sx={{
                              position: "relative",
                              width: "100%",
                              "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 4,
                                right: 4,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: slot.available
                                  ? "#4caf50"
                                  : "#f44336",
                              },
                            }}
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
              sx={{
                flex: "1 1 30%",
                maxWidth: "400px",
                height: "fit-content",
                borderRadius: 3,
              }}
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
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    my: 2,
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
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No slots selected
                    </Typography>
                  )}
                </Box>
                {totalPrice && (
                  <Typography
                    variant="h5"
                    sx={{
                      mt: 3,
                      pt: 2,
                      borderTop: 1,
                      borderColor: "divider",
                      color: "primary.main",
                      fontWeight: "bold",
                    }}
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
                    selectedTimeSlots.length === 0
                  }
                >
                  Proceed to Pay
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
