import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import FitnessEnrollment from '@/app/models/FitnessEnrollment';
import GeneratedFitnessPlan from '@/app/models/GeneratedFitnessPlanModel';
import { generateFitnessPlan, parseFitnessPlan, generateFallbackPlan } from '@/app/services/geminiService';
import { FitnessPromptParams } from '@/app/models/GeneratedFitnessPlan';

/**
 * Generate a personalized fitness plan for S3 fitness plan users
 * POST /api/fitness-plans/generate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      enrollmentId,
      fitnessGoal,
      fitnessLevel,
      daysPerWeek,
      timePerSession,
      equipmentAvailable,
      medicalConditions,
      specificFocus,
      planDuration
    } = body;

    // Validate required fields
    if (!enrollmentId || !fitnessGoal || !fitnessLevel || !daysPerWeek || !timePerSession) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: enrollmentId, fitnessGoal, fitnessLevel, daysPerWeek, timePerSession'
      }, { status: 400 });
    }

    // Validate enum values
    const validGoals = ['Fat Loss', 'Muscle Gain', 'Endurance', 'General Fitness'];
    const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
    
    if (!validGoals.includes(fitnessGoal)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid fitness goal. Must be one of: ' + validGoals.join(', ')
      }, { status: 400 });
    }

    if (!validLevels.includes(fitnessLevel)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid fitness level. Must be one of: ' + validLevels.join(', ')
      }, { status: 400 });
    }

    // Validate numeric fields
    if (daysPerWeek < 2 || daysPerWeek > 7) {
      return NextResponse.json({
        success: false,
        message: 'Days per week must be between 2 and 7'
      }, { status: 400 });
    }

    if (timePerSession < 15 || timePerSession > 180) {
      return NextResponse.json({
        success: false,
        message: 'Time per session must be between 15 and 180 minutes'
      }, { status: 400 });
    }

    // Connect to database
    await connectToMongoose();

    // Check if enrollment exists and is valid
    const enrollment = await (FitnessEnrollment.findOne as any)({ enrollmentId });
    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Enrollment not found'
      }, { status: 404 });
    }

    if (enrollment.status !== 'active') {
      return NextResponse.json({
        success: false,
        message: 'Enrollment must be active to generate fitness plan'
      }, { status: 400 });
    }

    // Check if a plan already exists for this enrollment
    const existingPlan = await (GeneratedFitnessPlan.findOne as any)({ enrollmentId });
    if (existingPlan) {
      return NextResponse.json({
        success: true,
        message: 'Fitness plan already exists for this enrollment',
        plan: existingPlan,
        isExisting: true
      });
    }

    // Prepare parameters for Gemini
    const promptParams: FitnessPromptParams = {
      fitnessGoal,
      fitnessLevel,
      daysPerWeek: parseInt(daysPerWeek),
      timePerSession: parseInt(timePerSession),
      equipmentAvailable: Array.isArray(equipmentAvailable) ? equipmentAvailable : [],
      medicalConditions: medicalConditions || undefined,
      specificFocus: specificFocus || undefined,
      planDuration: planDuration ? parseInt(planDuration) : 8
    };

    let generatedPlanData;
    let usingFallback = false;

    try {
      // Generate plan with Gemini AI
      console.log('🤖 Generating fitness plan with Gemini AI...');
      const geminiResponse = await generateFitnessPlan(promptParams);
      generatedPlanData = parseFitnessPlan(geminiResponse);
      console.log('✅ Successfully generated plan with Gemini AI');
    } catch (geminiError) {
      console.error('❌ Gemini AI failed, using fallback plan:', geminiError);
      generatedPlanData = generateFallbackPlan(promptParams);
      usingFallback = true;
    }

    // Create the generated fitness plan document
    const newPlan = new GeneratedFitnessPlan({
      enrollmentId,
      planId: enrollment.planId,
      userEmail: enrollment.userEmail,
      userName: enrollment.userName,
      
      // Plan Configuration
      fitnessGoal,
      fitnessLevel,
      daysPerWeek: parseInt(daysPerWeek),
      equipmentAvailable: Array.isArray(equipmentAvailable) ? equipmentAvailable : [],
      medicalConditions: medicalConditions || undefined,
      timePerSession: parseInt(timePerSession),
      
      // Generated Plan Content
      weeklyPlans: generatedPlanData.weeklyPlans || [],
      totalWeeks: generatedPlanData.totalWeeks || 8,
      planDescription: generatedPlanData.planDescription || 'Personalized fitness plan',
      nutritionNotes: generatedPlanData.nutritionNotes,
      safetyGuidelines: generatedPlanData.safetyGuidelines,
      
      // Metadata
      geminiModel: usingFallback ? 'fallback-v1' : 'gemini-1.5-flash',
      planStatus: 'active',
      currentWeek: 1
    });

    // Save the plan to database
    const savedPlan = await newPlan.save();

    // Update the enrollment with generated plan reference
    await (FitnessEnrollment.findOneAndUpdate as any)(
      { enrollmentId },
      { 
        notes: `Generated fitness plan created: ${savedPlan._id}`,
        lastProgressUpdate: new Date()
      }
    );

    console.log(`✅ Fitness plan generated and saved for enrollment: ${enrollmentId}`);

    return NextResponse.json({
      success: true,
      message: usingFallback 
        ? 'Fitness plan generated using fallback system' 
        : 'Fitness plan generated successfully with AI',
      plan: savedPlan,
      usingFallback,
      planId: savedPlan._id,
      enrollmentId: savedPlan.enrollmentId
    });

  } catch (error) {
    console.error('Error generating fitness plan:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to generate fitness plan',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * Get generated fitness plan by enrollment ID
 * GET /api/fitness-plans/generate?enrollmentId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');
    const userEmail = searchParams.get('userEmail');

    if (!enrollmentId && !userEmail) {
      return NextResponse.json({
        success: false,
        message: 'Either enrollmentId or userEmail is required'
      }, { status: 400 });
    }

    await connectToMongoose();

    let plans;
    if (enrollmentId) {
      // Get specific plan by enrollment ID
      plans = await (GeneratedFitnessPlan.findOne as any)({ enrollmentId });
      if (!plans) {
        return NextResponse.json({
          success: false,
          message: 'Generated fitness plan not found'
        }, { status: 404 });
      }
    } else if (userEmail) {
      // Get all active plans for user
      plans = await (GeneratedFitnessPlan.find as any)({ 
        userEmail, 
        planStatus: 'active' 
      }).sort({ createdAt: -1 });
    }

    return NextResponse.json({
      success: true,
      plans: Array.isArray(plans) ? plans : [plans]
    });

  } catch (error) {
    console.error('Error fetching generated fitness plan:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch fitness plan'
    }, { status: 500 });
  }
}

/**
 * Update generated fitness plan (progress, status, etc.)
 * PATCH /api/fitness-plans/generate
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { enrollmentId, currentWeek, planStatus } = body;

    if (!enrollmentId) {
      return NextResponse.json({
        success: false,
        message: 'enrollmentId is required'
      }, { status: 400 });
    }

    await connectToMongoose();

    const updateData: any = { lastUpdated: new Date() };
    
    if (currentWeek !== undefined) {
      updateData.currentWeek = parseInt(currentWeek);
    }
    
    if (planStatus) {
      updateData.planStatus = planStatus;
    }

    const updatedPlan = await (GeneratedFitnessPlan.findOneAndUpdate as any)(
      { enrollmentId },
      updateData,
      { new: true }
    );

    if (!updatedPlan) {
      return NextResponse.json({
        success: false,
        message: 'Generated fitness plan not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Plan updated successfully',
      plan: updatedPlan
    });

  } catch (error) {
    console.error('Error updating generated fitness plan:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update fitness plan'
    }, { status: 500 });
  }
}