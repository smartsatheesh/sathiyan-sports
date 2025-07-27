"use client";
import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Divider,
  Stack,
  useTheme,
  Alert,
  Container,
} from "@mui/material";

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [gender, setGender] = useState("");
  const [interest, setInterest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const theme = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setSuccess("Registration successful!");
      setFormData({ name: "", email: "", phone: "" });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper
        elevation={6}
        sx={{
          maxWidth: 500,
          width: "100%",
          borderRadius: 4,
          p: 3,
          bgcolor: "background.paper",
        }}
      >
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <Stack spacing={2}>
            <Typography
              variant="h5"
              color="primary"
              align="center"
              sx={{ fontWeight: 700, letterSpacing: 1 }}
              gutterBottom
            >
              SATHIYAN MULTISPORTS CLUB
            </Typography>
            <Divider />

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

            <TextField
              fullWidth
              label="Your Good Name"
              required
              margin="normal"
              variant="outlined"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Email"
              required
              margin="normal"
              variant="outlined"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Mobile Number"
              required
              margin="normal"
              variant="outlined"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <TextField
              fullWidth
              type="number"
              label="Age"
              required
              margin="normal"
              variant="outlined"
            />

            <Typography sx={{ mt: 1, fontWeight: 500 }}>Gender</Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={gender}
              onChange={(e, val) => setGender(val)}
              sx={{ mb: 1 }}
              color="primary"
            >
              <ToggleButton value="Female">Female</ToggleButton>
              <ToggleButton value="Male">Male</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              fullWidth
              label="Schedule"
              required
              margin="normal"
              variant="outlined"
            />

            <Typography
              sx={{
                mt: 1,
                fontSize: 15,
                color: "text.secondary",
                textAlign: "center",
              }}
            >
              If you are really interested then you can win our free
              subscription offer! <b>T&C Applied</b>
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={interest}
              onChange={(e, val) => setInterest(val)}
              sx={{ mb: 1 }}
              color="secondary"
            >
              <ToggleButton value="No">Not Interested</ToggleButton>
              <ToggleButton value="Yes">Interested</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              fullWidth
              label="Address"
              required
              margin="normal"
              variant="outlined"
            />

            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              sx={{ mt: 2 }}
            >
              <Button type="reset" variant="outlined" color="secondary">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? "Registering..." : "Register"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegistrationForm;
