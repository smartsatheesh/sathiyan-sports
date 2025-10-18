"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, Grid, useTheme, alpha, Zoom, Slide, Fade } from '@mui/material';
import { 
  Schedule, 
  Security, 
  SportsHandball, 
  Group, 
  LocalParking, 
  Wifi,
  Restaurant,
  LocalHospital,
  Psychology 
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
  },
  {
    icon: <Psychology sx={{ fontSize: 48 }} />,
    title: "AI-Powered Fitness Coach",
    description: "Personalized training programs and real-time coaching powered by artificial intelligence"
  }
];

const FeaturesSection = () => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for scroll animations (both up and down)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Reset and stagger the feature animations
            setVisibleFeatures([]); // Clear existing animations
            features.forEach((_, index) => {
              setTimeout(() => {
                setVisibleFeatures(prev => [...prev, index]);
              }, index * 150); // 150ms delay between each feature
            });
          } else {
            // When scrolling out of view, reset for next intersection
            setIsVisible(false);
            setVisibleFeatures([]);
          }
        });
      },
      {
        threshold: 0.2, // Increased threshold for better scroll detection
        rootMargin: '20px 0px -20px 0px' // Reduced margin for more precise triggering
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={sectionRef}
      sx={{
        py: 8,
        background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
      }}
    >
      <Container maxWidth="lg">
        <Zoom in={isVisible} timeout={600}>
          <Typography
            variant="h3"
            textAlign="center"
            sx={{
              mb: 2,
              fontWeight: 700,
              color: theme.palette.primary.main,
              transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
              opacity: isVisible ? 1 : 0,
              transition: 'all 0.6s ease-out'
            }}
          >
            Why Choose Sathiyan Sports?
          </Typography>
        </Zoom>
        
        <Fade in={isVisible} timeout={800} style={{ transitionDelay: '300ms' }}>
          <Typography
            variant="h6"
            textAlign="center"
            sx={{
              mb: 6,
              color: 'text.secondary',
              fontWeight: 400,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              opacity: isVisible ? 1 : 0,
              transition: 'all 0.6s ease-out 0.3s'
            }}
          >
            Experience the best in sports facilities and amenities
          </Typography>
        </Fade>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Slide 
                in={visibleFeatures.includes(index)} 
                direction="up" 
                timeout={600}
                style={{
                  transitionDelay: visibleFeatures.includes(index) ? `${index * 100}ms` : '0ms'
                }}
              >
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
                    transform: visibleFeatures.includes(index) ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.9)',
                    opacity: visibleFeatures.includes(index) ? 1 : 0,
                    '&:hover': {
                      transform: 'translateY(-5px) scale(1.02)',
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
              </Slide>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default FeaturesSection;
