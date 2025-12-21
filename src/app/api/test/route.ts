import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  console.log('🧪 Test API called');
  return NextResponse.json({ 
    success: true, 
    message: 'Tournament import test API is working',
    timestamp: new Date().toISOString()
  });
}