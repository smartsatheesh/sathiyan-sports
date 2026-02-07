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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  useTheme
} from '@mui/material';
import {
  FitnessCenter,
  ExpandMore,
  PlayArrow,
  Schedule,
  TrendingUp,
  Assignment,
  CheckCircle,
  Warning,
  Refresh,
  Download,
  Share
} from '@mui/icons-material';

// Types
interface GeneratedPlan {
  _id: string;
  enrollmentId: string;
  planId: string;
  userName: string;
  userEmail: string;
  fitnessGoal: string;
  fitnessLevel: string;
  daysPerWeek: number;
  timePerSession: number;
  totalWeeks: number;
  currentWeek: number;
  planStatus: string;
  planDescription: string;
  weeklyPlans: WeeklyPlan[];
  nutritionNotes?: string;
  safetyGuidelines?: string;
  generatedAt: string;
  geminiModel: string;
}

interface WeeklyPlan {
  weekNumber: number;
  weekFocus: string;
  days: DailyWorkout[];
}

interface DailyWorkout {
  dayNumber: number;
  dayName: string;
  workoutFocus: string;
  estimatedDuration: number;
  restDay: boolean;
  warmup: Exercise[];
  mainWorkout: Exercise[];
  cooldown: Exercise[];
  notes: string[];
}

interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  restTime?: string;
  description: string;
  tips?: string[];
  targetMuscles?: string[];
  difficulty: string;
}

interface GeneratePlanForm {
  enrollmentId: string;
  fitnessGoal: string;
  fitnessLevel: string;
  daysPerWeek: number;
  timePerSession: number;
  equipmentAvailable: string[];
  medicalConditions: string;
  specificFocus: string;
  planDuration: number;
}

