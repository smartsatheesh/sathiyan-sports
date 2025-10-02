import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { 
  getCoachUsersCollection, 
  getGeneratedPlansCollection, 
  getCoachSessionsCollection,
  type CoachUser,
  type GeneratedPlan,
  type CoachSession
} from '../../../lib/mongodb-coach';

export async function POST(request: NextRequest) {
  try {
    console.log('🏃‍♂️ Coach Save API: Starting to save coach data');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { formData, generatedPlan, sessionSteps } = body;

    console.log('📝 Coach Save API: Received data for user:', session.user.name);

    const userId = session.user.id;
    const now = new Date();

    // 1. Save/Update Coach User Profile
    const coachUsersCollection = await getCoachUsersCollection();
    
    const coachUserData: Omit<CoachUser, '_id'> = {
      userId,
      name: formData.name,
      age: formData.age,
      height: formData.height,
      weight: formData.weight,
      sport: formData.sport,
      skillLevel: formData.skillLevel,
      weeklyHours: formData.weeklyHours,
      goal: formData.goal,
      injuries: formData.injuries || '',
      bmi: {
        value: formData.height && formData.weight ? 
          Math.round((formData.weight / Math.pow(formData.height / 100, 2)) * 10) / 10 : 0,
        category: formData.height && formData.weight ? 
          (() => {
            const bmi = formData.weight / Math.pow(formData.height / 100, 2);
            if (bmi < 18.5) return 'Underweight';
            if (bmi < 25) return 'Normal weight';
            if (bmi < 30) return 'Overweight';
            return 'Obese';
          })() : 'Unknown'
      },
      skillAssessment: formData.skillAssessment || {
        motorSkillsScore: 0,
        coordinationScore: 0,
        strengthScore: 0,
        enduranceScore: 0
      },
      createdAt: now,
      updatedAt: now
    };

    const coachUserResult = await coachUsersCollection.replaceOne(
      { userId },
      coachUserData,
      { upsert: true }
    );

    let coachUserId = coachUserResult.upsertedId?.toString() || 
      (await coachUsersCollection.findOne({ userId }))?._id?.toString();

    console.log('✅ Coach user profile saved with ID:', coachUserId);

    // 2. Save Generated Plan (if provided)
    let planId: string | undefined;
    if (generatedPlan) {
      const plansCollection = await getGeneratedPlansCollection();
      
      const planData: Omit<GeneratedPlan, '_id'> = {
        userId,
        coachUserId: coachUserId!,
        planData: generatedPlan,
        planType: 'basic', // Can be enhanced based on plan complexity
        generatedAt: now,
        isActive: true,
        metadata: {
          generationTime: body.generationTime || 0,
          aiModel: 'gemini-2.5',
          tokens: body.tokens || 0,
          userAgent: request.headers.get('user-agent') || '',
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
        }
      };

      // Mark previous plans as inactive
      await plansCollection.updateMany(
        { userId, isActive: true },
        { $set: { isActive: false } }
      );

      const planResult = await plansCollection.insertOne(planData);
      planId = planResult.insertedId.toString();
      
      console.log('✅ Generated plan saved with ID:', planId);
    }

    // 3. Save Coach Session (if provided)
    if (sessionSteps && sessionSteps.length > 0) {
      const sessionsCollection = await getCoachSessionsCollection();
      
      const sessionData: Omit<CoachSession, '_id'> = {
        userId,
        sessionStart: new Date(sessionSteps[0]?.completedAt || now),
        sessionEnd: now,
        steps: sessionSteps,
        finalPlanGenerated: !!generatedPlan,
        planId
      };

      const sessionResult = await sessionsCollection.insertOne(sessionData);
      console.log('✅ Coach session saved with ID:', sessionResult.insertedId);
    }

    return NextResponse.json({
      success: true,
      data: {
        coachUserId,
        planId,
        message: 'Coach data saved successfully'
      }
    });

  } catch (error) {
    console.error('❌ Coach Save API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save coach data' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve coach data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';

    const result: any = {};

    if (type === 'all' || type === 'user') {
      const coachUsersCollection = await getCoachUsersCollection();
      result.user = await coachUsersCollection.findOne({ userId });
    }

    if (type === 'all' || type === 'plans') {
      const plansCollection = await getGeneratedPlansCollection();
      result.plans = await plansCollection
        .find({ userId })
        .sort({ generatedAt: -1 })
        .limit(10)
        .toArray();
    }

    if (type === 'all' || type === 'sessions') {
      const sessionsCollection = await getCoachSessionsCollection();
      result.sessions = await sessionsCollection
        .find({ userId })
        .sort({ sessionStart: -1 })
        .limit(5)
        .toArray();
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('❌ Coach Get API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve coach data' },
      { status: 500 }
    );
  }
}