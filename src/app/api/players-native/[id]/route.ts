import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`👤 Updating player ${params.id} with native MongoDB...`);
  
  let client;
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found');
    }

    const body = await request.json();
    
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    
    await client.connect();
    const db = client.db('SathiyanSports');
    
    // Remove _id from update data to avoid conflicts
    const { _id, ...updateData } = body;
    updateData.updatedAt = new Date();

    // Update player
    const result = await db.collection('players').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Player ${params.id} updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Player updated successfully'
    });

  } catch (error) {
    console.error('❌ Player update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update player',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`🗑️ Deleting player ${params.id}...`);
  
  let client;
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found');
    }

    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    
    await client.connect();
    const db = client.db('SathiyanSports');
    
    // Delete player
    const result = await db.collection('players').deleteOne({ 
      _id: new ObjectId(params.id) 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Player ${params.id} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'Player deleted successfully'
    });

  } catch (error) {
    console.error('❌ Player deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete player',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}