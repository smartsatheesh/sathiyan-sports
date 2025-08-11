"use client";

import React from 'react';
import { Box, Container, Typography, Grid, useTheme, alpha } from '@mui/material';
import { 
  Schedule, 
  Security, 
  SportsHandball, 
  Group, 
  LocalParking, 
  Wifi,
  Restaurant,
  LocalHospital 
} from '@mui/icons-material';

const features = [
  {
    icon: <Schedule sx={{ fontSize: 48 }} />,
    title: "24/7 Availability",
    description: "Book your favorite sport anytime with our flexible scheduling system"
  },
  {
    icon: <Security sx={{ fontSize: 48 }} />,
    title: "Secure Facility",
    description: "CCTV monitoring and security personnel ensure a safe environment"
  },
  {
    icon: <SportsHandball sx={{ fontSize: 48 }} />,
    title: "Professional Equipment",
    description: "High-quality sports equipment and well-maintained facilities"
  },
  {
    icon: <Group sx={{ fontSize: 48 }} />,
    title: "Community Focus",
    description: "Join a vibrant community of sports enthusiasts and athletes"
  },
  {
    icon: <LocalParking sx={{ fontSize: 48 }} />,
    title: "Free Parking",
    description: "Ample parking space available for all visitors and players"
  },
  {
    icon: <Wifi sx={{ fontSize: 48 }} />,
    title: "Free WiFi",
    description: "Stay connected with complimentary high-speed internet access"
  },
  {
    icon: <Restaurant sx={{ fontSize: 48 }} />,
    title: "Refreshments",
    description: "On-site cafeteria with healthy snacks and beverages"
  },
  {
    icon: <LocalHospital sx={{ fontSize: 48 }} />,
    title: "First Aid",
    description: "Trained staff and first aid facilities for emergency situations"
  }
];

const FeaturesSection = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: 8,
        background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          textAlign="center"
          sx={{
            mb: 2,
            fontWeight: 700,
            color: theme.palette.primary.main
          }}
        >
          Why Choose Sathiyan Sports?
        </Typography>
        
        <Typography
          variant="h6"
          textAlign="center"
          sx={{
            mb: 6,
            color: 'text.secondary',
            fontWeight: 400
          }}
        >
          Experience the best in sports facilities and amenities
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                  height: '100%',
                  borderRadius: 3,
                  background: alpha('#ffffff', 0.8),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[8],
                    background: alpha('#ffffff', 0.95),
                    '& .feature-icon': {
                      transform: 'scale(1.1)',
                      color: theme.palette.secondary.main
                    }
                  }
                }}
              >
                <Box
                  className="feature-icon"
                  sx={{
                    color: theme.palette.primary.main,
                    mb: 2,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    justifyContent: 'center'
                  }}
                >
                  {feature.icon}
                </Box>
                
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ color: theme.palette.primary.main }}
                >
                  {feature.title}
                </Typography>
                
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.6
                  }}
                >
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default FeaturesSection;
