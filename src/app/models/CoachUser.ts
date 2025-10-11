export interface CoachUser {
  _id?: string;
  userId: string; // Session user ID
  name: string;
  age: string;
  height: number;
  weight: number;
  sport: string;
  skillLevel: string;
  weeklyHours: number;
  goal: string;
  injuries?: string;
  bmi: {
    value: number;
    category: string;
  };
  skillAssessment: {
    motorSkillsScore: number;
    coordinationScore: number;
    strengthScore: number;
    enduranceScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export default CoachUser;