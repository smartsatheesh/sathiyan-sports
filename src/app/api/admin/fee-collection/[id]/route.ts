import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import FeeCollection from '@/app/models/FeeCollection';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'coach')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = params;

    await connectToMongoose();

    const updatedFee = await (FeeCollection.findByIdAndUpdate as any)(
      id,
      {
        ...body,
        amount: parseFloat(body.amount),
        dueDate: new Date(body.dueDate),
        updatedBy: {
          name: session.user.name,
          email: session.user.email
        }
      },
      { new: true }
    );

    if (!updatedFee) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Fee updated successfully',
      fee: updatedFee
    });

  } catch (error) {
    console.error('Fee collection PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update fee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'coach')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    await connectToMongoose();

    const deletedFee = await (FeeCollection.findByIdAndDelete as any)(id);

    if (!deletedFee) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Fee deleted successfully'
    });

  } catch (error) {
    console.error('Fee collection DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete fee' },
      { status: 500 }
    );
  }
}