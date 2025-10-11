import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from '@/app/models/User';
import otpService from '@/app/services/OTPService';
import whatsAppCloudService from '@/app/services/WhatsAppCloudService';

export async function POST(request: NextRequest) {
  try {
    const { mobile } = await request.json();

    // Validate mobile number
    if (!mobile) {
      return NextResponse.json(
        { success: false, message: 'Mobile number is required' },
        { status: 400 }
      );
    }

    // Format mobile number (remove +, spaces, etc.)
    const formattedMobile = mobile.replace(/[+\s-]/g, '');

    // Validate Indian mobile number format
    if (!/^[6-9]\d{9}$/.test(formattedMobile)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid Indian mobile number' },
        { status: 400 }
      );
    }

    await connectToMongoose();

    // Check if user exists with this mobile number
    const user = await (User as any).findOne({ mobile: formattedMobile });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No account found with this mobile number' },
        { status: 404 }
      );
    }

    // Check if user has a password (some users might have only social login)
    if (!user.password) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'This account uses social login. Please login with Google or Facebook.' 
        },
        { status: 400 }
      );
    }

    // Check if there's already a valid OTP for this mobile
    const hasValidOTP = await otpService.hasValidOTP(formattedMobile);
    if (hasValidOTP) {
      const otpStatus = await otpService.getOTPStatus(formattedMobile);
      const timeLeft = otpStatus.expiresAt ? 
        Math.ceil((otpStatus.expiresAt.getTime() - Date.now()) / (1000 * 60)) : 0;

      return NextResponse.json(
        { 
          success: false, 
          message: `OTP already sent. Please wait ${timeLeft} minutes before requesting a new one.`,
          attemptsRemaining: otpStatus.attemptsRemaining,
          expiresIn: timeLeft
        },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = otpService.generateOTP();
    console.log(`🔐 Generated OTP for ${formattedMobile}: ${otp}`);

    // Store OTP
    await otpService.storeOTP(formattedMobile, otp);
    console.log(`💾 OTP stored successfully for ${formattedMobile}`);

    // Try to send OTP via WhatsApp Cloud API
    console.log(`📱 Attempting to send WhatsApp Cloud OTP to ${formattedMobile}...`);
    const whatsappResult = await whatsAppCloudService.sendOTPText(formattedMobile, otp);
    
    console.log(`📱 WhatsApp Cloud result:`, whatsappResult);

    if (whatsappResult.success) {
      console.log(`✅ WhatsApp Cloud OTP sent successfully! Message ID: ${whatsappResult.messageId}`);
      
      return NextResponse.json({
        success: true,
        message: 'OTP sent to your WhatsApp number successfully!',
        mobile: formattedMobile,
        messageId: whatsappResult.messageId,
        expiresIn: 10, // minutes
        deliveryMethod: 'whatsapp_cloud'
      });
    } else {
      // WhatsApp failed, but we still generated the OTP
      console.error('❌ WhatsApp Cloud failed, falling back to console log');
      console.log(`🔐 Fallback OTP for ${formattedMobile}: ${otp}`);
      
      return NextResponse.json({
        success: true,
        message: 'OTP generated. WhatsApp delivery failed - check server console or contact support.',
        mobile: formattedMobile,
        expiresIn: 10,
        deliveryMethod: 'console_fallback',
        whatsappError: whatsappResult.error,
        // In development, include OTP for testing
        devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
      });
    }

  } catch (error) {
    console.error('Error in forgot password Cloud OTP:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method to check OTP status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mobile = url.searchParams.get('mobile');

    if (!mobile) {
      return NextResponse.json(
        { success: false, message: 'Mobile number is required' },
        { status: 400 }
      );
    }

    const formattedMobile = mobile.replace(/[+\s-]/g, '');
    
    await connectToMongoose();

    // Check if user exists
    const user = await (User as any).findOne({ mobile: formattedMobile });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get OTP status
    const otpStatus = await otpService.getOTPStatus(formattedMobile);
    
    // Check WhatsApp Cloud API status
    const whatsappStatus = whatsAppCloudService.getStatus();

    return NextResponse.json({
      success: true,
      mobile: formattedMobile,
      otpStatus: otpStatus,
      whatsappCloudStatus: whatsappStatus
    });

  } catch (error) {
    console.error('Error checking OTP status:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
