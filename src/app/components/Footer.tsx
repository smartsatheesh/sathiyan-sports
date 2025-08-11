"use client";

import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Facebook,
  Instagram,
  Twitter,
  YouTube,
  Phone,
  Email,
  LocationOn,
  SportsSoccer,
  SportsTennis,
  FitnessCenter
} from '@mui/icons-material';

const Footer = () => {
  const theme = useTheme();

  const socialMedia = [
    { icon: <Facebook />, url: 'https://facebook.com/sathiyansports', label: 'Facebook' },
    { icon: <Instagram />, url: 'https://instagram.com/sathiyansports', label: 'Instagram' },
    { icon: <Twitter />, url: 'https://twitter.com/sathiyansports', label: 'Twitter' },
    { icon: <YouTube />, url: 'https://youtube.com/sathiyansports', label: 'YouTube' }
  ];

  const quickLinks = [
    { name: 'Book Slot', href: '/bookslot' },
    { name: 'My Bookings', href: '/my-bookings' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Admin', href: '/admin' }
  ];

  const sports = [
    { name: 'Cricket', icon: <SportsSoccer /> },
    { name: 'Football', icon: <SportsSoccer /> },
    { name: 'Badminton', icon: <SportsTennis /> },
    { name: 'Functions & Events', icon: <FitnessCenter /> }
  ];

  return (
    <Box
      component="footer"
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
        color: 'white',
        py: 6,
        mt: 'auto',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `url('/sathiyanlogo.jpeg')`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          opacity: 0.05,
          zIndex: 0
        }
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src="/sathiyanlogo.jpeg"
                  alt="Sathiyan Sports"
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    mr: 2,
                    border: '2px solid white'
                  }}
                />
                <Typography variant="h5" fontWeight="bold">
                  Sathiyan Sports
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                Premier sports facility offering world-class cricket, football, and badminton courts. 
                Experience the joy of sports in a professional environment with top-notch amenities.
              </Typography>
              
              {/* Contact Info */}
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Phone sx={{ fontSize: 16, mr: 1, opacity: 0.8 }} />
                  <Typography variant="body2">+91 98765 43210</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Email sx={{ fontSize: 16, mr: 1, opacity: 0.8 }} />
                  <Typography variant="body2">info@sathiyansports.com</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOn sx={{ fontSize: 16, mr: 1, opacity: 0.8 }} />
                  <Typography variant="body2">Chennai, Tamil Nadu, India</Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} md={2}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Quick Links
            </Typography>
            <Stack spacing={1}>
              {quickLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  color="inherit"
                  underline="hover"
                  sx={{
                    display: 'block',
                    opacity: 0.9,
                    transition: 'opacity 0.3s ease',
                    '&:hover': { opacity: 1 }
                  }}
                >
                  {link.name}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Sports Available */}
          <Grid item xs={12} md={3}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Sports Available
            </Typography>
            <Stack spacing={1}>
              {sports.map((sport) => (
                <Box key={sport.name} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ mr: 1, opacity: 0.8 }}>{sport.icon}</Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {sport.name}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>

          {/* Social Media & Hours */}
          <Grid item xs={12} md={3}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Connect With Us
            </Typography>
            
            {/* Social Media */}
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={1}>
                {socialMedia.map((social) => (
                  <IconButton
                    key={social.label}
                    component="a"
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'white',
                      backgroundColor: alpha('#ffffff', 0.1),
                      '&:hover': {
                        backgroundColor: alpha('#ffffff', 0.2),
                        transform: 'translateY(-2px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                    aria-label={social.label}
                  >
                    {social.icon}
                  </IconButton>
                ))}
              </Stack>
            </Box>

            {/* Opening Hours */}
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Opening Hours
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Mon - Fri: 5:00 AM - 11:00 PM
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Sat - Sun: 5:00 AM - 12:00 AM
              </Typography>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: alpha('#ffffff', 0.2) }} />

        {/* Bottom Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: { xs: 'center', md: 'left' }
          }}
        >
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            © {new Date().getFullYear()} Sathiyan Sports. All rights reserved.
          </Typography>
          
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mt: { xs: 2, md: 0 }
            }}
          >
            <Link href="/privacy" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>
              Privacy Policy
            </Link>
            <Link href="/terms" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>
              Terms of Service
            </Link>
            <Link href="/cancellation" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>
              Cancellation Policy
            </Link>
          </Box>
        </Box>

        {/* Floating Sports Icons */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            opacity: 0.1,
            fontSize: '4rem',
            animation: 'float 6s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-20px)' }
            }
          }}
        >
          🏏
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            opacity: 0.1,
            fontSize: '3rem',
            animation: 'float 4s ease-in-out infinite reverse',
          }}
        >
          ⚽
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
