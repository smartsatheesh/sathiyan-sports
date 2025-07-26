"use client";

import { Box, Typography } from "@mui/material";
import Layout from "../components/Layout";

const AboutPage = () => (
  <Box className="divonabout">
    {/* <Typography variant="h4" gutterBottom>About Sathiyan Sports</Typography>
      <Typography  variant="h6" sx={{ mt: 4 }}>🎯 Our Vision</Typography>
      <Typography className='contentcss'>
        To inspire and empower individuals of all ages to lead an active and healthy lifestyle through quality sports facilities, inclusive programs, and community engagement.
      </Typography>
      <Typography variant="h6" sx={{ mt: 4 }}>🎯 Our Mission</Typography>
      <Typography className='contentcss'>
        To provide safe, accessible, and professional multi-sport environments including football turf, cricket nets, indoor courts, and ball badminton arenas where everyone can train, play, and grow together.
      </Typography> */}
    <div className="about-page">
      <div className="about-container">
        <h2 className="about-heading">🎯 Our Vision</h2>
        <p className="about-text">
          To inspire and empower people of all ages to lead active, healthy
          lives by offering top-quality sports facilities, inclusive programs,
          and strong community engagement.
        </p>

        <h2 className="about-heading">🎯 Our Mission</h2>
        <p className="about-text">
          To create safe, accessible, and professional multi-sport
          environments—including football turfs, cricket nets, indoor courts,
          and ball badminton arenas—where individuals can train, play, and grow
          together.
        </p>
      </div>
    </div>
  </Box>
);

export default AboutPage;
