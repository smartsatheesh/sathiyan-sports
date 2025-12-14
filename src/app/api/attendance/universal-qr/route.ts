import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Universal attendance QR code data
    const universalQrData = 'SATHIYAN_SPORTS_ATTENDANCE';
    
    // Generate QR code using QR Server API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(universalQrData)}&format=png&margin=15&bgcolor=FFFFFF&color=000000`;
    
    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: qrCodeUrl,
        qrData: universalQrData,
        description: 'Universal attendance QR code for turf entrance'
      }
    });
    
  } catch (error: any) {
    console.error('Universal QR generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate universal QR code',
        error: error.message 
      },
      { status: 500 }
    );
  }
}