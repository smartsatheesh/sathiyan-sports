import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import FitnessEnrollment from '@/app/models/FitnessEnrollment';

// In a real application, you would have a FitnessPlan model
// For now, we'll simulate the API endpoints

export async function GET(request: NextRequest) {
  try {
    // This would fetch fitness plans from database
    // For now, we'll return the same data structure as in the component
    
    const fitnessPlans = [
      {
        id: 'strength-1',
        name: 'Muscle Building Fundamentals',
        category: 'strength',
        level: 'beginner',
        duration: '8 weeks',
        description: 'Build a solid foundation with compound movements and progressive overload.',
        price: 2999,
        rating: 4.8,
        enrolled: 1250
      },
      {
        id: 'strength-2',
        name: 'Advanced Powerlifting',
        category: 'strength',
        level: 'advanced',
        duration: '12 weeks',
        description: 'Maximize your strength in the big three: squat, bench, and deadlift.',
        price: 4999,
        rating: 4.9,
        enrolled: 485
      },
      {
        id: 'speed-1',
        name: 'Sprint Speed Development',
        category: 'speed',
        level: 'intermediate',
        duration: '6 weeks',
        description: 'Develop explosive speed and acceleration for sports performance.',
        price: 3499,
        rating: 4.7,
        enrolled: 890
      },
      {
        id: 'speed-2',
        name: 'Athletic Performance Speed',
        category: 'speed',
        level: 'advanced',
        duration: '10 weeks',
        description: 'Elite-level speed training for competitive athletes.',
        price: 5999,
        rating: 4.9,
        enrolled: 320
      },
      {
        id: 'stamina-1',
        name: 'Cardiovascular Endurance',
        category: 'stamina',
        level: 'beginner',
        duration: '8 weeks',
        description: 'Build your aerobic base and improve overall cardiovascular health.',
        price: 2499,
        rating: 4.6,
        enrolled: 1850
      },
      {
        id: 'stamina-2',
        name: 'Marathon Endurance',
        category: 'stamina',
        level: 'advanced',
        duration: '16 weeks',
        description: 'Train for long-distance events and peak endurance performance.',
        price: 4499,
        rating: 4.8,
        enrolled: 650
      }
    ];

    return NextResponse.json({
      success: true,
      plans: fitnessPlans
    });

  } catch (error) {
    console.error('Error fetching fitness plans:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch fitness plans'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      planId,
      name,
      email,
      phone,
      experience,
      goals,
      medicalConditions
    } = body;

    // Validate required fields
    if (!planId || !name || !email || !phone) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Connect to database
    await connectToMongoose();

    // Find the plan details (in a real app, this would be from a Plans collection)
    const planData = {
      'strength-1': { name: 'Muscle Building Fundamentals', category: 'strength', level: 'beginner', duration: '8 weeks', price: 2999 },
      'strength-2': { name: 'Advanced Powerlifting', category: 'strength', level: 'advanced', duration: '12 weeks', price: 4999 },
      'speed-1': { name: 'Sprint Speed Development', category: 'speed', level: 'intermediate', duration: '6 weeks', price: 3499 },
      'speed-2': { name: 'Athletic Performance Speed', category: 'speed', level: 'advanced', duration: '10 weeks', price: 5999 },
      'stamina-1': { name: 'Cardiovascular Endurance', category: 'stamina', level: 'beginner', duration: '8 weeks', price: 2499 },
      'stamina-2': { name: 'Marathon Endurance', category: 'stamina', level: 'advanced', duration: '16 weeks', price: 4499 }
    };

    const plan = planData[planId as keyof typeof planData];
    if (!plan) {
      return NextResponse.json({
        success: false,
        message: 'Invalid plan ID'
      }, { status: 400 });
    }

    // Calculate total days based on duration
    const weeks = parseInt(plan.duration.split(' ')[0]);
    const totalDays = weeks * 7;

    // Create fitness enrollment
    const fitnessEnrollment = new FitnessEnrollment({
      planId,
      planName: plan.name,
      planCategory: plan.category,
      planLevel: plan.level,
      planDuration: plan.duration,
      planPrice: plan.price,
      userName: name,
      userEmail: email,
      userPhone: phone,
      userExperience: experience,
      userGoals: goals,
      medicalConditions: medicalConditions,
      totalDays,
      totalAmount: plan.price,
      status: 'pending', // Will be activated after payment
      paymentStatus: 'pending'
    });

    const savedEnrollment = await fitnessEnrollment.save();

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in fitness plan',
      enrollmentId: savedEnrollment.enrollmentId,
      data: {
        enrollmentId: savedEnrollment.enrollmentId,
        planId: savedEnrollment.planId,
        planName: savedEnrollment.planName,
        userInfo: {
          name: savedEnrollment.userName,
          email: savedEnrollment.userEmail,
          phone: savedEnrollment.userPhone,
          experience: savedEnrollment.userExperience,
          goals: savedEnrollment.userGoals,
          medicalConditions: savedEnrollment.medicalConditions
        },
        enrollmentDate: savedEnrollment.enrollmentDate,
        status: savedEnrollment.status,
        paymentStatus: savedEnrollment.paymentStatus,
        totalAmount: savedEnrollment.totalAmount,
        totalDays: savedEnrollment.totalDays
      }
    });

  } catch (error) {
    console.error('Error enrolling in fitness plan:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to enroll in fitness plan'
    }, { status: 500 });
  }
}
