export interface CoachSession {
  _id?: string;
  userId: string;
  sessionStart: Date;
  sessionEnd?: Date;
  steps: Array<{
    step: number;
    completedAt: Date;
    data: any;
  }>;
  finalPlanGenerated: boolean;
  planId?: string; // Reference to GeneratedPlan
}

export default CoachSession;