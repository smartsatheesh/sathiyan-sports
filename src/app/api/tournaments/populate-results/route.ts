import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

// Tournament data based on the match results from images
const TOURNAMENT_DATA = {
  // All players from images and handwritten sheet
  players: [
    // A League Players
    { name: 'A1', category: 'A League', phone: '+919876543210' },
    { name: 'A2', category: 'A League', phone: '+919876543211' },
    { name: 'A3', category: 'A League', phone: '+919876543212' },
    { name: 'A4', category: 'A League', phone: '+919876543213' },
    { name: 'A5', category: 'A League', phone: '+919876543214' },
    { name: 'A6', category: 'A League', phone: '+919876543215' },
    
    // C League Players
    { name: 'C1', category: 'C League', phone: '+919876543220' },
    { name: 'C2', category: 'C League', phone: '+919876543221' },
    { name: 'C3', category: 'C League', phone: '+919876543222' },
    { name: 'C4', category: 'C League', phone: '+919876543223' },
    { name: 'C5', category: 'C League', phone: '+919876543224' },
    
    // B League Players from handwritten sheet
    { name: 'Katayee P', category: 'B League', phone: '+919876543230' },
    { name: 'Mukesh S', category: 'B League', phone: '+919876543231' },
    { name: 'Srinivashen D', category: 'B League', phone: '+919876543232' },
    { name: 'Karthi Vel', category: 'B League', phone: '+919876543233' },
    { name: 'Balaji P', category: 'B League', phone: '+919876543234' },
    { name: 'Vinod S', category: 'B League', phone: '+919876543235' },
    { name: 'Sathiyan S', category: 'B League', phone: '+919876543236' },
    { name: 'Prasad T', category: 'B League', phone: '+919876543237' },
    { name: 'Vineet G', category: 'B League', phone: '+919876543238' },
    { name: 'Ragava K', category: 'B League', phone: '+919876543239' },
    
    // Additional B League players to reach 34 total
    ...Array.from({ length: 13 }, (_, i) => ({
      name: `B Player ${i + 11}`,
      category: 'B League',
      phone: `+91987654324${i}`
    }))
  ],
  
  // A League Match Results from image 1
  aLeagueMatches: [
    { match: 1, team1: 'A1', team2: 'A2', status: 'completed', winner: 'A1' },
    { match: 2, team1: 'A1', team2: 'A3', status: 'scheduled', winner: null },
    { match: 3, team1: 'A1', team2: 'A4', status: 'scheduled', winner: null },
    { match: 4, team1: 'A1', team2: 'A5', status: 'scheduled', winner: null },
    { match: 5, team1: 'A1', team2: 'A6', status: 'scheduled', winner: null },
    { match: 6, team1: 'A2', team2: 'A3', status: 'scheduled', winner: null },
    { match: 7, team1: 'A2', team2: 'A4', status: 'completed', winner: 'A2' },
    { match: 8, team1: 'A2', team2: 'A5', status: 'scheduled', winner: null },
    { match: 9, team1: 'A2', team2: 'A6', status: 'completed', winner: 'A6' },
    { match: 10, team1: 'A3', team2: 'A4', status: 'scheduled', winner: null },
    { match: 11, team1: 'A3', team2: 'A5', status: 'completed', winner: 'A3' },
    { match: 12, team1: 'A3', team2: 'A6', status: 'completed', winner: 'A6' },
    { match: 13, team1: 'A4', team2: 'A5', status: 'scheduled', winner: null },
    { match: 14, team1: 'A4', team2: 'A6', status: 'completed', winner: 'A6' },
    { match: 15, team1: 'A5', team2: 'A6', status: 'scheduled', winner: null }
  ],
  
  // C League Match Results from image 2
  cLeagueMatches: [
    { match: 1, team1: 'C1', team2: 'C2', status: 'completed', winner: 'C2' },
    { match: 2, team1: 'C1', team2: 'C3', status: 'completed', winner: 'C3' },
    { match: 3, team1: 'C1', team2: 'C4', status: 'completed', winner: 'C4' },
    { match: 4, team1: 'C1', team2: 'C5', status: 'completed', winner: 'C5' },
    { match: 5, team1: 'C2', team2: 'C3', status: 'completed', winner: 'C2' },
    { match: 6, team1: 'C2', team2: 'C4', status: 'completed', winner: 'C2' },
    { match: 7, team1: 'C2', team2: 'C5', status: 'completed', winner: 'C2' },
    { match: 8, team1: 'C3', team2: 'C4', status: 'scheduled', winner: null },
    { match: 9, team1: 'C3', team2: 'C5', status: 'completed', winner: 'C5' },
    { match: 10, team1: 'C4', team2: 'C5', status: 'completed', winner: 'C4' }
  ]
};

