import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authConfig";
import unifiedWhatsAppService from "../../services/UnifiedWhatsAppService";

/**
 * Test WhatsApp notification endpoint
 * Use this to test WhatsApp integration
 * ADMIN ONLY - Disabled in production
 */
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { 
      phoneNumber, 
      type = 'booking', 
      testBookingDetails 
    } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { message: "Phone number is required", success: false },
        { status: 400 }
      );
    }

    let result;
    
    if (type === 'otp') {
      const testOTP = '123456';
      result = await unifiedWhatsAppService.sendOTP(phoneNumber, testOTP);
      
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? "Test OTP WhatsApp message sent successfully" 
          : "Failed to send test OTP",
        messageId: result.messageId,
        error: result.error,
        method: result.method,
        whatsappUrl: result.whatsappUrl
      });
      
    } else if (type === 'booking') {
      const bookingDetails = testBookingDetails || {
        bookingReference: 'TEST-' + Date.now(),
        courtName: 'Test Court S1',
        date: new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: '10:00 AM - 11:00 AM',
        amount: 500,
        customerName: 'Test Customer'
      };

      const bookingResult = await unifiedWhatsAppService.sendBookingConfirmation(
        phoneNumber,
        bookingDetails
      );

      return NextResponse.json({
        success: bookingResult,
        message: bookingResult 
          ? "Test booking WhatsApp confirmation sent successfully" 
          : "Failed to send test booking confirmation",
        bookingDetails
      });
      
    } else if (type === 'admin') {
      const adminDetails = testBookingDetails || {
        bookingReference: 'TEST-ADMIN-' + Date.now(),
        courtName: 'Test Court S1',
        date: new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: '10:00 AM - 11:00 AM',
        amount: 500,
        customerName: 'Test Customer',
        customerPhone: phoneNumber
      };

      const adminResult = await unifiedWhatsAppService.sendAdminNotification(
        adminDetails
      );

      return NextResponse.json({
        success: adminResult,
        message: adminResult 
          ? "Test admin WhatsApp notification sent successfully" 
          : "Failed to send test admin notification",
        adminDetails
      });
    }

    return NextResponse.json(
      { 
        message: "Invalid notification type. Use 'otp', 'booking', or 'admin'", 
        success: false 
      },
      { status: 400 }
    );

  } catch (error) {
    console.error("WhatsApp test error:", error);
    return NextResponse.json(
      { 
        message: "Error testing WhatsApp notification", 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get WhatsApp service status and configuration
 */
export async function GET(req: NextRequest) {
  try {
    const status = unifiedWhatsAppService.getStatus();
    
    return NextResponse.json({
      success: true,
      status,
      message: "WhatsApp service status retrieved successfully"
    });

  } catch (error) {
    console.error("WhatsApp status check error:", error);
    return NextResponse.json(
      { 
        message: "Error checking WhatsApp status", 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}
