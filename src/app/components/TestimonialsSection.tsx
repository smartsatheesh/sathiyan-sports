"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, Avatar, Rating, useTheme, alpha, Zoom, Slide, Fade } from '@mui/material';
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
  const [isVisible, setIsVisible] = useState(false);
  const [visibleTestimonials, setVisibleTestimonials] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for scroll animations (both up and down)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Reset and stagger the testimonial animations
            setVisibleTestimonials([]); // Clear existing animations
            testimonials.forEach((_, index) => {
              setTimeout(() => {
                setVisibleTestimonials(prev => [...prev, index]);
              }, index * 200); // 200ms delay between each testimonial
            });
          } else {
            // When scrolling out of view, reset for next intersection
            setIsVisible(false);
            setVisibleTestimonials([]);
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
    <Container maxWidth="lg" sx={{ py: 8 }} ref={sectionRef}>
      <Zoom in={isVisible} timeout={600}>
        <Typography
          variant="h3"
          textAlign="center"
          sx={{
            mb: 6,
            fontWeight: 700,
            color: theme.palette.primary.main,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.6s ease-out'
          }}
        >
          What Our Customers Say
        </Typography>
      </Zoom>
      
      <Grid container spacing={4}>
        {testimonials.map((testimonial, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Slide 
              in={visibleTestimonials.includes(index)} 
              direction="up" 
              timeout={700}
              style={{
                transitionDelay: visibleTestimonials.includes(index) ? `${index * 150}ms` : '0ms'
              }}
            >
              <Card
                sx={{
                  height: '100%',
                  position: 'relative',
                  background: `linear-gradient(135deg, ${alpha('#ffffff', 0.9)}, ${alpha(theme.palette.primary.light, 0.05)})`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  transition: 'all 0.3s ease',
                  transform: visibleTestimonials.includes(index) ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
                  opacity: visibleTestimonials.includes(index) ? 1 : 0,
                  '&:hover': {
                    transform: 'translateY(-4px) scale(1.02)',
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
            </Slide>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default TestimonialsSection;
