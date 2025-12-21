import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Simple tournaments API using native MongoDB driver
export async function GET() {
  console.log('🎯 Fetching tournaments with native MongoDB...');
  
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
    
    // Get tournaments
    const tournaments = await db.collection('tournaments').find({}).toArray();
    console.log(`✅ Found ${tournaments.length} tournaments`);
    
    // For each tournament, get player and match counts
    const enrichedTournaments = await Promise.all(
      tournaments.map(async (tournament) => {
        const [playersCount, matchesCount] = await Promise.all([
          db.collection('players').countDocuments({ tournamentId: tournament._id }),
          db.collection('matches').countDocuments({ tournamentId: tournament._id })
        ]);
        
        return {
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
          playersCount,
          matchesCount,
          createdAt: tournament.createdAt,
          updatedAt: tournament.updatedAt
        };
      })
    );

    return NextResponse.json({
      success: true,
      tournaments: enrichedTournaments
    });

  } catch (error) {
    console.error('❌ Native tournaments API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tournaments',
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