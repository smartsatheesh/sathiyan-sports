import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import FeeCollection from '@/app/models/FeeCollection';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'coach')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    
    const fees = await (FeeCollection.find as any)({})
      .populate('userId', 'name email champId phone mobile')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      fees
    });

  } catch (error) {
    console.error('Fee collection GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      champId,
      userName,
      userEmail,
      userMobile,
      feeType,
      amount,
      dueDate,
      status = 'pending',
      notes
    } = body;

    // Validate required fields
    if (!champId || !userName || !userEmail || !feeType || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToMongoose();

    // Check if user exists (optional - you might want to create user if not exists)
    // For now, we'll store the user data directly in the fee record

    const newFee = new FeeCollection({
      champId,
      userName,
      userEmail,
      userMobile,
      feeType,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate),
      status,
      notes,
      createdBy: {
        name: session.user.name,
        email: session.user.email
      }
    });

    await newFee.save();

    return NextResponse.json({
      success: true,
      message: 'Fee added successfully',
      fee: newFee
    });

  } catch (error) {
    console.error('Fee collection POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add fee' },
      { status: 500 }
    );
  }
}