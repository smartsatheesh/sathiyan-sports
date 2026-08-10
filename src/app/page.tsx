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
  Fade,
  Zoom,
  Slide,
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
  Groups,
  EventAvailable,
  FitnessCenter,
} from "@mui/icons-material";
import Link from "next/link";
import dynamic from "next/dynamic";
import Footer from "./components/Footer";
import TestimonialsSection from "./components/TestimonialsSection";
import FeaturesSection from "./components/FeaturesSection";
import StaticHeroBackground from "./components/StaticHeroBackground";
import AnimatedSportsBackground from "./components/AnimatedSportsBackground";

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
    price: "₹1000 / 2 hrs",
    weekendPrice: "Weekend: ₹800 / hr",
    features: ["Professional Pitch", "Equipment Available", "Changing Rooms"],
    description: "Experience cricket at its finest with our professional-grade facilities"
  },
  {
    name: "Football",
    icon: () => <SportsSoccer sx={{ fontSize: 40, color: "#2196f3" }} />,
    price: "₹1000 / 2 hrs",
    weekendPrice: "Weekend: ₹800 / hr",
    features: ["FIFA Standard Turf", "Floodlights", "Goal Posts"],
    description: "Play football on our world-class turf with professional amenities"
  },
  {
    name: "Badminton",
    icon: () => <SportsTennis sx={{ fontSize: 40, color: "#ff9800" }} />,
    price: "₹400/hr",
    weekendPrice: "Coaching: ₹1500",
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
  },
];

// Animated taglines that pop and hide
const animatedTaglines = [
  "Where Passion Meets Purpose & Performance",
  "Your Journey to Excellence Starts Here",
  "Unleash Your Sporting Potential",
  "Where Champions Are Made",
  "Excellence in Every Game",
];

