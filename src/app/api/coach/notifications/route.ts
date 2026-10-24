import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';

interface NotificationRequest {
  phoneNumber?: string;
  athleteName?: string;
  workout?: {
    name: string;
    duration: string;
    intensity: string;
    motivation: string;
  };
  type: 'daily' | 'motivation' | 'reminder' | 'training_plan';
  customMessage?: string;
  plan?: any; // For training plan notifications
  userInfo?: {
    name: string;
    sport: string;
  };
}

// Helper function to format training plan for WhatsApp
function formatTrainingPlanForWhatsApp(plan: any, userInfo: any): string {
  try {
    let summary = '';
    
    if (typeof plan === 'string') {
      // If plan is a string, extract key points
      const lines = plan.split('\n').filter(line => line.trim());
      const keyPoints = lines.slice(0, 8).map(line => line.trim());
      summary = keyPoints.join('\n');
    } else if (plan && typeof plan === 'object') {
      // If plan is an object, extract structured data
      if (plan.summary) {
        summary = plan.summary;
      } else if (plan.workouts) {
        summary = `🏋️‍♂️ *Weekly Workouts:* ${plan.workouts.length || 0}\n`;
        summary += `⏱️ *Duration:* ${plan.duration || 'Custom'}\n`;
        summary += `🎯 *Focus:* ${plan.focus || userInfo.sport + ' Skills'}`;
      } else {
        summary = JSON.stringify(plan).substring(0, 200) + '...';
      }
    } else {
      summary = `Personalized ${userInfo.sport} training plan generated successfully!`;
    }
    
    // Ensure summary isn't too long for WhatsApp
    if (summary.length > 300) {
      summary = summary.substring(0, 300) + '...';
    }
    
    return summary;
  } catch (error) {
    return `🎯 Your personalized ${userInfo.sport} training plan is ready with custom workouts and progressions!`;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🏃‍♂️ The Coach: Processing notification request');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.mobile) {
      return NextResponse.json(
        { error: "User mobile number not found in session" },
        { status: 400 }
      );
    }

    const data: NotificationRequest = await req.json();
    
    // Use session data as fallback
    const phoneNumber = data.phoneNumber || session.user.mobile;
    const athleteName = data.athleteName || session.user.name || 'Athlete';

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    let message = '';
    const currentTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    });

    const currentDate = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    switch (data.type) {
      case 'training_plan':
        if (data.plan && data.userInfo) {
          // Format training plan for WhatsApp
          const planSummary = formatTrainingPlanForWhatsApp(data.plan, data.userInfo);
          message = `🤖 *The Coach - AI Training Plan*

Hi ${athleteName}! 👋

🎯 *Your Personalized ${data.userInfo.sport} Training Plan*
📅 Generated on ${currentDate}

${planSummary}

💪 *Ready to transform your game?*

📱 Keep this plan handy and follow it consistently for best results!

🌟 *Remember:* Consistency is key to achieving your goals!

Powered by The Coach AI 🚀`;
        } else {
          message = `🤖 *The Coach - Training Plan Ready!*

Hi ${athleteName}! 👋

Your personalized AI training plan has been generated and is ready for you!

🎯 *Key Benefits:*
• Customized to your skill level
• Scientifically designed workouts
• Progressive difficulty increase
• Injury prevention focus

💪 Visit your Coach dashboard to view the complete plan and start your transformation journey!

Keep pushing forward! 🚀

Powered by The Coach AI 🤖`;
        }
        break;
      case 'daily':
        if (data.workout) {
          message = `🏃‍♂️ *Good Morning ${data.athleteName}!*

🗓️ *Today's Training* - ${currentDate}
⏰ Time: ${currentTime}

💪 *Workout:* ${data.workout.name}
⏱️ *Duration:* ${data.workout.duration}
🔥 *Intensity:* ${data.workout.intensity}

🌟 *Daily Motivation:*
${data.workout.motivation}

🚀 Ready to crush today's goals? Let's go!

Powered by The Coach AI 🤖`;
        } else {
          message = `🏃‍♂️ *Good Morning ${data.athleteName}!*

🗓️ ${currentDate}
⏰ ${currentTime}

💪 Today is a new opportunity to become stronger!

🌟 Remember: Every champion was once a beginner who refused to give up.

Stay motivated! 🚀

Powered by The Coach AI 🤖`;
        }
        break;

      case 'motivation':
        const motivationalQuotes = [
          "Success isn't given. It's earned in the gym, on the field, in every drop of sweat! 💪",
          "Your only limit is your mind. Push beyond it today! 🧠💥",
          "Champions don't become champions in the ring. They become champions in their training! 🏆",
          "The pain you feel today will be the strength you feel tomorrow! 💪⚡",
          "Don't wait for motivation. Create it through action! 🔥",
          "Every workout is a small victory towards your bigger goal! 🎯",
          "Your body can do it. It's your mind you need to convince! 🧠💪"
        ];
        
        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        
        message = `🌟 *Motivation Alert!*

Hi ${data.athleteName}! 👋

${data.customMessage || randomQuote}

Keep pushing towards your goals! 🚀

Powered by The Coach AI 🤖`;
        break;

      case 'reminder':
        message = `⏰ *Training Reminder*

Hi ${data.athleteName}!

🏃‍♂️ Don't forget about your training session today!

${data.customMessage || 'Time to get moving and achieve your fitness goals!'}

See you on the field! 💪

Powered by The Coach AI 🤖`;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid notification type" },
          { status: 400 }
        );
    }

    console.log('🏃‍♂️ The Coach: Sending notification to', athleteName);
    console.log('📱 Message preview:', message.substring(0, 100) + '...');

    // Free: hand back a WhatsApp share link instead of sending through a paid API
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      message: "Open WhatsApp to share your plan",
      notificationType: data.type,
      recipient: athleteName,
      whatsappUrl,
    });

  } catch (error) {
    console.error("❌ The Coach notification error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to send notification",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
