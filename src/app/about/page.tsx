"use client";

import { Box, Typography, Container } from "@mui/material";

const AboutPage = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Typography
      variant="h4"
      align="center"
      gutterBottom
      sx={{
        fontWeight: 800,
        color: "primary.main",
        mb: 4,
      }}
    >
      About Sathiyan Sports
    </Typography>
    
    <Box className="divonabout">
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
  </Container>
);

export default AboutPage;
