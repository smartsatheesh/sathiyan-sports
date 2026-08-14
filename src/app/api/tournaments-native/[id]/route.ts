import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`🎯 Fetching tournament ${params.id} with native MongoDB...`);
  
  let client;
  try {
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
    
    // Get tournament
    const tournament = await db.collection('tournaments').findOne({ 
      _id: new ObjectId(params.id) 
    });
    
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get players
    const players = await db.collection('players').find({ 
      tournamentId: tournament._id 
    }).toArray();
    
    // Get matches
    const matches = await db.collection('matches').find({ 
      tournamentId: tournament._id 
    }).toArray();

    console.log(`✅ Tournament: ${tournament.name}, Players: ${players.length}, Matches: ${matches.length}`);

    const result = {
      tournament: {
        _id: tournament._id.toString(),
        name: tournament.name,
        sport: tournament.sport,
        type: tournament.type,
        status: tournament.status,
        description: tournament.description,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        registrationFee: tournament.registrationFee,
        maxPlayers: tournament.maxPlayers,
        venue: tournament.venue,
        categories: tournament.categories,
        rules: tournament.rules,
        prizes: tournament.prizes,
        createdAt: tournament.createdAt,
        updatedAt: tournament.updatedAt
      },
      players: players.map(player => ({
        _id: player._id.toString(),
        name: player.name,
        phone: player.phone,
        category: player.category,
        partner: player.partner,
        partnerName: player.partnerName || player.partner,
        registrationFee: player.registrationFee,
        paymentStatus: player.paymentStatus,
        registeredAt: player.registeredAt,
        tournamentId: player.tournamentId.toString()
      })),
      matches: matches.map(match => ({
        _id: match._id.toString(),
        // Support both old (team1/team2) and new (player1Name/player2Name) field names
        team1: match.team1 || match.player1Name || 'TBD',
        team2: match.team2 || match.player2Name || 'TBD',
        player1Name: match.player1Name || match.team1 || 'TBD',
        player2Name: match.player2Name || match.team2 || 'TBD',
        player1Partner: match.player1Partner || '',
        player2Partner: match.player2Partner || '',
        player1TeamId: match.player1TeamId || '',
        player2TeamId: match.player2TeamId || '',
        category: match.category || '',
        matchCode: match.matchCode || `M${match.matchNumber}`,
        matchNumber: match.matchNumber,
        status: match.status,
        round: match.round,
        scheduledTime: match.scheduledTime,
        venue: match.venue || '',
        courtNumber: match.courtNumber || '',
        score: match.score || { player1Sets: 0, player2Sets: 0, sets: [] },
        liveScore: match.liveScore || null,
        winnerName: match.winnerName || '',
        nextMatchNumber: match.nextMatchNumber || null,
        nextMatchSlot: match.nextMatchSlot || null,
        tournamentId: match.tournamentId.toString()
      }))
    };

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Native tournament detail API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tournament details',
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`🎯 Updating tournament ${params.id} with native MongoDB...`);
  
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

    // Update tournament
    const result = await db.collection('tournaments').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Tournament ${params.id} updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Tournament updated successfully'
    });

  } catch (error) {
    console.error('❌ Tournament update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update tournament',
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