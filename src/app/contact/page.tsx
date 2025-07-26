"use client";

import { Box, Button, Container, TextField, Typography } from "@mui/material";

export default function ContactPage() {
  return (
    <Container maxWidth="sm">
      <Box
        component="form"
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
        noValidate
        autoComplete="off"
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Contact Us
        </Typography>

        <TextField label="Name" variant="outlined" fullWidth required />
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          required
          type="email"
        />
        <TextField
          label="Message"
          variant="outlined"
          fullWidth
          required
          multiline
          rows={4}
        />

        <Button variant="contained" color="primary" size="large">
          Submit
        </Button>
      </Box>
    </Container>
  );
}
