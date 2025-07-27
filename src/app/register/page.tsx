// pages/register.tsx
"use client";
import { useState } from "react";
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from "@mui/material";
import { addMonths, addYears } from "date-fns";

const SUBSCRIPTION_PRICES = {
  monthly: 1200,
  quarterly: 3000,
  yearly: 10000,
};

const TIME_SLOTS = [
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    preferredSport: "",
    preferredTimeSlot: "",
    subscriptionType: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Calculate subscription end date based on type
  const calculateEndDate = (type: string) => {
    const startDate = new Date();
    switch (type) {
      case "monthly":
        return addMonths(startDate, 1);
      case "quarterly":
        return addMonths(startDate, 3);
      case "yearly":
        return addYears(startDate, 1);
      default:
        return startDate;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const subscriptionAmount =
      SUBSCRIPTION_PRICES[
        formData.subscriptionType as keyof typeof SUBSCRIPTION_PRICES
      ];
    const subscriptionEndDate = calculateEndDate(formData.subscriptionType);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          subscriptionAmount,
          subscriptionEndDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setSuccess("Registration successful! Welcome to Sathiyan Sports.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        gender: "",
        preferredSport: "",
        preferredTimeSlot: "",
        subscriptionType: "",
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center">
          Register
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />

          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Gender*
            </Typography>
            <ToggleButtonGroup
              value={formData.gender}
              exclusive
              onChange={(e, value) =>
                setFormData({ ...formData, gender: value })
              }
              fullWidth
            >
              <ToggleButton value="male">Male</ToggleButton>
              <ToggleButton value="female">Female</ToggleButton>
              <ToggleButton value="other">Other</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Preferred Sport */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Preferred Sport</InputLabel>
            <Select
              value={formData.preferredSport}
              onChange={(e) =>
                setFormData({ ...formData, preferredSport: e.target.value })
              }
              required
            >
              <MenuItem value="Cricket">Cricket</MenuItem>
              <MenuItem value="Football">Football</MenuItem>
              <MenuItem value="Shuttle Badminton">Shuttle Badminton</MenuItem>
            </Select>
          </FormControl>

          {/* Preferred Time Slot */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Preferred Time Slot</InputLabel>
            <Select
              value={formData.preferredTimeSlot}
              onChange={(e) =>
                setFormData({ ...formData, preferredTimeSlot: e.target.value })
              }
              required
            >
              {TIME_SLOTS.map((slot) => (
                <MenuItem key={slot} value={slot}>
                  {slot}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Subscription Type */}
          <FormControl component="fieldset" margin="normal">
            <FormLabel component="legend">Subscription Type</FormLabel>
            <RadioGroup
              value={formData.subscriptionType}
              onChange={(e) =>
                setFormData({ ...formData, subscriptionType: e.target.value })
              }
            >
              <FormControlLabel
                value="monthly"
                control={<Radio />}
                label="Monthly (₹1,200)"
              />
              <FormControlLabel
                value="quarterly"
                control={<Radio />}
                label="Quarterly (₹3,000)"
              />
              <FormControlLabel
                value="yearly"
                control={<Radio />}
                label="Yearly (₹10,000)"
              />
            </RadioGroup>
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Register & Pay"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
