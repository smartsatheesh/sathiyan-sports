import mongoose, { Schema, Document } from 'mongoose';

// Exercise Schema
const ExerciseSchema = new Schema({
  name: { type: String, required: true },
  sets: { type: Number },
  reps: { type: String },
  duration: { type: String },
  restTime: { type: String },
  description: { type: String, required: true },
  tips: [{ type: String }],
  targetMuscles: [{ type: String }],
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Moderate', 'Hard'],
    default: 'Moderate'
  }
}, { _id: false });

// Daily Workout Schema
const DailyWorkoutSchema = new Schema({
  dayNumber: { type: Number, required: true },
  dayName: { type: String, required: true },
  workoutFocus: { type: String, required: true },
  estimatedDuration: { type: Number, required: true },
  restDay: { type: Boolean, default: false },
  warmup: [ExerciseSchema],
  mainWorkout: [ExerciseSchema],
  cooldown: [ExerciseSchema],
  notes: [{ type: String }]
}, { _id: false });

// Weekly Plan Schema
const WeeklyPlanSchema = new Schema({
  weekNumber: { type: Number, required: true },
  weekFocus: { type: String, required: true },
  days: [DailyWorkoutSchema]
}, { _id: false });

// Generated Fitness Plan Interface
export interface IGeneratedFitnessPlan extends Document {
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
  timePerSession: number;
  
  // Generated Plan Content
  weeklyPlans: any[];
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

// Generated Fitness Plan Schema
const GeneratedFitnessPlanSchema: Schema = new Schema({
  enrollmentId: {
    type: String,
    required: true,
    unique: true
  },
  planId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    sparse: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  
  // Plan Configuration
  fitnessGoal: {
    type: String,
    enum: ['Fat Loss', 'Muscle Gain', 'Endurance', 'General Fitness'],
    required: true
  },
  fitnessLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  },
  daysPerWeek: {
    type: Number,
    required: true,
    min: 2,
    max: 7
  },
  equipmentAvailable: [{
    type: String
  }],
  medicalConditions: {
    type: String
  },
  timePerSession: {
    type: Number,
    required: true,
    min: 15,
    max: 180
  },
  
  // Generated Plan Content
  weeklyPlans: [WeeklyPlanSchema],
  totalWeeks: {
    type: Number,
    required: true,
    min: 1,
    max: 52
  },
  planDescription: {
    type: String,
    required: true
  },
  nutritionNotes: {
    type: String
  },
  safetyGuidelines: {
    type: String
  },
  
  // Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  geminiModel: {
    type: String,
    default: 'gemini-1.5-flash'
  },
  planStatus: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  currentWeek: {
    type: Number,
    default: 1,
    min: 1
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'generated_fitness_plans'
});

// Indexes for better query performance
GeneratedFitnessPlanSchema.index({ enrollmentId: 1 });
GeneratedFitnessPlanSchema.index({ userEmail: 1 });
GeneratedFitnessPlanSchema.index({ planStatus: 1 });
GeneratedFitnessPlanSchema.index({ createdAt: -1 });

// Middleware to update lastUpdated on save
GeneratedFitnessPlanSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for checking if plan is current
GeneratedFitnessPlanSchema.virtual('isCurrentWeek').get(function(this: any) {
  const weeksSinceStart = Math.floor((Date.now() - this.generatedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return weeksSinceStart === this.currentWeek;
});

// Method to get current week's plan
GeneratedFitnessPlanSchema.methods.getCurrentWeekPlan = function() {
  return this.weeklyPlans.find((week: any) => week.weekNumber === this.currentWeek);
};

// Method to advance to next week
GeneratedFitnessPlanSchema.methods.advanceToNextWeek = function() {
  if (this.currentWeek < this.totalWeeks) {
    this.currentWeek += 1;
    this.lastUpdated = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to find active plans by user
GeneratedFitnessPlanSchema.statics.findActiveByUser = function(userEmail: string) {
  return this.find({ 
    userEmail, 
    planStatus: 'active' 
  }).sort({ createdAt: -1 });
};

// Export the model
const GeneratedFitnessPlan = mongoose.models.GeneratedFitnessPlan || 
  mongoose.model<IGeneratedFitnessPlan>('GeneratedFitnessPlan', GeneratedFitnessPlanSchema);

export default GeneratedFitnessPlan;