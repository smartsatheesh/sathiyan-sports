export interface GeneratedPlan {
  _id?: string;
  userId: string; // Session user ID
  coachUserId: string; // Reference to CoachUser
  planData: any; // The generated plan from AI
  planType: 'basic' | 'premium' | 'expert';
  generatedAt: Date;
  isActive: boolean;
  workoutEdits?: { [date: string]: any }; // Edited workouts by date
  lastModified?: Date;
  metadata: {
    generationTime: number; // milliseconds
    aiModel: string; // 'gemini-2.5'
    tokens?: number;
    userAgent?: string;
    ipAddress?: string;
  };
}

export default GeneratedPlan;