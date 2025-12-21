import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`🏸 Updating match ${params.id} with native MongoDB...`);
  
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

    // Automatically determine winner if match is completed and scores are provided
    if (updateData.status === 'completed' && updateData.score) {
      const { team1Sets = 0, team2Sets = 0 } = updateData.score;
      if (team1Sets > team2Sets) {
        updateData.winner = updateData.team1 || 'Team 1';
      } else if (team2Sets > team1Sets) {
        updateData.winner = updateData.team2 || 'Team 2';
      }
    }

    // Update match
    const result = await db.collection('matches').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Match ${params.id} updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Match updated successfully',
      winner: updateData.winner || null
    });

  } catch (error) {
    console.error('❌ Match update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update match',
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
  console.log(`🗑️ Deleting match ${params.id}...`);
  
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
    
    // Delete match
    const result = await db.collection('matches').deleteOne({ 
      _id: new ObjectId(params.id) 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Match ${params.id} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'Match deleted successfully'
    });

  } catch (error) {
    console.error('❌ Match deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete match',
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