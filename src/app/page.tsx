"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  Button,
  Box,
  Container,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  useTheme,
  alpha,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  SportsSoccer,
  SportsTennis,
  Event,
  Star,
  CheckCircle,
  TrendingUp,
  EmojiEvents,
  Schedule,
  SportsCricket,
} from "@mui/icons-material";
import Link from "next/link";
import dynamic from "next/dynamic";
import Footer from "./components/Footer";
import TestimonialsSection from "./components/TestimonialsSection";
import FeaturesSection from "./components/FeaturesSection";
import StaticHeroBackground from "./components/StaticHeroBackground";

const Carousel = dynamic(() => import("./components/Slider"), { ssr: false });
const ThreeJSSportsScene = dynamic(() => import("./components/ThreeJSSportsScene"), { 
  ssr: false,
  loading: () => (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
        color: "white"
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress size={60} sx={{ color: "white", mb: 2 }} />
        <Typography variant="h6">Loading 3D Experience...</Typography>
      </Box>
    </Box>
  )
});
const CarouselBackground3D = dynamic(() => import("./components/CarouselBackground3D"), { 
  ssr: false,
  loading: () => (
    <Box
      sx={{
        height: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(45deg, #f5f5f5, #e0e0e0)"
      }}
    >
      <CircularProgress size={40} />
    </Box>
  )
});



// Sports data for the landing page
const sportsData = [
  {
    name: "Cricket",
    icon: () => <SportsCricket sx={{ fontSize: 40, color: "#4caf50" }} />,
    price: "₹699",
    weekendPrice: "₹899 onwards",
    features: ["Professional Pitch", "Equipment Available", "Changing Rooms"],
    description: "Experience cricket at its finest with our professional-grade facilities"
  },
  {
    name: "Football",
    icon: () => <SportsSoccer sx={{ fontSize: 40, color: "#2196f3" }} />,
    price: "₹699",
    weekendPrice: "₹899 onwards",
    features: ["FIFA Standard Turf", "Floodlights", "Goal Posts"],
    description: "Play football on our world-class turf with professional amenities"
  },
  {
    name: "Badminton",
    icon: () => <SportsTennis sx={{ fontSize: 40, color: "#ff9800" }} />,
    price: "₹699",
    weekendPrice: "₹899 onwards",
    features: ["3 Courts Available", "Professional Nets", "Indoor Facility"],
    description: "Indoor badminton courts with wooden flooring and professional setup"
  },
  {
    name: "Functions & Events",
    icon: () => <Event sx={{ fontSize: 40, color: "#9c27b0" }} />,
    price: "₹1,999/hr",
    weekendPrice: "₹2,499/hr onwards",
    features: ["200+ Capacity", "A/V Equipment", "Catering Facilities"],
    description: "Host your special events in our spacious and well-equipped venue"
  }
];

const statsData = [
  { number: "19+", label: "Happy Customers", icon: <EmojiEvents /> },
  { number: "0+", label: "Events Hosted", icon: <Event /> },
  { number: "24/7", label: "Available Hours", icon: <Schedule /> },
  { number: "5/5", label: "Customer Rating", icon: <Star /> }
];

export default function Home() {
  const [shouldLoad3D, setShouldLoad3D] = useState(false);
  const [shouldLoadCarousel3D, setShouldLoadCarousel3D] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // Progressive loading strategy
  useEffect(() => {
    // Load main 3D scene after a short delay to prioritize initial content
    const timer1 = setTimeout(() => {
      setShouldLoad3D(true);
    }, 1000); // Load after 1 second

    return () => {
      clearTimeout(timer1);
    };
  }, []);

  // Intersection Observer for carousel 3D
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadCarousel3D(true);
            observer.disconnect(); // Stop observing once loaded
          }
        });
      },
      {
        threshold: 0.1, // Load when 10% of the element is visible
        rootMargin: '100px', // Start loading 100px before it comes into view
      }
    );

    if (carouselRef.current) {
      observer.observe(carouselRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
        }}
      >
        {/* Home Section - Full Screen 3D Hero + Original Content */}
        <Box>
            {/* Full Screen 3D Hero Section */}
            <Box sx={{ height: "100vh", width: "100vw", position: "relative" }}>
              <Box sx={{ 
                height: "100%",
                width: "100%",
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Static background loads immediately */}
                <StaticHeroBackground />
                
                {/* 3D Scene with smooth transition */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: shouldLoad3D ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                    zIndex: 1
                  }}
                >
                  {shouldLoad3D && <ThreeJSSportsScene />}
                </Box>
                
                {/* Loading indicator */}
                {!shouldLoad3D && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10,
                      textAlign: "center",
                      color: theme.palette.primary.main
                    }}
                  >
                    <CircularProgress size={60} sx={{ color: theme.palette.primary.main, mb: 2 }} />
                    <Typography variant="h6">Preparing 3D Experience...</Typography>
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                      This will only take a moment
                    </Typography>
                  </Box>
                )}
                
                {/* Minimal overlay for branding */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 32,
                    left: 32,
                    right: 32,
                    zIndex: 10,
                    textAlign: 'center'
                  }}
                >
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 2,
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Welcome to Sathiyan MultiSport Club 
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 400,
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 2,
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Where Passion Meets Purpose & Performance
                  </Typography>
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
                    <Button
                      component={Link}
                      href="/register"
                      variant="contained"
                      size="large"
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        boxShadow: theme.shadows[8],
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[12]
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Register Now
                    </Button>
                    <Button
                      component={Link}
                      href="/bookslot"
                      variant="outlined"
                      size="large"
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        borderWidth: 2,
                        backgroundColor: alpha('#ffffff', 0.9),
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          borderWidth: 2,
                          transform: 'translateY(-2px)',
                          backgroundColor: '#ffffff'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Book Now
                    </Button>
                  </Stack>
                </Box>

                {/* Bottom overlay with quick stats */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 32,
                    left: 32,
                    right: 32,
                    background: `linear-gradient(90deg, ${alpha('#000000', 0.6)}, ${alpha('#000000', 0.3)})`,
                    borderRadius: 3,
                    p: 3,
                    backdropFilter: 'blur(15px)',
                    border: `1px solid ${alpha('#ffffff', 0.2)}`
                  }}
                >
                  <Grid container spacing={3}>
                    {statsData.map((stat, index) => (
                      <Grid item xs={6} sm={3} key={index}>
                        <Box sx={{ textAlign: 'center', color: 'white' }}>
                          <Box sx={{ color: theme.palette.primary.light, mb: 1 }}>
                            {stat.icon}
                          </Box>
                          <Typography variant="h6" fontWeight="bold">
                            {stat.number}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            {stat.label}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            </Box>

            {/* Image Carousel Section - Moved after 3D animation */}
            <Container maxWidth="lg" sx={{ py: 8 }} ref={carouselRef}>
              <Typography
                variant="h3"
                textAlign="center"
                sx={{
                  mb: 6,
                  fontWeight: 700,
                  color: theme.palette.primary.main
                }}
              >
                Explore Our Facilities
              </Typography>
              <Paper
                elevation={8}
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: theme.shadows[12],
                  position: 'relative'
                }}
              >
                {shouldLoadCarousel3D ? (
                  <CarouselBackground3D />
                ) : (
                  <Box
                    sx={{
                      height: "400px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(45deg, #f5f5f5, #e0e0e0)"
                    }}
                  >
                    <Box sx={{ textAlign: "center" }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Loading 3D Background...
                      </Typography>
                    </Box>
                  </Box>
                )}
                <Carousel />
              </Paper>
            </Container>

            {/* Sports Cards Section */}
            <Container maxWidth="lg" sx={{ py: 8 }}>
              <Typography
                variant="h3"
                textAlign="center"
                sx={{
                  mb: 6,
                  fontWeight: 700,
                  color: theme.palette.primary.main
                }}
              >
                Our Sports Facilities
              </Typography>
              
              <Grid container spacing={4}>
                {sportsData.map((sport, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card
                      sx={{
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: theme.shadows[12]
                        },
                        background: `linear-gradient(135deg, ${alpha('#ffffff', 0.9)}, ${alpha(theme.palette.primary.light, 0.05)})`,
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                      }}
                    >
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Box sx={{ mb: 2 }}>
                          {sport.icon()}
                        </Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {sport.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {sport.description}
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" color="primary" fontWeight="bold">
                            {sport.price}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Weekends: {sport.weekendPrice}
                          </Typography>
                        </Box>

                        <Stack spacing={0.5}>
                          {sport.features.map((feature, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CheckCircle sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                              <Typography variant="caption">{feature}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Container>

            {/* Features Section */}
            <FeaturesSection />

            {/* Testimonials Section */}
            <TestimonialsSection />
          </Box>


      </Box>
      
      {/* Footer */}
      <Footer />
    </>
  );
}