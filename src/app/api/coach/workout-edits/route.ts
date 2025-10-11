import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { getCoachUsersCollection, getGeneratedPlansCollection } from '../../../server/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Workout edit API called');
    
    const session = await getServerSession(authOptions);
    console.log('👤 Session check:', session?.user?.id ? 'Authenticated' : 'Not authenticated');
    
    if (!session?.user?.id) {
      console.log('❌ Authentication failed - no session');
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const { date, workout, planId } = await request.json();
    console.log('📝 Request data:', { date, workout, planId, userId: session.user.id });

    if (!date || !workout) {
      console.log('❌ Missing required data');
      return NextResponse.json(
        { success: false, error: 'Date and workout data are required' },
        { status: 400 }
      );
    }

    // Get the plans collection
    const plansCollection = await getGeneratedPlansCollection();
    console.log('🗄️ Got plans collection');
    
    // Find the user's plan (either by planId or by userId for latest plan)
    let planQuery: any;
    if (planId) {
      try {
        planQuery = { _id: new ObjectId(planId), userId: session.user.id };
      } catch (error) {
        console.log('❌ Invalid planId format, falling back to userId query');
        planQuery = { userId: session.user.id };
      }
    } else {
      planQuery = { userId: session.user.id };
    }

    console.log('🔍 Plan query:', planQuery);

    const userPlan = await plansCollection.findOne(
      planQuery,
      { sort: { generatedAt: -1 } }
    );

    console.log('📋 Found plan:', userPlan ? 'Yes' : 'No');

    if (!userPlan) {
      console.log('❌ No plan found for user');
      return NextResponse.json(
        { success: false, error: 'No training plan found for user' },
        { status: 404 }
      );
    }

    // Update the workout data for the specific date
    const workoutDate = new Date(date).toDateString();
    console.log('📅 Workout date:', workoutDate);
    
    // Initialize workoutEdits if it doesn't exist
    if (!userPlan.workoutEdits) {
      userPlan.workoutEdits = {};
    }

    // Save the edited workout for this date
    userPlan.workoutEdits[workoutDate] = {
      ...workout,
      editedAt: new Date(),
      editedBy: session.user.id
    };

    console.log('💾 Saving workout edit:', userPlan.workoutEdits[workoutDate]);

    // Update the plan in MongoDB
    const updateResult = await plansCollection.updateOne(
      { _id: userPlan._id },
      { 
        $set: { 
          workoutEdits: userPlan.workoutEdits,
          lastModified: new Date()
        }
      }
    );

    console.log('📊 Update result:', {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount
    });

    if (updateResult.modifiedCount === 0) {
      console.log('❌ Failed to update workout in MongoDB');
      return NextResponse.json(
        { success: false, error: 'Failed to update workout' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully saved workout edit for ${workoutDate}:`, workout.type);

    return NextResponse.json({
      success: true,
      message: 'Workout saved successfully',
      date: workoutDate,
      workout: userPlan.workoutEdits[workoutDate]
    });

  } catch (error) {
    console.error('💥 Save Workout API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save workout: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📖 GET Workout edits API called');
    
    const session = await getServerSession(authOptions);
    console.log('👤 GET Session check:', session?.user?.id ? 'Authenticated' : 'Not authenticated');
    
    if (!session?.user?.id) {
      console.log('❌ GET Authentication failed - no session');
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const planId = url.searchParams.get('planId');
    console.log('🔍 GET Request planId:', planId);

    // Get the plans collection
    const plansCollection = await getGeneratedPlansCollection();
    console.log('🗄️ GET Got plans collection');
    
    // Find the user's plan
    let planQuery: any;
    if (planId) {
      try {
        planQuery = { _id: new ObjectId(planId), userId: session.user.id };
      } catch (error) {
        console.log('❌ GET Invalid planId format, falling back to userId query');
        planQuery = { userId: session.user.id };
      }
    } else {
      planQuery = { userId: session.user.id };
    }

    console.log('🔍 GET Plan query:', planQuery);

    const userPlan = await plansCollection.findOne(
      planQuery,
      { sort: { generatedAt: -1 } }
    );

    console.log('📋 GET Found plan:', userPlan ? 'Yes' : 'No');
    if (userPlan) {
      console.log('📝 GET Workout edits in plan:', Object.keys(userPlan.workoutEdits || {}).length, 'edits');
      console.log('📅 GET Available edit dates:', Object.keys(userPlan.workoutEdits || {}));
    }

    if (!userPlan) {
      console.log('❌ GET No training plan found for user');
      return NextResponse.json(
        { success: false, error: 'No training plan found for user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workoutEdits: userPlan.workoutEdits || {},
      planId: userPlan._id.toString()
    });

  } catch (error) {
    console.error('❌ Get Workout Edits API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workout edits' },
      { status: 500 }
    );
  }
}