export async function POST() {
  console.log('🎯 Populating tournament with match results...');
  
  let client;
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found');
    }

    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
    });
    
    await client.connect();
    const db = client.db('SathiyanSports');
    
    // Find or create tournament
    let tournament = await db.collection('tournaments').findOne({ 
      name: /sathiyan.*sports.*tournament/i 
    });
    
    if (!tournament) {
      // Create new tournament
      const tournamentData = {
        name: 'Sathiyan Sports Tournament 2025',
        sport: 'Table Tennis',
        type: 'Round Robin',
        status: 'ongoing',
        description: 'Annual Sathiyan Sports Table Tennis Championship with A, B, and C leagues',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        registrationFee: 500,
        maxPlayers: 50,
        venue: 'Sathiyan Sports Complex',
        categories: ['A League', 'B League', 'C League'],
        rules: ['Round Robin Format', 'Best of 3 sets', '11 points per set'],
        prizes: ['Trophy for Winners', 'Certificate for All'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('tournaments').insertOne(tournamentData);
      tournament = { _id: result.insertedId, ...tournamentData };
      console.log('✅ Created new tournament:', tournament.name);
    } else {
      console.log('✅ Found existing tournament:', tournament.name);
    }
    
    const tournamentId = tournament._id;
    
    // Clear existing players and matches for fresh start
    await db.collection('players').deleteMany({ tournamentId });
    await db.collection('matches').deleteMany({ tournamentId });
    console.log('🗑️  Cleared existing players and matches');
    
    // Insert all players
    const playersToInsert = TOURNAMENT_DATA.players.map((player, index) => ({
      _id: new ObjectId(),
      tournamentId,
      name: player.name,
      category: player.category,
      phone: player.phone,
      partner: null,
      registrationFee: 500,
      paymentStatus: 'completed',
      registeredAt: new Date(),
      skill: index % 3 === 0 ? 'advanced' : index % 3 === 1 ? 'intermediate' : 'beginner'
    }));
    
    await db.collection('players').insertMany(playersToInsert);
    console.log(`✅ Added ${playersToInsert.length} players`);
    
    // Create player lookup map
    const playerMap: { [key: string]: ObjectId } = {};
    playersToInsert.forEach(player => {
      playerMap[player.name] = player._id;
    });
    
    // Insert A League matches
    const aLeagueMatchesToInsert = TOURNAMENT_DATA.aLeagueMatches.map((match, index) => ({
      _id: new ObjectId(),
      tournamentId,
      round: 'A League Group Stage',
      matchNumber: match.match,
      team1: match.team1,
      team2: match.team2,
      category: 'A League',
      matchCode: `A-${String(match.match).padStart(2, '0')}`,
      status: match.status,
      scheduledTime: new Date(Date.now() + index * 3600000), // 1 hour intervals
      venue: 'Court A',
      score: match.status === 'completed' ? {
        team1Sets: match.winner === match.team1 ? 2 : 0,
        team2Sets: match.winner === match.team2 ? 2 : 0,
        sets: [
          { set: 1, team1Score: match.winner === match.team1 ? 11 : 9, team2Score: match.winner === match.team2 ? 11 : 9 },
          { set: 2, team1Score: match.winner === match.team1 ? 11 : 7, team2Score: match.winner === match.team2 ? 11 : 7 }
        ]
      } : { team1Sets: 0, team2Sets: 0, sets: [] },
      winnerName: match.winner,
      duration: match.status === 'completed' ? Math.floor(Math.random() * 30) + 15 : null // 15-45 minutes
    }));
    
    // Insert C League matches
    const cLeagueMatchesToInsert = TOURNAMENT_DATA.cLeagueMatches.map((match, index) => ({
      _id: new ObjectId(),
      tournamentId,
      round: 'C League Group Stage',
      matchNumber: match.match,
      team1: match.team1,
      team2: match.team2,
      category: 'C League',
      matchCode: `C-${String(match.match).padStart(2, '0')}`,
      status: match.status,
      scheduledTime: new Date(Date.now() + (index + 20) * 3600000), // 1 hour intervals, offset from A League
      venue: 'Court C',
      score: match.status === 'completed' ? {
        team1Sets: match.winner === match.team1 ? 2 : 0,
        team2Sets: match.winner === match.team2 ? 2 : 0,
        sets: [
          { set: 1, team1Score: match.winner === match.team1 ? 11 : 8, team2Score: match.winner === match.team2 ? 11 : 8 },
          { set: 2, team1Score: match.winner === match.team1 ? 11 : 6, team2Score: match.winner === match.team2 ? 11 : 6 }
        ]
      } : { team1Sets: 0, team2Sets: 0, sets: [] },
      winnerName: match.winner,
      duration: match.status === 'completed' ? Math.floor(Math.random() * 30) + 15 : null
    }));
    
    // Insert all matches
    const allMatches = [...aLeagueMatchesToInsert, ...cLeagueMatchesToInsert];
    if (allMatches.length > 0) {
      await db.collection('matches').insertMany(allMatches);
      console.log(`✅ Added ${allMatches.length} matches (${aLeagueMatchesToInsert.length} A League, ${cLeagueMatchesToInsert.length} C League)`);
    }
    
    // Update tournament stats
    await db.collection('tournaments').updateOne(
      { _id: tournamentId },
      { 
        $set: { 
          updatedAt: new Date(),
          status: 'ongoing',
          playersCount: playersToInsert.length,
          matchesCount: allMatches.length
        }
      }
    );
    
    const summary = {
      tournament: tournament.name,
      players: playersToInsert.length,
      matches: allMatches.length,
      aLeagueCompleted: TOURNAMENT_DATA.aLeagueMatches.filter(m => m.status === 'completed').length,
      cLeagueCompleted: TOURNAMENT_DATA.cLeagueMatches.filter(m => m.status === 'completed').length,
      standings: {
        aLeague: calculateStandings('A League', aLeagueMatchesToInsert),
        cLeague: calculateStandings('C League', cLeagueMatchesToInsert)
      }
    };
    
    console.log('🏆 Tournament results populated successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Tournament data populated successfully',
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error populating tournament:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to populate tournament data',
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

function calculateStandings(category: string, matches: any[]) {
  const playerStats: { [key: string]: { wins: number, losses: number } } = {};
  
  matches.filter(m => m.status === 'completed').forEach(match => {
    if (!playerStats[match.team1]) playerStats[match.team1] = { wins: 0, losses: 0 };
    if (!playerStats[match.team2]) playerStats[match.team2] = { wins: 0, losses: 0 };
    
    if (match.winnerName === match.team1) {
      playerStats[match.team1].wins++;
      playerStats[match.team2].losses++;
    } else if (match.winnerName === match.team2) {
      playerStats[match.team2].wins++;
      playerStats[match.team1].losses++;
    }
  });
  
  return Object.entries(playerStats)
    .map(([name, stats]) => ({ name, ...stats, winRate: (stats.wins / (stats.wins + stats.losses)) * 100 }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
    .slice(0, 5); // Top 5 players
}