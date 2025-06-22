// components/RegistrationForm.tsx
'use client'
import {
  TextField,
  Button,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useState } from 'react';

const RegistrationForm = () => {
  const [gender, setGender] = useState('');
  const [interest, setInterest] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send data to API or backend
    alert('Form Submitted');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500 }}>
      <Typography variant="h6" gutterBottom>Sathiyan MultiSport Club</Typography>
      <TextField fullWidth label="YourGoodName" required margin="normal" />
      <TextField fullWidth label="Mobile Number" required margin="normal" />
      <TextField fullWidth type="number" label="Age" required margin="normal" />

      <Typography sx={{ mt: 2 }}>Gender</Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={gender}
        onChange={(e, val) => setGender(val)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="Female">FeMale</ToggleButton>
        <ToggleButton value="Male">Male</ToggleButton>
        <ToggleButton value="None">Prefer Not To Say</ToggleButton>
      </ToggleButtonGroup>

      <TextField fullWidth label="Schedule" required margin="normal" />

      <Typography sx={{ mt: 2 }}>
        If you are really interested then you can win our free subscription offer! T&C Applied
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={interest}
        onChange={(e, val) => setInterest(val)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="No">Not Interested</ToggleButton>
        <ToggleButton value="Yes">Interested</ToggleButton>
      </ToggleButtonGroup>

      <TextField fullWidth label="Address" required margin="normal" />
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="reset" variant="outlined">Cancel</Button>
        <Button type="submit" variant="contained">Save</Button>
      </Box>
    </Box>
  );
};

export default RegistrationForm;
