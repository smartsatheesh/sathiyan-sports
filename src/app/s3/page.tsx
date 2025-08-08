"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Avatar,
  Divider,
  Tab,
  Tabs,
  CircularProgress
} from '@mui/material';
import {
  FitnessCenter,
  Speed,
  Favorite,
  Star,
  CheckCircle,
  AccessTime,
  PersonAdd,
  Assignment,
  TrendingUp,
  Psychology,
  DirectionsRun,
  MonitorWeight
} from '@mui/icons-material';

// Fitness plan types
interface FitnessPlan {
  id: string;
  name: string;
  category: 'strength' | 'speed' | 'stamina';
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  description: string;
  exercises: Exercise[];
  benefits: string[];
  equipment: string[];
  price: number;
  rating: number;
  enrolled: number;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  description: string;
}

interface UserProgress {
  planId: string;
  completedDays: number;
  totalDays: number;
  startDate: string;
  currentWeek: number;
}

// Sample fitness plans data
const fitnessPlans: FitnessPlan[] = [
  // Strength Plans
  {
    id: 'strength-1',
    name: 'Muscle Building Fundamentals',
    category: 'strength',
    level: 'beginner',
    duration: '8 weeks',
    description: 'Build a solid foundation with compound movements and progressive overload.',
    exercises: [
      { name: 'Squats', sets: 3, reps: '8-12', rest: '90s', description: 'Focus on proper form and depth' },
      { name: 'Deadlifts', sets: 3, reps: '5-8', rest: '2-3min', description: 'Keep spine neutral throughout' },
      { name: 'Bench Press', sets: 3, reps: '8-12', rest: '90s', description: 'Control the weight down' },
      { name: 'Pull-ups', sets: 3, reps: '5-10', rest: '90s', description: 'Use assistance if needed' }
    ],
    benefits: ['Increase overall strength', 'Build lean muscle mass', 'Improve bone density', 'Better posture'],
    equipment: ['Barbell', 'Dumbbells', 'Pull-up bar', 'Bench'],
    price: 2999,
    rating: 4.8,
    enrolled: 1250
  },
  {
    id: 'strength-2',
    name: 'Advanced Powerlifting',
    category: 'strength',
    level: 'advanced',
    duration: '12 weeks',
    description: 'Maximize your strength in the big three: squat, bench, and deadlift.',
    exercises: [
      { name: 'Competition Squat', sets: 5, reps: '1-5', rest: '3-5min', description: 'Competition style squats' },
      { name: 'Competition Bench', sets: 5, reps: '1-5', rest: '3-5min', description: 'Pause bench press' },
      { name: 'Competition Deadlift', sets: 5, reps: '1-5', rest: '3-5min', description: 'Competition timing' },
      { name: 'Accessory Work', sets: 3, reps: '8-15', rest: '60-90s', description: 'Target weak points' }
    ],
    benefits: ['Peak strength development', 'Competition preparation', 'Technical mastery', 'Mental toughness'],
    equipment: ['Olympic barbell', 'Competition plates', 'Power rack', 'Bench'],
    price: 4999,
    rating: 4.9,
    enrolled: 485
  },

  // Speed Plans
  {
    id: 'speed-1',
    name: 'Sprint Speed Development',
    category: 'speed',
    level: 'intermediate',
    duration: '6 weeks',
    description: 'Develop explosive speed and acceleration for sports performance.',
    exercises: [
      { name: '40m Sprints', sets: 6, reps: '1', rest: '3-4min', description: 'Maximum effort sprints' },
      { name: 'Plyometric Jumps', sets: 4, reps: '5-8', rest: '2min', description: 'Explosive jumping movements' },
      { name: 'Agility Ladder', sets: 3, reps: '30s', rest: '90s', description: 'Quick feet patterns' },
      { name: 'Resistance Sprints', sets: 4, reps: '20m', rest: '2-3min', description: 'Using resistance bands' }
    ],
    benefits: ['Faster sprint times', 'Better acceleration', 'Improved agility', 'Enhanced reflexes'],
    equipment: ['Agility ladder', 'Resistance bands', 'Cones', 'Stopwatch'],
    price: 3499,
    rating: 4.7,
    enrolled: 890
  },
  {
    id: 'speed-2',
    name: 'Athletic Performance Speed',
    category: 'speed',
    level: 'advanced',
    duration: '10 weeks',
    description: 'Elite-level speed training for competitive athletes.',
    exercises: [
      { name: 'Flying Sprints', sets: 5, reps: '30m', rest: '4-5min', description: 'Maximum velocity training' },
      { name: 'Depth Jumps', sets: 4, reps: '3-5', rest: '3min', description: 'Reactive strength development' },
      { name: 'Resisted Accelerations', sets: 6, reps: '10m', rest: '2-3min', description: 'Heavy resistance work' },
      { name: 'Change of Direction', sets: 4, reps: '5', rest: '2min', description: 'Multi-directional speed' }
    ],
    benefits: ['Elite speed development', 'Sport-specific performance', 'Injury prevention', 'Competitive edge'],
    equipment: ['Weighted sleds', 'Reaction lights', 'Force plates', 'Video analysis'],
    price: 5999,
    rating: 4.9,
    enrolled: 320
  },

  // Stamina Plans
  {
    id: 'stamina-1',
    name: 'Cardiovascular Endurance',
    category: 'stamina',
    level: 'beginner',
    duration: '8 weeks',
    description: 'Build your aerobic base and improve overall cardiovascular health.',
    exercises: [
      { name: 'Steady State Cardio', sets: 1, reps: '30-45min', rest: 'N/A', description: 'Moderate intensity' },
      { name: 'Interval Training', sets: 8, reps: '2min on/1min off', rest: '1min', description: 'Higher intensity intervals' },
      { name: 'Hill Walking', sets: 1, reps: '20-30min', rest: 'N/A', description: 'Incline walking' },
      { name: 'Circuit Training', sets: 3, reps: '45s work/15s rest', rest: '2min', description: 'Full body circuits' }
    ],
    benefits: ['Better heart health', 'Increased lung capacity', 'Weight management', 'Daily energy boost'],
    equipment: ['Treadmill/outdoors', 'Heart rate monitor', 'Timer', 'Yoga mat'],
    price: 2499,
    rating: 4.6,
    enrolled: 1850
  },
  {
    id: 'stamina-2',
    name: 'Marathon Endurance',
    category: 'stamina',
    level: 'advanced',
    duration: '16 weeks',
    description: 'Train for long-distance events and peak endurance performance.',
    exercises: [
      { name: 'Long Runs', sets: 1, reps: '90-180min', rest: 'N/A', description: 'Aerobic base building' },
      { name: 'Tempo Runs', sets: 1, reps: '20-40min', rest: 'N/A', description: 'Lactate threshold training' },
      { name: 'VO2 Max Intervals', sets: 5, reps: '3-5min', rest: '2-3min', description: 'Maximum oxygen uptake' },
      { name: 'Recovery Runs', sets: 1, reps: '30-60min', rest: 'N/A', description: 'Active recovery sessions' }
    ],
    benefits: ['Elite endurance', 'Mental toughness', 'Metabolic efficiency', 'Competition readiness'],
    equipment: ['GPS watch', 'Heart rate monitor', 'Running shoes', 'Hydration system'],
    price: 4499,
    rating: 4.8,
    enrolled: 650
  }
];

