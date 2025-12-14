import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const champId = url.searchParams.get('champId');
    
    if (!champId) {
      return NextResponse.json(
        { success: false, message: 'ChampID is required' },
        { status: 400 }
      );
    }

    // Generate QR code data URL
    const qrData = champId.toUpperCase();
    
    // Using QR Server API for simple QR code generation
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&format=png&margin=10`;
    
    return NextResponse.json({
      success: true,
      data: {
        champId: qrData,
        qrCodeUrl: qrCodeUrl,
        qrData: qrData
      }
    });
    
  } catch (error: any) {
    console.error('QR generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate QR code',
        error: error.message 
      },
      { status: 500 }
    );
  }
}