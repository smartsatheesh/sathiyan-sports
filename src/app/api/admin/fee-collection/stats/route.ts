import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import FeeCollection from '@/app/models/FeeCollection';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    
    // Get all fees for statistics
    const allFees = await (FeeCollection.find as any)({}).lean();
    
    // Calculate statistics
    const totalFees = allFees.length;
    const pendingFees = allFees.filter(fee => fee.status === 'pending').length;
    const paidFees = allFees.filter(fee => fee.status === 'paid').length;
    const overdueFees = allFees.filter(fee => fee.status === 'overdue').length;
    
    const totalAmount = allFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const paidAmount = allFees
      .filter(fee => fee.status === 'paid')
      .reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const pendingAmount = allFees
      .filter(fee => fee.status === 'pending')
      .reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const overdueAmount = allFees
      .filter(fee => fee.status === 'overdue')
      .reduce((sum, fee) => sum + (fee.amount || 0), 0);

    return NextResponse.json({
      success: true,
      overview: {
        totalFees,
        pendingFees,
        paidFees,
        overdueFees,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount
      }
    });

  } catch (error) {
    console.error('Fee collection stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fee statistics' },
      { status: 500 }
    );
  }
}