import { NextRequest, NextResponse } from 'next/server';
import unifiedWhatsAppService from '@/app/services/UnifiedWhatsAppService';

export async function GET(request: NextRequest) {
  try {
    const status = unifiedWhatsAppService.getStatus();
    
    return NextResponse.json({
      success: true,
      status,
      methods: {
        simple: {
          description: 'Console logging + WhatsApp URLs (No setup required)',
          requirements: 'None - Always available',
          pros: ['No API keys needed', 'Works immediately', 'Good for development'],
          cons: ['Manual message sending', 'No automation']
        },
        url: {
          description: 'Generate WhatsApp URLs for easy sending',
          requirements: 'None - Always available', 
          pros: ['No API keys needed', 'One-click sending', 'Works on all devices'],
          cons: ['Semi-manual process', 'User needs to click URLs']
        },
        twilio: {
          description: 'Twilio WhatsApp Business API',
          requirements: 'Twilio account + WhatsApp Business approval',
          pros: ['Fully automated', 'Reliable delivery', 'Good documentation'],
          cons: ['Paid service', 'Still needs approval process']
        },
        cloud: {
          description: 'Meta WhatsApp Cloud API (Official)',
          requirements: 'Meta Developer account + Business verification',
          pros: ['Official API', 'Free tier available', 'Most features'],
          cons: ['Complex setup', 'Business verification required']
        }
      }
    });

  } catch (error) {
    console.error('Error in WhatsApp alternatives test:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { method, type, phoneNumber, data } = await request.json();
    
    // Switch method if provided
    if (method && ['cloud', 'twilio', 'url', 'simple'].includes(method)) {
      unifiedWhatsAppService.switchMethod(method as any);
    }

    let result;
    
    switch (type) {
      case 'otp':
        result = await unifiedWhatsAppService.sendOTP(phoneNumber, data.otp || '123456');
        break;
        
      case 'booking':
        result = await unifiedWhatsAppService.sendBookingConfirmation(phoneNumber, {
          bookingReference: data.bookingReference || 'TEST-001',
          courtName: data.courtName || 'Badminton Court 1',
          date: data.date || new Date().toDateString(),
          time: data.time || '10:00 AM - 11:00 AM',
          amount: data.amount || 500,
          customerName: data.customerName || 'Test Customer'
        });
        break;
        
      case 'admin':
        result = await unifiedWhatsAppService.sendAdminNotification({
          bookingReference: data.bookingReference || 'TEST-001',
          courtName: data.courtName || 'Badminton Court 1', 
          date: data.date || new Date().toDateString(),
          time: data.time || '10:00 AM - 11:00 AM',
          amount: data.amount || 500,
          customerName: data.customerName || 'Test Customer',
          customerPhone: phoneNumber
        });
        break;
        
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      method: unifiedWhatsAppService.getStatus().currentMethod,
      instructions: getInstructions(unifiedWhatsAppService.getStatus().currentMethod)
    });

  } catch (error) {
    console.error('Error testing WhatsApp alternatives:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getInstructions(method: string): string {
  switch (method) {
    case 'simple':
      return 'Check the server console for the notification details. WhatsApp URLs are provided for manual sending.';
    case 'url':
      return 'Use the generated WhatsApp URLs to send messages with one click.';
    case 'twilio':
      return 'Message sent automatically via Twilio. Check your WhatsApp for delivery.';
    case 'cloud':
      return 'Message sent via Meta WhatsApp Cloud API. Check delivery status in Meta Console.';
    default:
      return 'Check the server console for details.';
  }
}
