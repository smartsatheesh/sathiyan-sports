'use client'

import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material'; 
import { useState } from 'react';

const SlotBookingPage = () => {
  const [sport, setSport] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Slot booked for ${sport} on ${date} at ${slot}`);
  };

  return (

      <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500 }}>
        <Typography variant="h6" gutterBottom>Book a Slot</Typography>

        <FormControl fullWidth margin="normal">
          <InputLabel>Sport</InputLabel>
          <Select value={sport} onChange={(e: SelectChangeEvent) => setSport(e.target.value)}>
            <MenuItem value="football">Football</MenuItem>
            <MenuItem value="cricket">Cricket</MenuItem>
            <MenuItem value="badminton">Ball Badminton</MenuItem>
            <MenuItem value="indoor">Indoor Court</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          type="date"
          label="Date"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          margin="normal"
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Time Slot</InputLabel>
          <Select value={slot} onChange={(e: SelectChangeEvent) => setSlot(e.target.value)}>
            <MenuItem value="6-7AM">6:00 AM – 7:00 AM</MenuItem>
            <MenuItem value="7-8AM">7:00 AM – 8:00 AM</MenuItem>
            <MenuItem value="4-5PM">4:00 PM – 5:00 PM</MenuItem>
            <MenuItem value="5-6PM">5:00 PM – 6:00 PM</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained">Book Now</Button>
        </Box>
      </Box>

  );
};

export default SlotBookingPage;
