"use client";

import React from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, Avatar, Rating, useTheme, alpha } from '@mui/material';
import { FormatQuote } from '@mui/icons-material';

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Cricket Enthusiast",
    avatar: "RK",
    rating: 5,
    comment: "Amazing facilities! The cricket pitch is well-maintained and the equipment is top-notch. Highly recommend for serious players."
  },
  {
    name: "Priya Sharma",
    role: "Football Player",
    avatar: "PS",
    rating: 5,
    comment: "The football turf is fantastic! FIFA standard quality and excellent lighting for evening games. Great booking system too."
  },
  {
    name: "Vikram Singh",
    role: "Badminton Coach",
    avatar: "VS",
    rating: 4,
    comment: "Professional badminton courts with proper wooden flooring. Perfect for training sessions and tournaments."
  },
  {
    name: "Meera Patel",
    role: "Event Organizer",
    avatar: "MP",
    rating: 5,
    comment: "Hosted our company event here. Excellent space, great catering facilities, and wonderful staff support!"
  }
];

const TestimonialsSection = () => {
  const theme = useTheme();

  return (
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
        What Our Customers Say
      </Typography>
      
      <Grid container spacing={4}>
        {testimonials.map((testimonial, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                position: 'relative',
                background: `linear-gradient(135deg, ${alpha('#ffffff', 0.9)}, ${alpha(theme.palette.primary.light, 0.05)})`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8]
                }
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box sx={{ position: 'absolute', top: 16, right: 16, opacity: 0.3 }}>
                  <FormatQuote sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                </Box>
                
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    mx: 'auto',
                    mb: 2,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    fontSize: '1.5rem',
                    fontWeight: 'bold'
                  }}
                >
                  {testimonial.avatar}
                </Avatar>
                
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {testimonial.name}
                </Typography>
                
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  {testimonial.role}
                </Typography>
                
                <Rating value={testimonial.rating} readOnly size="small" sx={{ mb: 2 }} />
                
                <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                  "{testimonial.comment}"
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default TestimonialsSection;
