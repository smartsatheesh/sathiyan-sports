"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, Avatar, Rating, useTheme, alpha, Zoom, Slide, Fade } from '@mui/material';
import { FormatQuote } from '@mui/icons-material';

interface User {
  _id: string;
  champId: string;
  name: string;
  preferredSport: string;
  champType: string;
  subscribed: string;
  hasActiveSubscription: boolean;
  createdAt: string;
}

interface Testimonial {
  name: string;
  champId: string;
  role: string;
  avatar: string;
  rating: number;
  comment: string;
}

const TestimonialsSection = () => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [visibleTestimonials, setVisibleTestimonials] = useState<number[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Predefined testimonial content for different sports
  const testimonialTemplates = {
    "Cricket": {
      role: "Cricket Enthusiast",
      rating: 5,
      comment: "Amazing facilities! The cricket pitch is well-maintained and the equipment is top-notch. Highly recommend for serious players."
    },
    "Football": {
      role: "Football Player", 
      rating: 5,
      comment: "The football turf is fantastic! FIFA standard quality and excellent lighting for evening games. Great booking system too."
    },
    "Shuttle Badminton": {
      role: "Badminton Player",
      rating: 4,
      comment: "Professional badminton courts with proper wooden flooring. Perfect for training sessions and tournaments."
    },
    "Functions and Events": {
      role: "Event Organizer",
      rating: 5,
      comment: "Hosted our company event here. Excellent space, great catering facilities, and wonderful staff support!"
    }
  };

  // Fetch real users and create testimonials
  useEffect(() => {
    const fetchUsersForTestimonials = async () => {
      setLoading(true);
      try {
        const sports = ["Cricket", "Football", "Shuttle Badminton", "Functions and Events", "Body Zorb"];
        const userPromises = sports.map(sport => 
          fetch(`/api/users/by-sport?sport=${encodeURIComponent(sport)}&limit=1`)
            .then(res => res.json())
            .then(data => ({ sport, users: data.users || [] }))
        );

        const sportUsers = await Promise.all(userPromises);
        const newTestimonials: Testimonial[] = [];

        sportUsers.forEach(({ sport, users }) => {
          if (users.length > 0) {
            const user = users[0];
            const template = testimonialTemplates[sport as keyof typeof testimonialTemplates];
            
            if (template) {
              newTestimonials.push({
                name: user.name,
                champId: user.champId,
                role: template.role,
                avatar: user.name.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2),
                rating: template.rating,
                comment: template.comment
              });
            }
          }
        });

        // If we don't have enough real users, fill with fallback testimonials
        if (newTestimonials.length < 4) {
          const fallbackTestimonials = [
            {
              name: "Rajesh Kumar",
              champId: "S25900",
              role: "Cricket Enthusiast",
              avatar: "RK",
              rating: 5,
              comment: "Amazing facilities! The cricket pitch is well-maintained and the equipment is top-notch. Highly recommend for serious players."
            },
            {
              name: "Priya Sharma", 
              champId: "S25901",
              role: "Football Player",
              avatar: "PS",
              rating: 5,
              comment: "The football turf is fantastic! FIFA standard quality and excellent lighting for evening games. Great booking system too."
            },
            {
              name: "Vikram Singh",
              champId: "S25902", 
              role: "Badminton Coach",
              avatar: "VS",
              rating: 4,
              comment: "Professional badminton courts with proper wooden flooring. Perfect for training sessions and tournaments."
            },
            {
              name: "Meera Patel",
              champId: "S25903",
              role: "Event Organizer", 
              avatar: "MP",
              rating: 5,
              comment: "Hosted our company event here. Excellent space, great catering facilities, and wonderful staff support!"
            }
          ];

          // Add fallback testimonials to fill up to 4 total
          const needed = 4 - newTestimonials.length;
          newTestimonials.push(...fallbackTestimonials.slice(0, needed));
        }

        setTestimonials(newTestimonials);
      } catch (error) {
        console.error("Error fetching users for testimonials:", error);
        // Use fallback testimonials on error
        setTestimonials([
          {
            name: "Rajesh Kumar",
            champId: "S25900",
            role: "Cricket Enthusiast", 
            avatar: "RK",
            rating: 5,
            comment: "Amazing facilities! The cricket pitch is well-maintained and the equipment is top-notch. Highly recommend for serious players."
          },
          {
            name: "Priya Sharma",
            champId: "S25901",
            role: "Football Player",
            avatar: "PS", 
            rating: 5,
            comment: "The football turf is fantastic! FIFA standard quality and excellent lighting for evening games. Great booking system too."
          },
          {
            name: "Vikram Singh",
            champId: "S25902",
            role: "Badminton Coach",
            avatar: "VS",
            rating: 4,
            comment: "Professional badminton courts with proper wooden flooring. Perfect for training sessions and tournaments."
          },
          {
            name: "Meera Patel",
            champId: "S25903", 
            role: "Event Organizer",
            avatar: "MP",
            rating: 5,
            comment: "Hosted our company event here. Excellent space, great catering facilities, and wonderful staff support!"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersForTestimonials();
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Reset and stagger the testimonial animations
            setVisibleTestimonials([]);
            testimonials.forEach((_, index) => {
              setTimeout(() => {
                setVisibleTestimonials(prev => [...prev, index]);
              }, index * 200);
            });
          } else {
            setIsVisible(false);
            setVisibleTestimonials([]);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '20px 0px -20px 0px'
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [testimonials]);

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
      
      {loading ? (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">Loading testimonials...</Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} sm={6} md={3} key={`${testimonial.champId}-${index}`}>
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
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      {testimonial.role} • ChampID: {testimonial.champId}
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
      )}
    </Container>
  );
};

export default TestimonialsSection;