import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authConfig";
import unifiedWhatsAppService from '../../services/UnifiedWhatsAppService';

export async function POST(request: NextRequest) {
  // Disable in production environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: "Test routes are disabled in production", success: false },
      { status: 403 }
    );
  }

  // Check admin authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { message: "Admin access required", success: false },
      { status: 401 }
    );
  }

  try {
    const { phoneNumber, testPlan } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log('🏃‍♂️ Testing Coach WhatsApp notification to:', phoneNumber);

    // Test plan data
    const samplePlan = testPlan || {
      overview: "Your personalized AI training plan is ready!",
      weekly_schedule: {
        Monday: "Strength Training - Push Focus",
        Tuesday: "Cardio & Agility",
        Wednesday: "Skill Development",
        Thursday: "Pull & Core Training",
        Friday: "Sport-Specific Practice",
        Saturday: "Active Recovery",
        Sunday: "Rest Day"
      },
      nutrition_tips: [
        "Stay hydrated with 3-4 liters of water daily",
        "Eat protein within 30 minutes post-workout",
        "Include complex carbs for sustained energy"
      ]
    };

    // Format test message for WhatsApp
    const message = `🤖 *The Coach - AI Training Plan (TEST)*

Hi there! 👋

🎯 *Your Personalized Training Plan*
📅 Generated for Testing

📋 *Overview:*
${samplePlan.overview}

📅 *Weekly Schedule:*
${Object.entries(samplePlan.weekly_schedule).map(([day, workout]) => 
  `• ${day}: ${workout}`
).join('\n')}

🥗 *Nutrition Tips:*
${samplePlan.nutrition_tips.map((tip: string) => `• ${tip}`).join('\n')}

💪 *Ready to transform your game?*

📱 This is a test message from The Coach AI system!

Powered by The Coach AI 🚀`;

    // Send WhatsApp notification
    const result = await unifiedWhatsAppService.sendCustomMessage(phoneNumber, message);

    return NextResponse.json({
      success: result,
      message: result ? 
        'Test training plan sent to WhatsApp successfully!' : 
        'Failed to send WhatsApp notification',
      phoneNumber,
      method: unifiedWhatsAppService.getStatus().currentMethod,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test Coach WhatsApp error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'Test endpoint for Coach WhatsApp notifications',
    usage: 'POST with { phoneNumber: "9787020525", testPlan?: object }',
    methods: unifiedWhatsAppService.getStatus()
  });
}