const FitnessPlansGenerator: React.FC = () => {
  const theme = useTheme();
  const [userPlans, setUserPlans] = useState<GeneratedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<GeneratedPlan | null>(null);
  const [planDetailDialogOpen, setPlanDetailDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  const [formData, setFormData] = useState<GeneratePlanForm>({
    enrollmentId: '',
    fitnessGoal: '',
    fitnessLevel: '',
    daysPerWeek: 4,
    timePerSession: 60,
    equipmentAvailable: [],
    medicalConditions: '',
    specificFocus: '',
    planDuration: 8
  });

  const equipmentOptions = [
    'Dumbbells', 'Barbells', 'Resistance Bands', 'Pull-up Bar', 'Yoga Mat',
    'Treadmill', 'Stationary Bike', 'Kettlebells', 'Medicine Ball', 'Foam Roller',
    'Exercise Ball', 'Jump Rope', 'Bench', 'Cable Machine', 'Smith Machine'
  ];

  // Load user's plans on component mount
  useEffect(() => {
    if (userEmail) {
      loadUserPlans();
    }
  }, [userEmail]);

  const loadUserPlans = async () => {
    if (!userEmail) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/fitness-plans/generate?userEmail=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (data.success) {
        setUserPlans(data.plans || []);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to load plans' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Error loading fitness plans' });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!formData.enrollmentId || !formData.fitnessGoal || !formData.fitnessLevel) {
      setAlert({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setGenerateLoading(true);
    try {
      const response = await fetch('/api/fitness-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({ 
          type: 'success', 
          message: data.isExisting 
            ? 'Found existing fitness plan!' 
            : `Fitness plan generated successfully${data.usingFallback ? ' (using fallback system)' : ' with AI'}`
        });
        setGenerateDialogOpen(false);
        loadUserPlans(); // Refresh the plans list
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to generate plan' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Error generating fitness plan' });
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleUpdateProgress = async (planId: string, newWeek: number) => {
    try {
      const plan = userPlans.find(p => p._id === planId);
      if (!plan) return;

      const response = await fetch('/api/fitness-plans/generate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: plan.enrollmentId,
          currentWeek: newWeek
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({ type: 'success', message: `Progress updated to week ${newWeek}` });
        loadUserPlans(); // Refresh the plans
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to update progress' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Error updating progress' });
    }
  };

  const renderExercise = (exercise: Exercise, index: number) => (
    <Card key={index} variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          {exercise.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
          {exercise.sets && (
            <Chip size="small" label={`${exercise.sets} sets`} />
          )}
          {exercise.reps && (
            <Chip size="small" label={`${exercise.reps} reps`} />
          )}
          {exercise.duration && (
            <Chip size="small" label={exercise.duration} />
          )}
          {exercise.restTime && (
            <Chip size="small" label={`Rest: ${exercise.restTime}`} />
          )}
          <Chip 
            size="small" 
            label={exercise.difficulty} 
            color={exercise.difficulty === 'Hard' ? 'error' : exercise.difficulty === 'Moderate' ? 'warning' : 'success'}
          />
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {exercise.description}
        </Typography>
        {exercise.tips && exercise.tips.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="primary" fontWeight="bold">
              Tips:
            </Typography>
            <Typography variant="caption" display="block">
              {exercise.tips.join(', ')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderDailyWorkout = (day: DailyWorkout, weekNumber: number) => {
    if (day.restDay) {
      return (
        <Card key={day.dayNumber} sx={{ mb: 2, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule />
              {day.dayName} - Rest Day
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Take a well-deserved rest or do some light activity like walking or gentle stretching.
            </Typography>
            {day.notes && day.notes.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {day.notes.map((note, i) => (
                  <Typography key={i} variant="body2" sx={{ fontStyle: 'italic' }}>
                    💡 {note}
                  </Typography>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={day.dayNumber} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FitnessCenter />
            {day.dayName} - {day.workoutFocus}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                🔥 Warm-up ({day.warmup?.length || 0} exercises)
              </Typography>
              {day.warmup?.map((exercise, i) => renderExercise(exercise, i))}
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                💪 Main Workout ({day.mainWorkout?.length || 0} exercises)
              </Typography>
              {day.mainWorkout?.map((exercise, i) => renderExercise(exercise, i))}
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                🧘 Cool-down ({day.cooldown?.length || 0} exercises)
              </Typography>
              {day.cooldown?.map((exercise, i) => renderExercise(exercise, i))}
            </Grid>
          </Grid>

          {day.notes && day.notes.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                📝 Notes:
              </Typography>
              {day.notes.map((note, i) => (
                <Typography key={i} variant="body2">
                  • {note}
                </Typography>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom sx={{ 
          fontWeight: 700,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🤖 AI Fitness Plans Generator
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Generate personalized workout plans using advanced AI for your S3 fitness enrollments
        </Typography>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)} 
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* User Email Input */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📧 Load Your Fitness Plans
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Your Email Address"
            fullWidth
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Enter your email to load existing plans"
            variant="outlined"
          />
          <Button
            variant="contained"
            onClick={loadUserPlans}
            disabled={!userEmail || loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Load Plans'}
          </Button>
        </Box>
      </Paper>

      {/* Generate New Plan Button */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => setGenerateDialogOpen(true)}
          sx={{
            fontSize: '1.1rem',
            py: 1.5,
            px: 4,
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            '&:hover': {
              background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              transform: 'translateY(-1px)',
              boxShadow: theme.shadows[8]
            },
            transition: 'all 0.3s ease'
          }}
        >
          ✨ Generate New AI Fitness Plan
        </Button>
      </Box>

      {/* User's Plans */}
      {userPlans.length > 0 && (
        <Grid container spacing={3}>
          {userPlans.map((plan) => (
            <Grid item xs={12} md={6} lg={4} key={plan._id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.3s' }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Chip 
                      label={plan.fitnessGoal}
                      color="primary"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Chip 
                      label={plan.planStatus}
                      color={plan.planStatus === 'active' ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="h6" gutterBottom>
                    {plan.fitnessLevel} Level Plan
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {plan.planDescription?.substring(0, 120)}...
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip size="small" icon={<Schedule />} label={`${plan.daysPerWeek} days/week`} />
                    <Chip size="small" icon={<Assignment />} label={`${plan.timePerSession} min`} />
                    <Chip size="small" icon={<TrendingUp />} label={`Week ${plan.currentWeek}/${plan.totalWeeks}`} />
                  </Box>

                  <LinearProgress 
                    variant="determinate" 
                    value={(plan.currentWeek / plan.totalWeeks) * 100}
                    sx={{ mb: 2, height: 8, borderRadius: 4 }}
                  />

                  <Typography variant="caption" color="text.secondary">
                    Generated: {new Date(plan.generatedAt).toLocaleDateString('en-GB')} | 
                    AI Model: {plan.geminiModel}
                  </Typography>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      setSelectedPlan(plan);
                      setPlanDetailDialogOpen(true);
                    }}
                  >
                    View Full Plan
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {userEmail && userPlans.length === 0 && !loading && (
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.50' }}>
          <FitnessCenter sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Fitness Plans Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You haven't generated any AI fitness plans yet. Create your first personalized workout plan!
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => setGenerateDialogOpen(true)}
          >
            Generate Your First Plan
          </Button>
        </Paper>
      )}

      {/* Generate Plan Dialog */}
      <Dialog 
        open={generateDialogOpen} 
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" gutterBottom>
            🤖 Generate AI Fitness Plan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a personalized workout plan tailored to your goals and fitness level
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Enrollment ID"
                fullWidth
                required
                value={formData.enrollmentId}
                onChange={(e) => setFormData({...formData, enrollmentId: e.target.value})}
                helperText="Your S3 fitness plan enrollment ID"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Fitness Goal</InputLabel>
                <Select
                  value={formData.fitnessGoal}
                  onChange={(e) => setFormData({...formData, fitnessGoal: e.target.value})}
                >
                  <MenuItem value="Fat Loss">Fat Loss</MenuItem>
                  <MenuItem value="Muscle Gain">Muscle Gain</MenuItem>
                  <MenuItem value="Endurance">Endurance</MenuItem>
                  <MenuItem value="General Fitness">General Fitness</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Fitness Level</InputLabel>
                <Select
                  value={formData.fitnessLevel}
                  onChange={(e) => setFormData({...formData, fitnessLevel: e.target.value})}
                >
                  <MenuItem value="Beginner">Beginner</MenuItem>
                  <MenuItem value="Intermediate">Intermediate</MenuItem>
                  <MenuItem value="Advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Days per Week"
                type="number"
                fullWidth
                required
                inputProps={{ min: 2, max: 7 }}
                value={formData.daysPerWeek}
                onChange={(e) => setFormData({...formData, daysPerWeek: parseInt(e.target.value)})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Minutes per Session"
                type="number"
                fullWidth
                required
                inputProps={{ min: 15, max: 180 }}
                value={formData.timePerSession}
                onChange={(e) => setFormData({...formData, timePerSession: parseInt(e.target.value)})}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Plan Duration (weeks)"
                type="number"
                fullWidth
                inputProps={{ min: 4, max: 20 }}
                value={formData.planDuration}
                onChange={(e) => setFormData({...formData, planDuration: parseInt(e.target.value)})}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Available Equipment</InputLabel>
                <Select
                  multiple
                  value={formData.equipmentAvailable}
                  onChange={(e) => setFormData({
                    ...formData, 
                    equipmentAvailable: typeof e.target.value === 'string' ? [e.target.value] : e.target.value
                  })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {equipmentOptions.map((equipment) => (
                    <MenuItem key={equipment} value={equipment}>
                      {equipment}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Medical Conditions or Limitations"
                fullWidth
                multiline
                rows={2}
                value={formData.medicalConditions}
                onChange={(e) => setFormData({...formData, medicalConditions: e.target.value})}
                helperText="Any injuries, medical conditions, or physical limitations"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Specific Focus Areas"
                fullWidth
                multiline
                rows={2}
                value={formData.specificFocus}
                onChange={(e) => setFormData({...formData, specificFocus: e.target.value})}
                helperText="Any specific areas you want to focus on (e.g., core strength, flexibility)"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setGenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGeneratePlan}
            disabled={generateLoading}
            sx={{ minWidth: 120 }}
          >
            {generateLoading ? <CircularProgress size={24} /> : 'Generate Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Plan Detail Dialog */}
      <Dialog
        open={planDetailDialogOpen}
        onClose={() => setPlanDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {selectedPlan && (
          <>
            <DialogTitle>
              <Typography variant="h5" gutterBottom>
                📋 {selectedPlan.fitnessLevel} {selectedPlan.fitnessGoal} Plan
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`Week ${selectedPlan.currentWeek}/${selectedPlan.totalWeeks}`} color="primary" />
                <Chip label={`${selectedPlan.daysPerWeek} days/week`} />
                <Chip label={`${selectedPlan.timePerSession} min/session`} />
                <Chip label={selectedPlan.planStatus} color={selectedPlan.planStatus === 'active' ? 'success' : 'default'} />
              </Box>
            </DialogTitle>

            <DialogContent>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {selectedPlan.planDescription}
              </Typography>

              {/* Progress Stepper */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📈 Weekly Progress
                </Typography>
                <Stepper activeStep={selectedPlan.currentWeek - 1} alternativeLabel>
                  {Array.from({ length: selectedPlan.totalWeeks }, (_, i) => (
                    <Step key={i}>
                      <StepLabel>Week {i + 1}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
                <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={selectedPlan.currentWeek <= 1}
                    onClick={() => handleUpdateProgress(selectedPlan._id, selectedPlan.currentWeek - 1)}
                  >
                    Previous Week
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={selectedPlan.currentWeek >= selectedPlan.totalWeeks}
                    onClick={() => handleUpdateProgress(selectedPlan._id, selectedPlan.currentWeek + 1)}
                  >
                    Next Week
                  </Button>
                </Box>
              </Paper>

              {/* Weekly Plans */}
              {selectedPlan.weeklyPlans?.map((week) => (
                <Accordion key={week.weekNumber} defaultExpanded={week.weekNumber === selectedPlan.currentWeek}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">
                      Week {week.weekNumber}: {week.weekFocus}
                      {week.weekNumber === selectedPlan.currentWeek && (
                        <Chip label="Current" color="primary" size="small" sx={{ ml: 2 }} />
                      )}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {week.days?.map((day) => renderDailyWorkout(day, week.weekNumber))}
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* Additional Notes */}
              {(selectedPlan.nutritionNotes || selectedPlan.safetyGuidelines) && (
                <Box sx={{ mt: 3 }}>
                  {selectedPlan.nutritionNotes && (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light' }}>
                      <Typography variant="h6" gutterBottom>
                        🥗 Nutrition Guidelines
                      </Typography>
                      <Typography variant="body2">
                        {selectedPlan.nutritionNotes}
                      </Typography>
                    </Paper>
                  )}
                  
                  {selectedPlan.safetyGuidelines && (
                    <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
                      <Typography variant="h6" gutterBottom>
                        ⚠️ Safety Guidelines
                      </Typography>
                      <Typography variant="body2">
                        {selectedPlan.safetyGuidelines}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setPlanDetailDialogOpen(false)}>
                Close
              </Button>
              <Button variant="contained" startIcon={<Download />}>
                Export Plan
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default FitnessPlansGenerator;