export default function Home() {
  const [shouldLoad3D, setShouldLoad3D] = useState(false);
  const [shouldLoadCarousel3D, setShouldLoadCarousel3D] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    totalEvents: 6,
    totalFitnessEnrollments: 0,
    averageRating: 5,
  });
  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0);
  const [showTagline, setShowTagline] = useState(true);
  const theme = useTheme();

  // Fetch dynamic stats with timeout
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('/api/public-stats', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (data.success) {
          setStats(prev => ({ ...prev, ...data.stats, totalEvents: 6, averageRating: 5 }));
        }
      } catch (error) {
        console.log('Could not fetch stats, using fallbacks');
      }
    };
    fetchStats();
  }, []);

  // Animated tagline rotation
  useEffect(() => {
    const taglineInterval = setInterval(() => {
      setShowTagline(false);
      setTimeout(() => {
        setCurrentTaglineIndex((prev) => (prev + 1) % animatedTaglines.length);
        setShowTagline(true);
      }, 500);
    }, 4000);

    return () => clearInterval(taglineInterval);
  }, []);

  // Dynamic stats data based on API response
  const statsData = [
    { number: stats.totalUsers.toLocaleString() + "+", label: "Happy Members", icon: <Groups /> },
    { number: stats.totalEvents.toLocaleString() + "+", label: "Events Hosted", icon: <EventAvailable /> },
    { number: "24/7", label: "Available Hours", icon: <Schedule /> },
    { number: stats.averageRating + "/5", label: "Customer Rating", icon: <Star /> }
  ];

  // Progressive loading strategy
  useEffect(() => {
    // Don't load 3D scene - use static/animated backgrounds instead for better performance
    // Add a safety timeout to ensure page loads even if something hangs
    const timer = setTimeout(() => {
      setShouldLoad3D(false); // Keep 3D disabled
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Keep facilities section static while preserving deferred 3D carousel loading.
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadCarousel3D(true);
    }, 300);

    return () => clearTimeout(timer);
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
            <Box
              sx={{
                width: "100vw",
                position: "relative",
                minHeight: '100vh',
              }}
            >
              <Box sx={{ 
                height: "100%",
                width: "100%",
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                position: 'relative',
                overflow: 'visible'
              }}>
                {/* Static background loads immediately */}
                <StaticHeroBackground />
                
                {/* Animated Sports Background */}
                <AnimatedSportsBackground />
                
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
                
                {/* Loading indicator - disabled for performance */}
                
                {/* Minimal overlay for branding */}
                <Box
                  sx={{
                    position: 'relative',
                    zIndex: 10,
                    textAlign: 'center',
                    width: { xs: '100%', md: '90%' },
                    height: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: { xs: '20px', md: '40px' },
                    pt: { xs: '60px', md: '72px' },
                    py: { xs: 2, md: 3 },
                    mx: 'auto',
                    overflow: 'visible'
                  }}
                >
                  {/* ===== SPORTS ANIMATION HERO ===== */}
                  <Box
                    sx={{
                      position: 'relative',
                      width: { xs: '220px', md: '300px', lg: '340px' },
                      height: { xs: '220px', md: '300px', lg: '340px' },
                      mx: 'auto',
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Outer pulsing ring */}
                    {[0, 1, 2].map((i) => (
                      <Box key={i} sx={{
                        position: 'absolute',
                        borderRadius: '50%',
                        border: `2px solid rgba(255,215,0,${0.5 - i * 0.15})`,
                        width: `${100 + i * 40}%`,
                        height: `${100 + i * 40}%`,
                        animation: `ringExpand 2.4s ease-out ${i * 0.8}s infinite`,
                      }} />
                    ))}

                    {/* Starburst background */}
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      animation: 'starburstRotate 12s linear infinite',
                      opacity: 0.15,
                      background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,215,0,0.8) 10deg, transparent 20deg, transparent 40deg, rgba(255,107,53,0.8) 50deg, transparent 60deg, transparent 80deg, rgba(255,215,0,0.8) 90deg, transparent 100deg, transparent 120deg, rgba(32,178,170,0.8) 130deg, transparent 140deg, transparent 160deg, rgba(255,215,0,0.8) 170deg, transparent 180deg, transparent 200deg, rgba(255,107,53,0.8) 210deg, transparent 220deg, transparent 240deg, rgba(255,215,0,0.8) 250deg, transparent 260deg, transparent 280deg, rgba(32,178,170,0.8) 290deg, transparent 300deg, transparent 320deg, rgba(255,215,0,0.8) 330deg, transparent 340deg, transparent 360deg)',
                      borderRadius: '50%',
                    }} />

                    {/* Orbiting footballs */}
                    {[
                      { delay: '0s', size: '38px', emoji: '⚽', animDuration: '3.5s' },
                      { delay: '-1.17s', size: '30px', emoji: '🏸', animDuration: '3.5s' },
                      { delay: '-2.33s', size: '32px', emoji: '🏏', animDuration: '3.5s' },
                    ].map((ball, i) => (
                      <Box key={i} sx={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        animation: `sportOrbit ${ball.animDuration} linear ${ball.delay} infinite`,
                      }}>
                        <Box sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          fontSize: ball.size,
                          transform: 'translate(-50%, -50%)',
                          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                          lineHeight: 1,
                        }}>
                          {ball.emoji}
                        </Box>
                      </Box>
                    ))}

                    {/* Main kicking football */}
                    <Box sx={{
                      position: 'absolute',
                      fontSize: { xs: '52px', md: '72px' },
                      animation: 'footballKick 2.8s cubic-bezier(0.4,0,0.2,1) infinite',
                      filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.7))',
                      zIndex: 5,
                      lineHeight: 1,
                    }}>
                      ⚽
                    </Box>

                    {/* Kick flash effect */}
                    <Box sx={{
                      position: 'absolute',
                      width: '80%',
                      height: '80%',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(255,220,0,0.9) 0%, rgba(255,107,53,0.5) 40%, transparent 70%)',
                      animation: 'kickFlash 2.8s ease-in-out infinite',
                      zIndex: 4,
                    }} />

                    {/* Center Logo */}
                    <Box sx={{
                      position: 'relative',
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: { xs: '130px', md: '180px' },
                      height: { xs: '130px', md: '180px' },
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(0,0,0,0.6))',
                      backdropFilter: 'blur(12px)',
                      border: '3px solid rgba(255,215,0,0.7)',
                      animation: 'logo3DPulse 4s ease-in-out infinite',
                      boxShadow: '0 0 40px rgba(255,215,0,0.3), inset 0 0 30px rgba(0,0,0,0.4)',
                    }}>
                      <Box
                        component="img"
                        src="/sathiyanlogo.png"
                        alt="Sathiyan Sports"
                        sx={{
                          width: { xs: '80px', md: '110px' },
                          height: { xs: '80px', md: '110px' },
                          objectFit: 'contain',
                          animation: 'logoFloat 5s ease-in-out infinite',
                          filter: 'drop-shadow(0 4px 12px rgba(255,215,0,0.5))',
                          borderRadius: '50%',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Club name with animated reveal */}
                  <Zoom in={true} timeout={1000}>
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 900,
                        mb: 1,
                        fontSize: { xs: '1.7rem', md: '2.8rem', lg: '3.2rem' },
                        lineHeight: 1.2,
                        textAlign: 'center',
                        fontFamily: '"Orbitron", "Roboto", "Arial Black", sans-serif',
                        textTransform: 'uppercase',
                        animation: 'sportsTextGlow 3s ease-in-out infinite',
                        color: '#FFD700',
                        position: 'relative',
                      }}
                    >
                      SATHIYAN MULTISPORT CLUB
                    </Typography>
                  </Zoom>
                  
                  <Box sx={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Fade in={showTagline} timeout={500}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          background: `linear-gradient(45deg, #1565C0, #E65100)`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          fontSize: { xs: '1.5rem', md: '2rem' },
                          textAlign: 'center',
                          letterSpacing: '0.02em'
                        }}
                      >
                        {animatedTaglines[currentTaglineIndex]}
                      </Typography>
                    </Fade>
                  </Box>

                  {/* Independence Day Tournament Card - Inside Hero */}
                  <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto', mb: 3, mt: 2, zIndex: 5, px: { xs: 0, md: 0 } }}>
                    <Card
                      sx={{
                        borderRadius: 4,
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        background: `linear-gradient(135deg, ${alpha('#0f4c81', 0.95)} 0%, ${alpha('#ff9933', 0.85)} 55%, ${alpha('#138808', 0.8)} 100%)`,
                        color: '#fff',
                        boxShadow: theme.shadows[10],
                        overflow: 'hidden',
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={8}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                              <Box
                                component="img"
                                src="/sathiyanlogo.png"
                                alt="Sathiyan Sports"
                                sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#fff', p: 0.5 }}
                              />
                              <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                                Sathiyan Sports 1st Ever Independence Day Tournament
                              </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ opacity: 0.95, mb: 1.2 }}>
                              Freedom to be Fit
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.95 }}>
                              Register now with easy Pay Now / Pay Later options. Categories available for Adult and Veteran players.
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Stack spacing={1.2} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                              <Chip label="Registration Fee: ₹600" sx={{ bgcolor: '#fff', color: '#0f4c81', fontWeight: 800 }} />
                              <Button
                                component={Link}
                                href="/tournaments/register"
                                variant="contained"
                                sx={{
                                  bgcolor: '#fff',
                                  color: '#0f4c81',
                                  fontWeight: 800,
                                  '&:hover': { bgcolor: '#f4f8ff' }
                                }}
                              >
                                Register for Tournament
                              </Button>
                            </Stack>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Box>

                  {/* Explore Our Facilities - shown before Limited Time Offers */}
                  <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto', mb: 6, mt: 4, zIndex: 5 }}>
                    <Zoom in={true} timeout={600}>
                      <Typography
                        variant="h3"
                        textAlign="center"
                        sx={{
                          mb: 4,
                          fontWeight: 700,
                          color: '#ffffff',
                          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                          transform: 'translateY(0)',
                          opacity: 1,
                          transition: 'all 0.6s ease-out'
                        }}
                      >
                        Explore Our Facilities
                      </Typography>
                    </Zoom>
                    <Fade in={true} timeout={800}>
                      <Paper
                        elevation={8}
                        sx={{
                          borderRadius: 4,
                          overflow: 'hidden',
                          boxShadow: theme.shadows[12],
                          position: 'relative',
                          transform: 'translateY(0) scale(1)',
                          opacity: 1,
                          transition: 'all 0.3s ease-out'
                        }}
                      >
                        {shouldLoadCarousel3D && <CarouselBackground3D />}
                        <Carousel />
                      </Paper>
                    </Fade>
                  </Box>

                  {/* SPECIAL OFFERS SECTION - Inside Hero */}
                  <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto', mb: 8, mt: 4, zIndex: 5 }}>
                    <Typography
                      variant="h4"
                      textAlign="center"
                      sx={{
                        mb: 3,
                        fontWeight: 800,
                        color: '#FFFFFF',
                        fontSize: { xs: '1.8rem', md: '2.2rem' },
                        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: -10,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '80px',
                          height: '3px',
                          background: '#FFD700',
                          borderRadius: '2px'
                        }
                      }}
                    >
                      ⚡ LIMITED TIME OFFERS ⚡
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      {/* Body Zorb Offer Card */}
                      <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex' }}>
                        <Card
                          sx={{
                            background: `linear-gradient(135deg, #FF6B6B, #FF8E8E)`,
                            border: `3px solid #FF3333`,
                            borderRadius: 3,
                            p: 2.5,
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: `0 0 30px ${alpha('#FF6B6B', 0.5)}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            '&:hover': {
                              transform: 'translateY(-8px)',
                              boxShadow: `0 0 40px ${alpha('#FF6B6B', 0.7)}`
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '3px',
                              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
                              animation: 'shimmer 2s infinite'
                            }
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                              color: '#000',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '50px',
                              fontWeight: 'bold',
                              fontSize: '0.7rem',
                              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                              zIndex: 10,
                              animation: 'pulse 1.5s ease-in-out infinite'
                            }}
                          >
                            50% OFF
                          </Box>

                          <FitnessCenter sx={{ fontSize: 40, color: '#FFFFFF', mb: 1, mt: 1 }} />
                          <Typography variant="h6" fontWeight="bold" sx={{ color: '#FFFFFF', mb: 0.5 }}>
                            Body Zorb
                          </Typography>
                          <Box sx={{ mb: 1, textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'line-through', mb: 0.5, display: 'block' }}>
                              Regular: ₹2000
                            </Typography>
                            <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 'bold' }}>
                              ₹1000
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem' }}>
                            Limited Offer
                          </Typography>
                        </Card>
                      </Grid>

                      {/* Cricket Offer Card */}
                      <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex' }}>
                        <Card
                          sx={{
                            background: `linear-gradient(135deg, #4CAF50, #66BB6A)`,
                            border: `3px solid #2E7D32`,
                            borderRadius: 3,
                            p: 2.5,
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: `0 0 30px ${alpha('#4CAF50', 0.5)}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            '&:hover': {
                              transform: 'translateY(-8px)',
                              boxShadow: `0 0 40px ${alpha('#4CAF50', 0.7)}`
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '3px',
                              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
                              animation: 'shimmer 2s infinite'
                            }
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                              color: '#000',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '50px',
                              fontWeight: 'bold',
                              fontSize: '0.7rem',
                              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                              zIndex: 10,
                              animation: 'pulse 1.5s ease-in-out infinite'
                            }}
                          >
                            20% OFF
                          </Box>

                          <SportsCricket sx={{ fontSize: 40, color: '#FFFFFF', mb: 1, mt: 1 }} />
                          <Typography variant="h6" fontWeight="bold" sx={{ color: '#FFFFFF', mb: 0.5 }}>
                            Cricket
                          </Typography>
                          <Box sx={{ mb: 1, textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'line-through', mb: 0.5, display: 'block' }}>
                              Weekday (2 hrs): ₹1000
                            </Typography>
                            <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 'bold' }}>
                              ₹800/hr
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem' }}>
                            Limited Offer
                          </Typography>
                        </Card>
                      </Grid>

                      {/* Football Offer Card */}
                      <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex' }}>
                        <Card
                          sx={{
                            background: `linear-gradient(135deg, #2196F3, #42A5F5)`,
                            border: `3px solid #1565C0`,
                            borderRadius: 3,
                            p: 2.5,
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: `0 0 30px ${alpha('#2196F3', 0.5)}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            '&:hover': {
                              transform: 'translateY(-8px)',
                              boxShadow: `0 0 40px ${alpha('#2196F3', 0.7)}`
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '3px',
                              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
                              animation: 'shimmer 2s infinite'
                            }
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                              color: '#000',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '50px',
                              fontWeight: 'bold',
                              fontSize: '0.7rem',
                              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                              zIndex: 10,
                              animation: 'pulse 1.5s ease-in-out infinite'
                            }}
                          >
                            20% OFF
                          </Box>

                          <SportsSoccer sx={{ fontSize: 40, color: '#FFFFFF', mb: 1, mt: 1 }} />
                          <Typography variant="h6" fontWeight="bold" sx={{ color: '#FFFFFF', mb: 0.5 }}>
                            Football
                          </Typography>
                          <Box sx={{ mb: 1, textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'line-through', mb: 0.5, display: 'block' }}>
                              Weekday (2 hrs): ₹1000
                            </Typography>
                            <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 'bold' }}>
                              ₹800/hr
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem' }}>
                            Limited Offer
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2} 
                    sx={{ 
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: '500px',
                      mx: 'auto'
                    }}
                  >
                    <Button
                      component={Link}
                      href="/register"
                      variant="contained"
                      size="large"
                      sx={{
                        px: { xs: 3, sm: 4 },
                        py: 1.5,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        fontWeight: 'bold',
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        boxShadow: theme.shadows[8],
                        minWidth: { xs: '140px', sm: '160px' },
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
                        px: { xs: 3, sm: 4 },
                        py: 1.5,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        fontWeight: 'bold',
                        borderWidth: 2,
                        backgroundColor: alpha('#ffffff', 0.9),
                        backdropFilter: 'blur(10px)',
                        minWidth: { xs: '140px', sm: '160px' },
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

                  {/* Quick stats in content flow to avoid overlap with decorative layers */}
                  <Box
                    sx={{
                      mt: { xs: 4, md: 5 },
                      mx: 'auto',
                      width: '100%',
                      maxWidth: '1200px',
                      background: `linear-gradient(90deg, ${alpha('#000000', 0.6)}, ${alpha('#000000', 0.35)})`,
                      borderRadius: 3,
                      p: { xs: 2, md: 3 },
                      backdropFilter: 'blur(15px)',
                      border: `1px solid ${alpha('#ffffff', 0.2)}`,
                      position: 'relative',
                      zIndex: 12,
                    }}
                  >
                    <Grid container spacing={3}>
                      {statsData.map((stat, index) => (
                        <Grid item xs={6} sm={3} key={index}>
                          <Zoom in={true} timeout={1000 + (index * 200)}>
                            <Box
                              sx={{
                                textAlign: 'center',
                                color: 'white',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  transition: 'transform 0.3s ease'
                                }
                              }}
                            >
                              <Box
                                sx={{
                                  color: theme.palette.primary.light,
                                  mb: 1,
                                  fontSize: '2rem',
                                  animation: 'pulse 2s infinite'
                                }}
                              >
                                {stat.icon}
                              </Box>
                              <Typography
                                variant="h5"
                                fontWeight="bold"
                                sx={{
                                  background: `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.secondary.light})`,
                                  backgroundClip: 'text',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                  fontSize: { xs: '1.2rem', md: '1.5rem' }
                                }}
                              >
                                {stat.number}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                                {stat.label}
                              </Typography>
                            </Box>
                          </Zoom>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>



              </Box>
            </Box>

            {/* Sports Cards Section */}
            <Container maxWidth="lg" sx={{ py: 8 }}>
              <Zoom in={true} timeout={600}>
                <Typography
                  variant="h3"
                  textAlign="center"
                  sx={{
                    mb: 6,
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    transform: 'translateY(0)',
                    opacity: 1,
                    transition: 'all 0.6s ease-out'
                  }}
                >
                  Our Sports Facilities
                </Typography>
              </Zoom>
              
              <Grid container spacing={4}>
                {sportsData.map((sport, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Slide in={true} direction="up" timeout={600}>
                      <Card
                        sx={{
                          height: '100%',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          transform: 'translateY(0) scale(1)',
                          opacity: 1,
                          '&:hover': {
                            transform: 'translateY(-12px) scale(1.02)',
                            boxShadow: `0 15px 35px ${alpha(theme.palette.primary.main, 0.3)}`,
                            '& .sport-icon': {
                              transform: 'scale(1.2) rotate(10deg)',
                            }
                          },
                          background: `linear-gradient(135deg, ${alpha('#ffffff', 0.95)}, ${alpha(theme.palette.primary.light, 0.08)})`,
                          backdropFilter: 'blur(15px)',
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                          borderRadius: 3,
                          overflow: 'hidden',
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            opacity: 1,
                            transition: 'opacity 0.6s ease'
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `radial-gradient(circle at center, ${alpha(theme.palette.primary.main, 0.05)}, transparent 70%)`,
                            opacity: 1,
                            transition: 'opacity 1s ease 0.3s',
                            pointerEvents: 'none'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                          <Box 
                            className="sport-icon"
                            sx={{ 
                              mb: 2, 
                              transition: 'transform 0.3s ease',
                              '& > svg': {
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                              }
                            }}
                          >
                            {sport.icon()}
                          </Box>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {sport.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                            {sport.description}
                          </Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography 
                              variant="h6" 
                              sx={{
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 'bold'
                              }}
                            >
                              {sport.price}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Weekends: {sport.weekendPrice}
                            </Typography>
                          </Box>

                          <Stack spacing={0.5}>
                            {sport.features.map((feature, idx) => (
                              <Fade 
                                in={true}
                                timeout={800 + (idx * 150)}
                                key={idx}
                              >
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  transform: 'translateX(0)',
                                  transition: 'all 0.3s ease'
                                }}>
                                  <CheckCircle sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                                  <Typography variant="caption" sx={{ fontWeight: 500 }}>{feature}</Typography>
                                </Box>
                              </Fade>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Slide>
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