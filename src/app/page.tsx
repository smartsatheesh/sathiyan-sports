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
  Divider,
  TextField,
  Grid,
  Chip,
  Stack,
  useTheme,
  alpha,
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
} from "@mui/icons-material";
import Link from "next/link";
import dynamic from "next/dynamic";
import Footer from "./components/Footer";
import TestimonialsSection from "./components/TestimonialsSection";
import FeaturesSection from "./components/FeaturesSection";

const Carousel = dynamic(() => import("./components/Slider"), { ssr: false });
const ThreeJSSportsScene = dynamic(() => import("./components/ThreeJSSportsScene"), { ssr: false });
const CarouselBackground3D = dynamic(() => import("./components/CarouselBackground3D"), { ssr: false });

const sectionKeys = ["home", "about", "contact"];

// Sports data for the landing page
const sportsData = [
  {
    name: "Cricket",
    icon: <SportsSoccer sx={{ fontSize: 40, color: "#4caf50" }} />,
    price: "₹699",
    weekendPrice: "₹999",
    features: ["Professional Pitch", "Equipment Available", "Changing Rooms"],
    description: "Experience cricket at its finest with our professional-grade facilities"
  },
  {
    name: "Football",
    icon: <SportsSoccer sx={{ fontSize: 40, color: "#2196f3" }} />,
    price: "₹699",
    weekendPrice: "₹999",
    features: ["FIFA Standard Turf", "Floodlights", "Goal Posts"],
    description: "Play football on our world-class turf with professional amenities"
  },
  {
    name: "Badminton",
    icon: <SportsTennis sx={{ fontSize: 40, color: "#ff9800" }} />,
    price: "₹699",
    weekendPrice: "₹999",
    features: ["4 Courts Available", "Professional Nets", "Indoor Facility"],
    description: "Indoor badminton courts with wooden flooring and professional setup"
  },
  {
    name: "Functions & Events",
    icon: <Event sx={{ fontSize: 40, color: "#9c27b0" }} />,
    price: "₹1,999/hr",
    weekendPrice: "₹2,499/hr",
    features: ["200+ Capacity", "A/V Equipment", "Catering Facilities"],
    description: "Host your special events in our spacious and well-equipped venue"
  }
];

const statsData = [
  { number: "5000+", label: "Happy Customers", icon: <EmojiEvents /> },
  { number: "50+", label: "Events Hosted", icon: <Event /> },
  { number: "24/7", label: "Available Hours", icon: <Schedule /> },
  { number: "4.9/5", label: "Customer Rating", icon: <Star /> }
];

export default function Home() {
  const [activeSection, setActiveSection] = useState("home");
  const [slideDirection, setSlideDirection] = useState("right");
  const prevSection = useRef("home");
  const theme = useTheme();

  // Listen for hash changes and update section
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") || "home";
      if (sectionKeys.includes(hash)) {
        setSlideDirection(
          sectionKeys.indexOf(hash) > sectionKeys.indexOf(prevSection.current)
            ? "right"
            : "left"
        );
        setActiveSection(hash);
        prevSection.current = hash;
      }
    };

    handleHashChange(); // On mount, set section based on hash
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
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
        {activeSection === "home" && (
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
                <ThreeJSSportsScene />
                
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
                <CarouselBackground3D />
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
                          {sport.icon}
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
        )}

        {/* About Section */}
        {activeSection === "about" && (
          <Container
            id="about"
            maxWidth="lg"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "80vh",
              py: 8
            }}
          >
            <Typography
              variant="h2"
              textAlign="center"
              sx={{
                mb: 6,
                fontWeight: 700,
                color: theme.palette.primary.main
              }}
            >
              About Sathiyan Sports
            </Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card
                  elevation={6}
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${alpha('#ffffff', 0.9)}, ${alpha(theme.palette.primary.light, 0.05)})`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h4"
                      color="primary"
                      gutterBottom
                      sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}
                    >
                      🎯 Our Vision
                    </Typography>
                    <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                      To inspire and empower people of all ages to lead active,
                      healthy lives by offering top-quality sports facilities,
                      inclusive programs, and strong community engagement. We envision
                      a future where sports becomes a way of life for everyone.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card
                  elevation={6}
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${alpha('#ffffff', 0.9)}, ${alpha(theme.palette.secondary.light, 0.05)})`,
                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h4"
                      color="secondary"
                      gutterBottom
                      sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}
                    >
                      🚀 Our Mission
                    </Typography>
                    <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                      To create safe, accessible, and professional multi-sport
                      environments—including football turfs, cricket nets, indoor
                      courts, and ball badminton arenas—where individuals can train,
                      play, and grow together in a supportive community.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        )}

        {/* Contact Section */}
        {activeSection === "contact" && (
          <Container
            id="contact"
            maxWidth="md"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "80vh",
              py: 8
            }}
          >
            <Paper
              elevation={8}
              sx={{
                p: { xs: 4, md: 6 },
                textAlign: "center",
                borderRadius: 4,
                width: "100%",
                maxWidth: "600px",
                background: `linear-gradient(135deg, ${alpha('#ffffff', 0.95)}, ${alpha(theme.palette.primary.light, 0.05)})`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Typography
                variant="h3"
                color="primary"
                gutterBottom
                sx={{
                  fontWeight: 800,
                  letterSpacing: 1,
                  fontSize: { xs: "2rem", md: "2.5rem" },
                  mb: 4
                }}
              >
                Contact Us
              </Typography>
              <Box
                component="form"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  width: "100%",
                  maxWidth: "450px",
                  mx: "auto"
                }}
                noValidate
                autoComplete="off"
              >
                <TextField
                  label="Name"
                  variant="outlined"
                  fullWidth
                  required
                  sx={{
                    bgcolor: "background.paper",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <TextField
                  label="Email"
                  variant="outlined"
                  fullWidth
                  required
                  type="email"
                  sx={{
                    bgcolor: "background.paper",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <TextField
                  label="Message"
                  variant="outlined"
                  fullWidth
                  required
                  multiline
                  rows={4}
                  sx={{
                    bgcolor: "background.paper",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    mt: 3,
                    py: 1.5,
                    px: 6,
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    fontWeight: 700,
                    borderRadius: 2,
                    width: "200px",
                    alignSelf: "center",
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[8]
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Send Message
                </Button>
              </Box>
            </Paper>
          </Container>
        )}
      </Box>
      
      {/* Footer */}
      <Footer />
    </>
  );
}