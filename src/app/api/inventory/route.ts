import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Inventory from '@/app/models/Inventory';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';

// GET - Fetch all inventory items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'coach')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    const inventory = await (Inventory.find as any)({})
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST - Create new inventory item or add transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'create') {
      const { itemName, itemType, currentQuantity, reorderLevel, unit, description } = data;
      
      const inventory = new Inventory({
        itemName,
        itemType,
        currentQuantity,
        reorderLevel,
        unit: unit || 'pieces',
        description,
        lastRestocked: new Date(),
      });

      await inventory.save();
      
      return NextResponse.json({
        success: true,
        message: 'Inventory item created successfully',
        inventory,
      });
    } else if (action === 'transaction') {
      const { itemId, type, quantity, reason, notes } = data;
      
      const inventory = await (Inventory as any).findById(itemId);
      if (!inventory) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      // Update quantity
      if (type === 'inflow') {
        inventory.currentQuantity += quantity;
        inventory.lastRestocked = new Date();
      } else if (type === 'outflow') {
        if (inventory.currentQuantity < quantity) {
          return NextResponse.json(
            { error: 'Insufficient quantity' },
            { status: 400 }
          );
        }
        inventory.currentQuantity -= quantity;
      }

      // Record transaction
      inventory.transactions.push({
        date: new Date(),
        type,
        quantity,
        reason,
        notes: notes || '',
        recordedBy: session.user?.name || 'Admin',
      });

      inventory.lastCheckDate = new Date();
      await inventory.save();

      return NextResponse.json({
        success: true,
        message: `Transaction recorded successfully`,
        inventory,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Inventory creation error:', error);
    return NextResponse.json(
      { error: 'Failed to process inventory' },
      { status: 500 }
    );
  }
}

// PUT - Update inventory item
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    const body = await request.json();
    const { itemId, reorderLevel, description } = body;

    const inventory = await (Inventory as any).findByIdAndUpdate(
      itemId,
      {
        reorderLevel: reorderLevel || undefined,
        description: description || undefined,
        lastCheckDate: new Date(),
      },
      { new: true }
    );

    if (!inventory) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item updated',
      inventory,
    });
  } catch (error) {
    console.error('Inventory update error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

// DELETE - Delete inventory item
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID required' },
        { status: 400 }
      );
    }

    await (Inventory as any).findByIdAndDelete(itemId);

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted',
    });
  } catch (error) {
    console.error('Inventory delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory' },
      { status: 500 }
    );
  }
}
