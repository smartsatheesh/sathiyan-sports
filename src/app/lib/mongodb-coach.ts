import { MongoClient, Db, Collection } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

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

export interface GeneratedPlan {
  _id?: string;
  userId: string; // Session user ID
  coachUserId: string; // Reference to CoachUser
  planData: any; // The generated plan from AI
  planType: 'basic' | 'premium' | 'expert';
  generatedAt: Date;
  isActive: boolean;
  metadata: {
    generationTime: number; // milliseconds
    aiModel: string; // 'gemini-2.5'
    tokens?: number;
    userAgent?: string;
    ipAddress?: string;
  };
}

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

async function connectToDatabase(): Promise<{ db: Db; client: MongoClient }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  const client = new MongoClient(uri);
  await client.connect();
  
  const db = client.db(process.env.MONGODB_DB || 'sathiyan_sports');
  
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

export async function getCoachUsersCollection(): Promise<Collection<CoachUser>> {
  const { db } = await connectToDatabase();
  return db.collection<CoachUser>('coach_users');
}

export async function getGeneratedPlansCollection(): Promise<Collection<GeneratedPlan>> {
  const { db } = await connectToDatabase();
  return db.collection<GeneratedPlan>('generated_plans');
}

export async function getCoachSessionsCollection(): Promise<Collection<CoachSession>> {
  const { db } = await connectToDatabase();
  return db.collection<CoachSession>('coach_sessions');
}

export { connectToDatabase };