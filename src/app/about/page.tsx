'use client'

import { Box, Typography } from '@mui/material';
import Layout from '../components/Layout';

const AboutPage = () => (

    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h4" gutterBottom>About Sathiyan Sports</Typography>

      <Typography variant="h6" sx={{ mt: 4 }}>🎯 Our Vision</Typography>
      <Typography>
        To inspire and empower individuals of all ages to lead an active and healthy lifestyle through quality sports facilities, inclusive programs, and community engagement.
      </Typography>

      <Typography variant="h6" sx={{ mt: 4 }}>🎯 Our Mission</Typography>
      <Typography>
        To provide safe, accessible, and professional multi-sport environments including football turf, cricket nets, indoor courts, and ball badminton arenas where everyone can train, play, and grow together.
      </Typography>
    </Box>

);

export default AboutPage;
