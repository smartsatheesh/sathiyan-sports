import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authConfig";
import whatsAppCloudService from '@/app/services/WhatsAppCloudService';

export async function GET(request: NextRequest) {
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
    console.log('🧪 Testing WhatsApp Cloud API...');
    
    const status = whatsAppCloudService.getStatus();
    console.log('📊 Service Status:', status);

    if (!status.configured) {
      return NextResponse.json({
        success: false,
        message: 'WhatsApp Cloud API not configured',
        status: status,
        setup: {
          steps: [
            '1. Go to https://developers.facebook.com/',
            '2. Create a Business App',
            '3. Add WhatsApp product',
            '4. Generate access token',
            '5. Add environment variables to .env.local:',
            '   WHATSAPP_ACCESS_TOKEN=your_token',
            '   WHATSAPP_PHONE_NUMBER_ID=your_phone_id'
          ]
        }
      }, { status: 400 });
    }

    // Test connection
    const connectionTest = await whatsAppCloudService.testConnection();
    console.log('🔗 Connection Test:', connectionTest);

    if (connectionTest.success) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Cloud API is configured and working!',
        phoneNumber: connectionTest.phoneNumber,
        status: status,
        nextSteps: [
          '1. Add test recipient numbers in Meta Developer Console',
          '2. Verify recipient numbers via WhatsApp',
          '3. Test sending OTP with POST /api/test-whatsapp-cloud'
        ]
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'WhatsApp Cloud API configuration error',
        error: connectionTest.error,
        status: status
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ WhatsApp Cloud API test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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
    const { mobile, testType = 'template' } = await request.json();

    if (!mobile) {
      return NextResponse.json({
        success: false,
        message: 'Mobile number is required'
      }, { status: 400 });
    }

    console.log(`📱 Testing WhatsApp Cloud API with ${mobile}`);

    // Generate test OTP
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔐 Test OTP: ${testOTP}`);

    let result;
    
    if (testType === 'text') {
      // Send as text message (requires pre-approved template or verified business)
      result = await whatsAppCloudService.sendOTPText(mobile, testOTP);
    } else {
      // Send using template (hello_world for testing)
      result = await whatsAppCloudService.sendOTP(mobile, testOTP);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp message sent successfully!',
        messageId: result.messageId,
        mobile: mobile,
        testOTP: testOTP,
        testType: testType
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send WhatsApp message',
        error: result.error,
        mobile: mobile,
        troubleshooting: [
          '1. Ensure recipient number is added and verified in Meta Console',
          '2. Check if access token is valid',
          '3. Verify phone number ID is correct',
          '4. For text messages, ensure business verification is complete'
        ]
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ WhatsApp Cloud API POST error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
