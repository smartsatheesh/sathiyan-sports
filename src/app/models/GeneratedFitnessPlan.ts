export interface IGeneratedFitnessPlan {
  enrollmentId: string;
  planId: string;
  userId?: string;
  userEmail: string;
  userName: string;
  
  // Plan Configuration
  fitnessGoal: 'Fat Loss' | 'Muscle Gain' | 'Endurance' | 'General Fitness';
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  daysPerWeek: number;
  equipmentAvailable?: string[];
  medicalConditions?: string;
  timePerSession: number; // in minutes
  
  // Generated Plan Content
  weeklyPlan: WeeklyPlan[];
  totalWeeks: number;
  planDescription: string;
  nutritionNotes?: string;
  safetyGuidelines?: string;
  
  // Metadata
  generatedAt: Date;
  geminiModel: string;
  planStatus: 'active' | 'completed' | 'paused';
  currentWeek: number;
  lastUpdated: Date;
}

export interface WeeklyPlan {
  weekNumber: number;
  weekFocus: string;
  days: DailyWorkout[];
}

export interface DailyWorkout {
  dayNumber: number;
  dayName: string;
  workoutFocus: string;
  estimatedDuration: number; // in minutes
  warmup: Exercise[];
  mainWorkout: Exercise[];
  cooldown: Exercise[];
  notes: string[];
  restDay: boolean;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string; // Could be "10-12" or "30 seconds" or "3-5 minutes"
  duration?: string; // For cardio or stretches
  restTime?: string;
  description: string;
  tips?: string[];
  targetMuscles?: string[];
  difficulty: 'Easy' | 'Moderate' | 'Hard';
}

export interface FitnessPromptParams {
  fitnessGoal: string;
  fitnessLevel: string;
  daysPerWeek: number;
  timePerSession: number;
  equipmentAvailable?: string[];
  medicalConditions?: string;
  specificFocus?: string;
  planDuration?: number; // weeks
}