export default function S3FitnessPlans() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'strength' | 'speed' | 'stamina'>('all');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FitnessPlan | null>(null);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    experience: '',
    goals: '',
    medicalConditions: ''
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [tabValue, setTabValue] = useState(0);

  // Filter plans based on selected category and level
  const filteredPlans = fitnessPlans.filter(plan => {
    const categoryMatch = selectedCategory === 'all' || plan.category === selectedCategory;
    const levelMatch = selectedLevel === 'all' || plan.level === selectedLevel;
    return categoryMatch && levelMatch;
  });

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'strength': return '#f44336';
      case 'speed': return '#ff9800';
      case 'stamina': return '#4caf50';
      default: return '#2196f3';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'strength': return <FitnessCenter />;
      case 'speed': return <Speed />;
      case 'stamina': return <Favorite />;
      default: return <FitnessCenter />;
    }
  };

  // Handle plan enrollment
  const handleEnrollment = async () => {
    if (!selectedPlan) return;

    if (!userInfo.name || !userInfo.email || !userInfo.phone) {
      setAlert({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    try {
      // Call the fitness plans API
      const response = await fetch('/api/fitness-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          name: userInfo.name,
          email: userInfo.email,
          phone: userInfo.phone,
          experience: userInfo.experience,
          goals: userInfo.goals,
          medicalConditions: userInfo.medicalConditions
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add to user progress
        const newProgress: UserProgress = {
          planId: selectedPlan.id,
          completedDays: 0,
          totalDays: parseInt(selectedPlan.duration.split(' ')[0]) * 7,
          startDate: new Date().toISOString(),
          currentWeek: 1
        };
        
        setUserProgress(prev => [...prev, newProgress]);
        setAlert({ 
          type: 'success', 
          message: `Successfully enrolled in ${selectedPlan.name}! Enrollment ID: ${data.enrollmentId}` 
        });
        setEnrollDialogOpen(false);
        setUserInfo({ name: '', email: '', phone: '', experience: '', goals: '', medicalConditions: '' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to enroll in the plan' });
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      setAlert({ type: 'error', message: 'Failed to enroll in the plan. Please try again.' });
    }
    setLoading(false);
  };

  // Category statistics
  const categoryStats = {
    strength: fitnessPlans.filter(p => p.category === 'strength').length,
    speed: fitnessPlans.filter(p => p.category === 'speed').length,
    stamina: fitnessPlans.filter(p => p.category === 'stamina').length
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 2, mx: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      <Container maxWidth="xl">
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 800,
              background: 'linear-gradient(45deg, #f44336 30%, #ff9800 50%, #4caf50 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            S3 Fitness Plans
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Strength • Speed • Stamina
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Transform your fitness journey with our scientifically designed training programs. 
            Choose from specialized plans targeting strength building, speed development, or stamina enhancement.
          </Typography>
        </Box>

        {/* Category Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f44336 0%, #ff5722 100%)', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <FitnessCenter sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  Strength
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Build muscle mass, increase power, and develop functional strength
                </Typography>
                <Typography variant="h6">
                  {categoryStats.strength} Programs Available
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Speed sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  Speed
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Enhance acceleration, agility, and explosive movement patterns
                </Typography>
                <Typography variant="h6">
                  {categoryStats.speed} Programs Available
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Favorite sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  Stamina
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Improve cardiovascular health and endurance capacity
                </Typography>
                <Typography variant="h6">
                  {categoryStats.stamina} Programs Available
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  <MenuItem value="strength">Strength</MenuItem>
                  <MenuItem value="speed">Speed</MenuItem>
                  <MenuItem value="stamina">Stamina</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Level</InputLabel>
                <Select
                  value={selectedLevel}
                  label="Level"
                  onChange={(e) => setSelectedLevel(e.target.value as any)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Fitness Plans Grid */}
        <Grid container spacing={3}>
          {filteredPlans.map((plan) => (
            <Grid item xs={12} md={6} lg={4} key={plan.id}>
              <Card 
                elevation={3} 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': { transform: 'translateY(-4px)', transition: 'transform 0.3s' }
                }}
              >
                <Box 
                  sx={{ 
                    p: 2, 
                    background: `linear-gradient(135deg, ${getCategoryColor(plan.category)}20 0%, ${getCategoryColor(plan.category)}40 100%)`
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      icon={getCategoryIcon(plan.category)}
                      label={plan.category.toUpperCase()}
                      sx={{ 
                        bgcolor: getCategoryColor(plan.category),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                    <Chip 
                      label={plan.level.toUpperCase()}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    {plan.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Star sx={{ color: '#ffc107', fontSize: 16 }} />
                      <Typography variant="body2">{plan.rating}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonAdd sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{plan.enrolled} enrolled</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{plan.duration}</Typography>
                    </Box>
                  </Box>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {plan.description}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    Key Benefits:
                  </Typography>
                  <List dense sx={{ mb: 2 }}>
                    {plan.benefits.slice(0, 3).map((benefit, index) => (
                      <ListItem key={index} sx={{ py: 0 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                        </ListItemIcon>
                        <ListItemText primary={benefit} />
                      </ListItem>
                    ))}
                  </List>

                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    Sample Exercises:
                  </Typography>
                  <List dense>
                    {plan.exercises.slice(0, 2).map((exercise, index) => (
                      <ListItem key={index} sx={{ py: 0 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Assignment sx={{ fontSize: 16, color: 'primary.main' }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={exercise.name}
                          secondary={`${exercise.sets} sets × ${exercise.reps}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        ₹{plan.price.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total program fee
                      </Typography>
                    </Box>
                    <Button 
                      variant="contained" 
                      fullWidth
                      sx={{ 
                        bgcolor: getCategoryColor(plan.category),
                        '&:hover': { bgcolor: getCategoryColor(plan.category) + 'dd' }
                      }}
                      onClick={() => {
                        setSelectedPlan(plan);
                        setEnrollDialogOpen(true);
                      }}
                    >
                      Enroll Now
                    </Button>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* No results message */}
        {filteredPlans.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No fitness plans found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters to see more options
            </Typography>
          </Box>
        )}
      </Container>

      {/* Enrollment Dialog */}
      <Dialog 
        open={enrollDialogOpen} 
        onClose={() => setEnrollDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ 
          textAlign: 'center',
          bgcolor: selectedPlan ? getCategoryColor(selectedPlan.category) + '20' : 'transparent'
        }}>
          <Typography variant="h5" gutterBottom>
            Enroll in {selectedPlan?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete your enrollment to start your fitness journey
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Full Name"
                  fullWidth
                  required
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone Number"
                  fullWidth
                  required
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Fitness Experience</InputLabel>
                  <Select
                    value={userInfo.experience}
                    label="Fitness Experience"
                    onChange={(e) => setUserInfo({ ...userInfo, experience: e.target.value })}
                  >
                    <MenuItem value="beginner">Beginner (0-1 years)</MenuItem>
                    <MenuItem value="intermediate">Intermediate (1-3 years)</MenuItem>
                    <MenuItem value="advanced">Advanced (3+ years)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Fitness Goals"
                  multiline
                  rows={3}
                  fullWidth
                  value={userInfo.goals}
                  onChange={(e) => setUserInfo({ ...userInfo, goals: e.target.value })}
                  placeholder="What do you want to achieve with this program?"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Medical Conditions / Injuries"
                  multiline
                  rows={2}
                  fullWidth
                  value={userInfo.medicalConditions}
                  onChange={(e) => setUserInfo({ ...userInfo, medicalConditions: e.target.value })}
                  placeholder="Any medical conditions or injuries we should know about?"
                />
              </Grid>
            </Grid>

            {/* Plan Summary */}
            {selectedPlan && (
              <Paper elevation={2} sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  Program Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Program:</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedPlan.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Duration:</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedPlan.duration}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Category:</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                      {selectedPlan.category}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Level:</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                      {selectedPlan.level}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">Total Fee:</Typography>
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        ₹{selectedPlan.price.toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEnrollDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleEnrollment}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{ 
              bgcolor: selectedPlan ? getCategoryColor(selectedPlan.category) : 'primary.main',
              '&:hover': { 
                bgcolor: selectedPlan ? getCategoryColor(selectedPlan.category) + 'dd' : 'primary.dark' 
              }
            }}
          >
            {loading ? 'Enrolling...' : `Enroll for ₹${selectedPlan?.price.toLocaleString()}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
