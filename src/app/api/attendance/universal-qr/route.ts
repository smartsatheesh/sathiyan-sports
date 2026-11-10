import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // A link to the check-in page, so any phone camera opens it straight away.
    // Built from the address this site is served on — reprint the code after a domain change.
    const checkInUrl = `${new URL(req.url).origin}/attendance?checkin=1`;

    // Generate QR code using QR Server API (free)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(checkInUrl)}&format=png&margin=15&bgcolor=FFFFFF&color=000000`;

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl,
        qrData: checkInUrl,
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
