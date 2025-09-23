import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/Mongo';
import User from '@/app/models/User';
import otpService from '@/app/services/OTPService';
import unifiedWhatsAppService from '@/app/services/UnifiedWhatsAppService';

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

    await connectDB();

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

    // Send OTP via WhatsApp using unified service
    console.log(`📱 Attempting to send WhatsApp OTP to ${formattedMobile}...`);
    const whatsappResult = await unifiedWhatsAppService.sendOTP(formattedMobile, otp);
    console.log(`📱 WhatsApp send result:`, whatsappResult);

    if (!whatsappResult.success) {
      console.error('Failed to send WhatsApp OTP, falling back to console log');
      console.log(`🔐 OTP for ${formattedMobile}: ${otp}`);
      
      // If there's a WhatsApp URL, log it for manual sending
      if (whatsappResult.whatsappUrl) {
        console.log(`📱 Manual WhatsApp URL: ${whatsappResult.whatsappUrl}`);
      }
    }

    console.log(`📱 Password reset OTP sent to ${formattedMobile}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: whatsappResult.success 
        ? 'OTP sent to your WhatsApp number. Please check your messages.'
        : 'OTP generated. Check server console or use the provided WhatsApp URL.',
      mobile: formattedMobile,
      whatsappSent: whatsappResult.success,
      whatsappUrl: whatsappResult.whatsappUrl, // Include URL for manual sending
      method: whatsappResult.method,
      expiresIn: 10 // minutes
    });

  } catch (error) {
    console.error('Error in forgot password OTP:', error);
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
    const otpStatus = await otpService.getOTPStatus(formattedMobile);

    if (!otpStatus.hasOTP) {
      return NextResponse.json({
        success: true,
        hasOTP: false,
        message: 'No active OTP found'
      });
    }

    const timeLeft = otpStatus.expiresAt ? 
      Math.ceil((otpStatus.expiresAt.getTime() - Date.now()) / (1000 * 60)) : 0;

    return NextResponse.json({
      success: true,
      hasOTP: true,
      attemptsRemaining: otpStatus.attemptsRemaining,
      expiresIn: timeLeft,
      message: `OTP expires in ${timeLeft} minutes`
    });

  } catch (error) {
    console.error('Error checking OTP status:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
