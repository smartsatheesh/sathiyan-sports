// WhatsApp Webhook Handler (Legacy - Disabled for now)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'WhatsApp webhook temporarily disabled' }, { status: 200 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'WhatsApp webhook temporarily disabled' }, { status: 200 });
}
