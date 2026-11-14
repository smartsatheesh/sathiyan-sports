// pages/register.tsx
"use client";
import { useEffect, useState } from "react";
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
import RegistrationSuccessPopup from "../components/RegistrationSuccessPopup";
import { rememberClub, rememberedClub, useClub, useClubOptions } from "../hooks/useClubs";
import { useTenant } from "../components/TenantProvider";
import { DEFAULT_CLUB, isDefaultClub } from "../lib/clubs";
import { calculateMembershipPrice, CLASS_SPORTS, membershipPlanFor, programFor, programMonthlyFee, SUBSCRIPTION_MONTHS, type SubscriptionType } from "../lib/pricing";

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
  // Which club the member joins: ?club=<slug> (from a club's page), else the last one used here
  const [club, setClub] = useState(DEFAULT_CLUB);
  useEffect(() => {
    setClub(tenant.isDefault ? new URLSearchParams(window.location.search).get("club") || rememberedClub() : tenant.slug);
  }, []);
  const tenant = useTenant();
  const clubs = useClubOptions();
  const { club: clubInfo, settings } = useClub(club);
  // Partner clubs have no courts or time slots: members just pick a coaching programme
  const isHomeClub = isDefaultClub(club);
  const flexiblePerMonth = settings.membership.flexibleSurchargePerMonth;

  // Tuition: one price per person per month (owner-editable in Admin → Settings)
  const getCurrentPrices = () => membershipPlanFor(settings, formData);

  const flexibleSurcharge = (type: SubscriptionType) => flexiblePerMonth * SUBSCRIPTION_MONTHS[type];

  const getPriceWithSurcharge = (basePrice: number, surcharge: number) => {
    return basePrice + (formData.mode === 'flexible' ? surcharge : 0);
  };

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
    coachingProgram: "",
    role: "customer", // Default role
    comments: "",
    mode: "",
    champType: "", // New field for Kids, Adult, Veteran
    subscribed: "no", // New field for subscription status (default: no)
    height: "", // New field for height in cm
    weight: "", // New field for weight in kg
    bmi: "", // Calculated BMI field
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
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

  // Calculate BMI from height and weight
  const calculateBMI = (height: string, weight: string) => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      // BMI = weight(kg) / height(m)^2
      const heightInMeters = h / 100;
      return (w / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return "";
  };

  // Update BMI when height or weight changes
  const handleHeightWeightChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    if (field === 'height' || field === 'weight') {
      const bmi = calculateBMI(
        field === 'height' ? value : formData.height,
        field === 'weight' ? value : formData.weight
      );
      newFormData.bmi = bmi;
    }
    
    setFormData(newFormData);
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

  // Utility function to scroll to error field
  const scrollToField = (fieldName: string) => {
    const element = document.querySelector(`[name="${fieldName}"]`) || 
                    document.querySelector(`[data-field="${fieldName}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Field validation function
  const validateField = (fieldName: string, value: string) => {
    const newFieldErrors = { ...fieldErrors };
    
    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          newFieldErrors.name = 'Name is required';
        } else {
          delete newFieldErrors.name;
        }
        break;
      case 'email':
        if (!value.trim()) {
          newFieldErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newFieldErrors.email = 'Please enter a valid email address';
        } else {
          delete newFieldErrors.email;
        }
        break;
      case 'mobile':
        if (!value.trim()) {
          newFieldErrors.mobile = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) {
          newFieldErrors.mobile = 'Please enter a valid 10-digit mobile number';
        } else {
          delete newFieldErrors.mobile;
        }
        break;
      case 'password':
        if (!value) {
          newFieldErrors.password = 'Password is required';
        } else if (value.length < 6) {
          newFieldErrors.password = 'Password must be at least 6 characters long';
        } else {
          delete newFieldErrors.password;
          // Also validate confirm password if it exists
          if (formData.confirmPassword && formData.confirmPassword !== value) {
            newFieldErrors.confirmPassword = 'Passwords do not match';
          } else if (formData.confirmPassword) {
            delete newFieldErrors.confirmPassword;
          }
        }
        break;
      case 'confirmPassword':
        if (!value) {
          newFieldErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          newFieldErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newFieldErrors.confirmPassword;
        }
        break;
    }
    
    setFieldErrors(newFieldErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    // Client-side validation with field-specific errors
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      errors.mobile = 'Please enter a valid 10-digit mobile number';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.gender) {
      errors.gender = 'Please select your gender';
    }
    
    if (isHomeClub && !formData.preferredSport) {
      errors.preferredSport = 'Please select your preferred sport';
    }
    
    if (isHomeClub && !formData.preferredTimeSlot) {
      errors.preferredTimeSlot = 'Please select your preferred time slot';
    }
    
    if (!formData.subscriptionType) {
      errors.subscriptionType = 'Please select a subscription type';
    }
    
    if (!formData.champType) {
      errors.champType = 'Please select your champion type';
    }
    
    if (!formData.subscribed) {
      errors.subscribed = 'Please select subscription status';
    }
    
    // Make preferred slots mandatory
    if (isHomeClub && !formData.preferredTimeSlot) {
      errors.preferredTimeSlot = 'Please select a preferred time slot';
    }

    // Court selection is only required for Shuttle Badminton
    if (formData.preferredSport === "Shuttle Badminton" && !formData.selectedCourt) {
      errors.selectedCourt = 'Please select a court for Shuttle Badminton';
    }

    // Check court availability before submission for Shuttle Badminton
    if (formData.preferredSport === "Shuttle Badminton" && courtAvailability && !courtAvailability.canBook) {
      errors.selectedCourt = 'Selected court is not available for the chosen time slot. Please select a different court or time slot.';
    }

    // If there are field errors, set them and scroll to first error
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      // Scroll to first error field
      const firstErrorField = Object.keys(errors)[0];
      setTimeout(() => scrollToField(firstErrorField), 100);
      return;
    }

    const subscriptionAmount = calculateMembershipPrice(settings, formData);

    const subscriptionEndDate = calculateEndDate(formData.subscriptionType);

    try {
      console.log('📝 Submitting registration:', {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        subscribed: formData.subscribed,
        subscriptionType: formData.subscriptionType,
        subscriptionAmount: subscriptionAmount
      });
      
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          club,
          mode: isHomeClub ? formData.mode : "fixed",
          coachingProgram: programFor(settings, formData).key,
          subscriptionAmount,
          subscriptionEndDate,
        }),
      });

      console.log('📡 Registration response status:', response.status);
      
      const data = await response.json();
      
      console.log('📊 Registration response data:', data);

      if (!response.ok) {
        console.error('❌ Registration failed:', data.message);
        throw new Error(data.message || "Registration failed");
      }

      console.log('✅ Registration successful!');
      
      const champIdMessage = data.user?.champId ? ` Your Champion ID is: ${data.user.champId}` : '';
      rememberClub(club);
      setSuccess(`Registration successful! Welcome to ${clubInfo?.name || "Sathiyan Sports"}.${champIdMessage} You can now login with your mobile number and password.`);
      setShowSuccessPopup(true);
      setFormData({
        name: "",
        email: "",
        mobile: "",
        password: "",
        confirmPassword: "",
        gender: "",
        champType: "",
        subscribed: "no",
        preferredSport: "",
        preferredTimeSlot: "",
        selectedCourt: "",
        subscriptionType: "",
        coachingProgram: "",
        role: "customer",
        comments: "",
        mode: "",
        height: "",
        weight: "",
        bmi: "",
      });
      setCourtAvailability(null);
      setAvailabilityMessage("");
    } catch (err: any) {
      console.error('❌ Registration error:', err);
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

        {/* Club first: it decides the programmes and fees below (fixed on a club's own site) */}
        {tenant.isDefault && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Club</InputLabel>
          <Select value={clubs.some((c) => c.slug === club) ? club : DEFAULT_CLUB} label="Club" onChange={(e) => setClub(String(e.target.value))}>
            {clubs.map((c) => (
              <MenuItem key={c.slug} value={c.slug}>
                {c.name}
                {c.city ? ` · ${c.city}` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        )}

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
            name="name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              validateField('name', e.target.value);
            }}
            error={!!fieldErrors.name}
            helperText={fieldErrors.name}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              validateField('email', e.target.value);
            }}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email || "Family members can share the same email address"}
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
            name="mobile"
            value={formData.mobile}
            onChange={(e) => {
              setFormData({ ...formData, mobile: e.target.value });
              validateField('mobile', e.target.value);
            }}
            error={!!fieldErrors.mobile}
            helperText={fieldErrors.mobile || "Family members can share the same mobile number"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone color="primary" />
                </InputAdornment>
              ),
            }}
            placeholder="Enter your 10-digit mobile number"
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              validateField('password', e.target.value);
            }}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
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
            placeholder="Enter your password (min 6 characters)"
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              validateField('confirmPassword', e.target.value);
            }}
            error={!!fieldErrors.confirmPassword}
            helperText={fieldErrors.confirmPassword}
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
            placeholder="Confirm your password"
          />

          {/* Gender Selection */}
          <FormControl fullWidth margin="normal" required error={!!fieldErrors.gender}>
            <FormLabel component="legend" data-field="gender">Gender</FormLabel>
            <RadioGroup
              row
              value={formData.gender}
              onChange={(e) => {
                setFormData({ ...formData, gender: e.target.value });
                if (fieldErrors.gender) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.gender;
                  setFieldErrors(newErrors);
                }
              }}
            >
              <FormControlLabel value="male" control={<Radio />} label="Male" />
              <FormControlLabel value="female" control={<Radio />} label="Female" />
              <FormControlLabel value="other" control={<Radio />} label="Other" />
            </RadioGroup>
            {fieldErrors.gender && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {fieldErrors.gender}
              </Typography>
            )}
            
          </FormControl>

          {/* Champion Type Selection */}
          <FormControl fullWidth margin="normal" required error={!!fieldErrors.champType}>
            <InputLabel data-field="champType">Champion Type</InputLabel>
            <Select
              value={formData.champType}
              label="Champion Type"
              onChange={(e) => {
                setFormData({ ...formData, champType: e.target.value });
                if (fieldErrors.champType) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.champType;
                  setFieldErrors(newErrors);
                }
              }}
            >
              <MenuItem value="kids">Kids</MenuItem>
              <MenuItem value="adult">Adult</MenuItem>
              <MenuItem value="veteran">Veteran</MenuItem>
            </Select>
            {fieldErrors.champType && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {fieldErrors.champType}
              </Typography>
            )}
          </FormControl>

          {/* Subscribed Selection */}
          <FormControl fullWidth margin="normal" required error={!!fieldErrors.subscribed}>
            <InputLabel data-field="subscribed">Subscribed</InputLabel>
            <Select
              value={formData.subscribed}
              label="Subscribed"
              onChange={(e) => {
                setFormData({ ...formData, subscribed: e.target.value });
                if (fieldErrors.subscribed) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.subscribed;
                  setFieldErrors(newErrors);
                }
              }}
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </Select>
            {fieldErrors.subscribed && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {fieldErrors.subscribed}
              </Typography>
            )}
          </FormControl>

          {/* Height, Weight, BMI Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
            Optional Health Information
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              margin="normal"
              label="Height (cm)"
              name="height"
              type="number"
              value={formData.height}
              onChange={(e) => handleHeightWeightChange('height', e.target.value)}
              InputProps={{
                inputProps: { min: 50, max: 300 }
              }}
              helperText="Enter height in centimeters"
              sx={{ flex: 1 }}
            />
            
            <TextField
              margin="normal"
              label="Weight (kg)"
              name="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => handleHeightWeightChange('weight', e.target.value)}
              InputProps={{
                inputProps: { min: 10, max: 300 }
              }}
              helperText="Enter weight in kilograms"
              sx={{ flex: 1 }}
            />
            
            <TextField
              margin="normal"
              label="BMI"
              name="bmi"
              value={formData.bmi}
              InputProps={{
                readOnly: true,
              }}
              helperText="Calculated automatically"
              sx={{ flex: 1 }}
            />
          </Box>

          {isHomeClub && (
          <>
          {/* Sport Selection */}
          <FormControl fullWidth margin="normal" required error={!!fieldErrors.preferredSport}>
            <InputLabel data-field="preferredSport">Preferred Sport</InputLabel>
            <Select
              value={formData.preferredSport}
              label="Preferred Sport"
              onChange={(e) => {
                setFormData({ ...formData, preferredSport: e.target.value });
                setCourtAvailability(null);
                if (fieldErrors.preferredSport) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.preferredSport;
                  setFieldErrors(newErrors);
                }
              }}
            >
              <MenuItem value="Cricket">Cricket</MenuItem>
              <MenuItem value="Football">Football</MenuItem>
              <MenuItem value="Shuttle Badminton">Shuttle Badminton</MenuItem>
              {CLASS_SPORTS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
              <MenuItem value="Functions and Events">Functions and Events</MenuItem>
            </Select>
            {fieldErrors.preferredSport && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {fieldErrors.preferredSport}
              </Typography>
            )}
          </FormControl>

          {/* Time Slot Selection - Required */}
          <FormControl fullWidth margin="normal" required error={!!fieldErrors.preferredTimeSlot}>
            <InputLabel data-field="preferredTimeSlot">Preferred Time Slot</InputLabel>
            <Select
              value={formData.preferredTimeSlot}
              label="Preferred Time Slot"
              onChange={(e) => {
                setFormData({ ...formData, preferredTimeSlot: e.target.value });
                setCourtAvailability(null);
                if (fieldErrors.preferredTimeSlot) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.preferredTimeSlot;
                  setFieldErrors(newErrors);
                }
              }}
            >
              {TIME_SLOTS.map((slot) => (
                <MenuItem key={slot} value={slot}>
                  {slot}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.preferredTimeSlot && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {fieldErrors.preferredTimeSlot}
              </Typography>
            )}
            
          </FormControl>

          {/* Court Availability Check for Shuttle Badminton */}
          {formData.preferredSport === "Shuttle Badminton" && formData.preferredTimeSlot && (
            <>
              <Box sx={{ mt: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => checkAvailability(formData.preferredTimeSlot)}
                  disabled={checkingAvailability || !formData.preferredTimeSlot}
                  sx={{ mr: 2 }}
                >
                  {checkingAvailability ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Checking...
                    </>
                  ) : (
                    "Check Court Availability"
                  )}
                </Button>
              </Box>

              {availabilityMessage && (
                <Box sx={{ mb: 2 }}>
                  <Alert 
                    severity={courtAvailability?.canBook ? "success" : "warning"} 
                    sx={{ mb: 1 }}
                  >
                    {availabilityMessage}
                  </Alert>
                  
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

              {courtAvailability?.suggestedCourts && courtAvailability.suggestedCourts.length > 0 && (
                <FormControl fullWidth margin="normal" required error={!!fieldErrors.selectedCourt}>
                  <InputLabel data-field="selectedCourt">Select Court</InputLabel>
                  <Select
                    value={formData.selectedCourt}
                    label="Select Court"
                    onChange={(e) => {
                      setFormData({ ...formData, selectedCourt: e.target.value });
                      if (fieldErrors.selectedCourt) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.selectedCourt;
                        setFieldErrors(newErrors);
                      }
                    }}
                  >
                    {courtAvailability.suggestedCourts.map((court: string) => (
                      <MenuItem key={court} value={court}>
                        Court {court}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.selectedCourt && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {fieldErrors.selectedCourt}
                    </Typography>
                  )}
                </FormControl>
              )}
            </>
          )}

          </>
          )}

          {/* Coaching programme — defaults to the programme for the chosen sport */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Coaching programme</InputLabel>
            <Select
              value={programFor(settings, formData).key}
              label="Coaching programme"
              onChange={(e) => setFormData({ ...formData, coachingProgram: e.target.value })}
            >
              {settings.membership.programs.map((p) => (
                <MenuItem key={p.key} value={p.key}>{p.name} — ₹{programMonthlyFee(p, formData.champType).toLocaleString("en-IN")}/month</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Mode Field - Moved before subscription type */}
          {isHomeClub && (
          <FormControl fullWidth margin="normal" required error={!!fieldErrors.mode}>
            <InputLabel data-field="mode">Mode</InputLabel>
            <Select
              value={formData.mode}
              label="Mode"
              onChange={(e) => {
                setFormData({ ...formData, mode: e.target.value });
                if (fieldErrors.mode) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.mode;
                  setFieldErrors(newErrors);
                }
              }}
            >
              <MenuItem value="fixed">Fixed timing</MenuItem>
              <MenuItem value="flexible">Flexible timing{flexiblePerMonth > 0 ? ` - additional ₹${flexiblePerMonth}/month` : ""}</MenuItem>
            </Select>
            {fieldErrors.mode && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {fieldErrors.mode}
              </Typography>
            )}
          </FormControl>
          )}

          {/* Subscription Type Selection */}
          <FormControl fullWidth margin="normal" required error={!!fieldErrors.subscriptionType}>
            <InputLabel data-field="subscriptionType">Subscription Type</InputLabel>
            <Select
              value={formData.subscriptionType}
              label="Subscription Type"
              onChange={(e) => {
                setFormData({ ...formData, subscriptionType: e.target.value });
                if (fieldErrors.subscriptionType) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.subscriptionType;
                  setFieldErrors(newErrors);
                }
              }}
            >
              <MenuItem value="monthly">
                Monthly - ₹{getPriceWithSurcharge(getCurrentPrices().monthly, flexibleSurcharge("monthly"))}
                {formData.mode === 'flexible' && flexiblePerMonth > 0 && ` (includes ₹${flexibleSurcharge("monthly")} flexible surcharge)`}
              </MenuItem>
              <MenuItem value="quarterly">
                Quarterly - ₹{getPriceWithSurcharge(getCurrentPrices().quarterly, flexibleSurcharge("quarterly"))}
                {formData.mode === 'flexible' && flexiblePerMonth > 0 && ` (includes ₹${flexibleSurcharge("quarterly")} flexible surcharge)`}
              </MenuItem>
              <MenuItem value="half yearly">
                Half Yearly - ₹{getPriceWithSurcharge(getCurrentPrices()["half yearly"], flexibleSurcharge("half yearly"))}
                {formData.mode === 'flexible' && flexiblePerMonth > 0 && ` (includes ₹${flexibleSurcharge("half yearly")} flexible surcharge)`}
              </MenuItem>
              <MenuItem value="yearly">
                Yearly - ₹{getPriceWithSurcharge(getCurrentPrices().yearly, flexibleSurcharge("yearly"))}
                {formData.mode === 'flexible' && flexiblePerMonth > 0 && ` (includes ₹${flexibleSurcharge("yearly")} flexible surcharge)`}
              </MenuItem>
            </Select>
            {fieldErrors.subscriptionType && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {fieldErrors.subscriptionType}
              </Typography>
            )}
          </FormControl>

          {/* Comments Field */}
          <TextField
            fullWidth
            margin="normal"
            label="Comments"
            name="comments"
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            multiline
            rows={3}
            placeholder="Any additional comments or notes..."
            error={!!fieldErrors.comments}
            helperText={fieldErrors.comments}
          />

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

          {/* Court availability warning */}
          {formData.preferredSport === "Shuttle Badminton" && 
           courtAvailability && 
           !courtAvailability.canBook && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Registration disabled: Please select an available court and time slot combination
            </Alert>
          )}

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2">
              Already have an account?{" "}
              <MuiLink component={Link} href="/auth/login" color="primary">
                Sign in here
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Registration Success Popup */}
      <RegistrationSuccessPopup
        open={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        userName={formData.name}
      />
    </Container>
  );
};
