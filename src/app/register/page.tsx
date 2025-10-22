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
  IconButton,
  InputAdornment,
  Link as MuiLink,
} from "@mui/material";
import { 
  Visibility, 
  VisibilityOff, 
  PersonAdd, 
  Phone, 
  Email, 
  Lock 
} from "@mui/icons-material";
import { addMonths, addYears } from "date-fns";
import Link from "next/link";

const SUBSCRIPTION_PRICES = {
  monthly: 1200,
  quarterly: 3000,
  "half yearly": 5500,
  yearly: 10000,
};

const TIME_SLOTS = [
  "12:00 AM - 01:00 AM",
  "01:00 AM - 02:00 AM",
  "02:00 AM - 03:00 AM",
  "03:00 AM - 04:00 AM",
  "04:00 AM - 05:00 AM",
  "05:00 AM - 06:00 AM",
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
  "10:00 PM - 11:00 PM",
  "11:00 PM - 12:00 AM",
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    gender: "",
    preferredSport: "",
    preferredTimeSlot: "",
    selectedCourt: "",
    subscriptionType: "",
    role: "customer", // Default role
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [courtAvailability, setCourtAvailability] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  // Calculate subscription end date based on type
  const calculateEndDate = (type: string) => {
    const startDate = new Date();
    switch (type) {
      case "monthly":
        return addMonths(startDate, 1);
      case "quarterly":
        return addMonths(startDate, 3);
      case "half yearly":
        return addMonths(startDate, 6);
      case "yearly":
        return addYears(startDate, 1);
      default:
        return startDate;
    }
  };

  // Check court availability when time slot or court selection changes
  const checkAvailability = async (timeSlot: string, court?: string) => {
    if (!timeSlot) return;
    
    setCheckingAvailability(true);
    setAvailabilityMessage("");
    
    try {
      const response = await fetch("/api/check-court-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeSlot,
          requestedCourt: court,
        }),
      });

      const data = await response.json();
      setCourtAvailability(data);
      
      if (data.success) {
        setAvailabilityMessage(data.message);
      } else {
        setAvailabilityMessage(data.message);
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      setAvailabilityMessage("Error checking court availability. Please try again.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Client-side validation
    if (!formData.name || !formData.email || !formData.mobile || !formData.password || !formData.confirmPassword) {
      setError("All required fields must be filled");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (!formData.gender || !formData.preferredSport || !formData.preferredTimeSlot || !formData.subscriptionType) {
      setError("Please complete all required selections");
      setLoading(false);
      return;
    }

    // Court selection is only required for Shuttle Badminton
    if (formData.preferredSport === "Shuttle Badminton" && !formData.selectedCourt) {
      setError("Please select a court for Shuttle Badminton");
      setLoading(false);
      return;
    }

    // Check court availability before submission for Shuttle Badminton
    if (formData.preferredSport === "Shuttle Badminton" && courtAvailability && !courtAvailability.canBook) {
      setError("Selected court is not available for the chosen time slot. Please select a different court or time slot.");
      setLoading(false);
      return;
    }

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

      setSuccess("Registration successful! Welcome to Sathiyan Sports. You can now login with your mobile number and password.");
      setFormData({
        name: "",
        email: "",
        mobile: "",
        password: "",
        confirmPassword: "",
        gender: "",
        preferredSport: "",
        preferredTimeSlot: "",
        selectedCourt: "",
        subscriptionType: "",
        role: "customer",
      });
      setCourtAvailability(null);
      setAvailabilityMessage("");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          align="center"
          sx={{
            fontWeight: 800,
            color: "primary.main",
            mb: 4,
          }}
        >
          Register for Membership
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="primary" />
                </InputAdornment>
              ),
            }}
            placeholder="Enter your email address"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Mobile Number"
            value={formData.mobile}
            onChange={(e) =>
              setFormData({ ...formData, mobile: e.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone color="primary" />
                </InputAdornment>
              ),
            }}
            placeholder="Enter your mobile number"
            helperText="This will be your username for login"
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            placeholder="Create a strong password"
            helperText="Minimum 6 characters required"
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            placeholder="Re-enter your password"
            error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
            helperText={
              formData.password !== formData.confirmPassword && formData.confirmPassword !== ''
                ? 'Passwords do not match'
                : 'Must match the password above'
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
              onChange={(e) => {
                const newSport = e.target.value;
                setFormData({ 
                  ...formData, 
                  preferredSport: newSport,
                  // Clear court selection if not Shuttle Badminton
                  selectedCourt: newSport === "Shuttle Badminton" ? formData.selectedCourt : ""
                });
                // Clear availability status when sport changes
                setAvailabilityMessage("");
                setCourtAvailability(null);
              }}
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
              onChange={(e) => {
                const newTimeSlot = e.target.value;
                setFormData({ ...formData, preferredTimeSlot: newTimeSlot });
                // Check availability when time slot changes
                if (newTimeSlot) {
                  checkAvailability(newTimeSlot, formData.selectedCourt);
                }
              }}
              required
            >
              {TIME_SLOTS.map((slot) => (
                <MenuItem key={slot} value={slot}>
                  {slot}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Court Selection - Only for Shuttle Badminton */}
          {formData.preferredSport === "Shuttle Badminton" && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>Select Court *</InputLabel>
                <Select
                  value={formData.selectedCourt}
                  onChange={(e) => {
                    const newCourt = e.target.value;
                    setFormData({ ...formData, selectedCourt: newCourt });
                    // Check availability when court changes
                    if (formData.preferredTimeSlot && newCourt) {
                      checkAvailability(formData.preferredTimeSlot, newCourt);
                    }
                  }}
                  required
                  disabled={!formData.preferredTimeSlot}
                >
                  <MenuItem value="S1">Court S1</MenuItem>
                  <MenuItem value="S2">Court S2</MenuItem>
                  <MenuItem value="S3">Court S3</MenuItem>
                </Select>
                {!formData.preferredTimeSlot && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    Please select a time slot first
                  </Typography>
                )}
              </FormControl>

              {/* Court Availability Status */}
              {(checkingAvailability || availabilityMessage) && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 1, backgroundColor: 'grey.50' }}>
                  {checkingAvailability ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2">Checking court availability...</Typography>
                    </Box>
                  ) : (
                    <Alert 
                      severity={courtAvailability?.canBook ? "success" : "warning"} 
                      sx={{ mb: 1 }}
                    >
                      {availabilityMessage}
                    </Alert>
                  )}
                  
                  {courtAvailability?.availableCourts && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" fontWeight="bold">Court Status:</Typography>
                      {courtAvailability.availableCourts.map((court: any) => (
                        <Box key={court.court} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption">
                            Court {court.court}:
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color={court.available ? "success.main" : "error.main"}
                          >
                            {court.currentBookings}/{court.maxCapacity} booked
                            {court.available ? " ✓" : " (Full)"}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}

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
                label="Monthly"
              />
              <FormControlLabel
                value="quarterly"
                control={<Radio />}
                label="Quarterly"
              />
              <FormControlLabel
                value="half yearly"
                control={<Radio />}
                label="Half Yearly"
              />
              <FormControlLabel
                value="yearly"
                control={<Radio />}
                label="Yearly"
              />
            </RadioGroup>
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={
              loading || 
              (formData.preferredSport === "Shuttle Badminton" && 
               courtAvailability && 
               !courtAvailability.canBook)
            }
          >
            {loading ? <CircularProgress size={24} /> : "Register"}
          </Button>

          {/* Show helper message when registration is disabled due to conflicts */}
          {formData.preferredSport === "Shuttle Badminton" && 
           courtAvailability && 
           !courtAvailability.canBook && (
            <Alert severity="error" sx={{ mt: 1 }}>
              Registration disabled: Please select an available court and time slot combination
            </Alert>
          )}

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link href="/auth/login" passHref>
                <MuiLink 
                  component="span" 
                  sx={{ 
                    color: 'primary.main', 
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Login here
                </MuiLink>
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
