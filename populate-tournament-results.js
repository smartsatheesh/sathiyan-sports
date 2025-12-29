const { MongoClient, ObjectId } = require('mongodb');

// Tournament data based on the images provided
const TOURNAMENT_DATA = {
  // A League Players (from image 1)
  aLeaguePlayers: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
  
  // C League Players (from image 2) 
  cLeaguePlayers: ['C1', 'C2', 'C3', 'C4', 'C5'],
  
  // Additional players from handwritten sheet (image 3)
  additionalPlayers: [
    'Katayee P', 'Mukesh S', 'Srinivashen D', 'Karthi Vel',
    'Balaji Phon', 'Vinod S', 'Sathiyan S', 'Prasad T', 
    'Vineet G', 'Ragava'
  ],
  
  // A League Match Results (from image 1)
  aLeagueMatches: [
    { match: 1, team1: 'A1', team2: 'A2', status: 'done', winner: 'A1', loser: 'A2' },
    { match: 2, team1: 'A1', team2: 'A3', status: 'scheduled', winner: null, loser: null },
    { match: 3, team1: 'A1', team2: 'A4', status: 'scheduled', winner: null, loser: null },
    { match: 4, team1: 'A1', team2: 'A5', status: 'scheduled', winner: null, loser: null },
    { match: 5, team1: 'A1', team2: 'A6', status: 'scheduled', winner: null, loser: null },
    { match: 6, team1: 'A2', team2: 'A3', status: 'scheduled', winner: null, loser: null },
    { match: 7, team1: 'A2', team2: 'A4', status: 'done', winner: 'A2', loser: 'A4' },
    { match: 8, team1: 'A2', team2: 'A5', status: 'scheduled', winner: null, loser: null },
    { match: 9, team1: 'A2', team2: 'A6', status: 'done', winner: 'A6', loser: 'A2' },
    { match: 10, team1: 'A3', team2: 'A4', status: 'scheduled', winner: null, loser: null },
    { match: 11, team1: 'A3', team2: 'A5', status: 'done', winner: 'A3', loser: 'A5' },
    { match: 12, team1: 'A3', team2: 'A6', status: 'done', winner: 'A6', loser: 'A3' },
    { match: 13, team1: 'A4', team2: 'A5', status: 'scheduled', winner: null, loser: null },
    { match: 14, team1: 'A4', team2: 'A6', status: 'done', winner: 'A6', loser: 'A4' },
    { match: 15, team1: 'A5', team2: 'A6', status: 'scheduled', winner: null, loser: null }
  ],
  
  // C League Match Results (from image 2)
  cLeagueMatches: [
    { match: 1, team1: 'C1', team2: 'C2', status: 'done', winner: 'C2', loser: 'C1' },
    { match: 2, team1: 'C1', team2: 'C3', status: 'done', winner: 'C3', loser: 'C1' },
    { match: 3, team1: 'C1', team2: 'C4', status: 'done', winner: 'C4', loser: 'C1' },
    { match: 4, team1: 'C1', team2: 'C5', status: 'done', winner: 'C5', loser: 'C1' },
    { match: 5, team1: 'C2', team2: 'C3', status: 'done', winner: 'C2', loser: 'C3' },
    { match: 6, team1: 'C2', team2: 'C4', status: 'done', winner: 'c2', loser: 'c4' }, // Note: lowercase in image
    { match: 7, team1: 'C2', team2: 'C5', status: 'done', winner: 'c2', loser: 'c5' }, // Note: lowercase in image
    { match: 8, team1: 'C3', team2: 'C4', status: 'scheduled', winner: null, loser: null },
    { match: 9, team1: 'C3', team2: 'C5', status: 'done', winner: 'C5', loser: 'C3' },
    { match: 10, team1: 'C4', team2: 'C5', status: 'done', winner: 'C4', loser: 'C5' }
  ]
};

async function populateTournamentResults() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🎯 Connected to MongoDB');
    
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
    
    // Create all players
    const allPlayers = [
      ...TOURNAMENT_DATA.aLeaguePlayers.map(name => ({ name, category: 'A League' })),
      ...TOURNAMENT_DATA.cLeaguePlayers.map(name => ({ name, category: 'C League' })),
      ...TOURNAMENT_DATA.additionalPlayers.map(name => ({ name, category: 'B League' })),
      // Add more B League players to reach 34 total
      ...Array.from({ length: 15 }, (_, i) => ({ name: `B${i + 1}`, category: 'B League' }))
    ];
    
    const playersToInsert = allPlayers.map((player, index) => ({
      _id: new ObjectId(),
      tournamentId,
      name: player.name,
      category: player.category,
      phone: `+919${String(1000000000 + index).slice(1)}`, // Generate phone numbers
      partner: null,
      registrationFee: 500,
      paymentStatus: 'completed',
      registeredAt: new Date(),
      skill: index % 3 === 0 ? 'advanced' : index % 3 === 1 ? 'intermediate' : 'beginner'
    }));
    
    await db.collection('players').insertMany(playersToInsert);
    console.log(`✅ Added ${playersToInsert.length} players`);
    
    // Create player lookup map
    const playerMap = {};
    playersToInsert.forEach(player => {
      playerMap[player.name] = player._id;
    });
    
    // Create A League matches
    const aLeagueMatchesToInsert = TOURNAMENT_DATA.aLeagueMatches.map((match, index) => ({
      _id: new ObjectId(),
      tournamentId,
      round: 'A League Group Stage',
      matchNumber: match.match,
      team1: match.team1,
      team2: match.team2,
      category: 'A League',
      matchCode: `A-${String(match.match).padStart(2, '0')}`,
      status: match.status === 'done' ? 'completed' : 'scheduled',
      scheduledTime: new Date(Date.now() + index * 3600000), // 1 hour intervals
      venue: 'Court A',
      score: match.status === 'done' ? {
        team1Sets: match.winner === match.team1 ? 2 : 0,
        team2Sets: match.winner === match.team2 ? 2 : 0,
        sets: [
          { set: 1, team1Score: match.winner === match.team1 ? 11 : 9, team2Score: match.winner === match.team2 ? 11 : 9 },
          { set: 2, team1Score: match.winner === match.team1 ? 11 : 7, team2Score: match.winner === match.team2 ? 11 : 7 }
        ]
      } : { team1Sets: 0, team2Sets: 0, sets: [] },
      winner: match.winner ? playerMap[match.winner] : null,
      winnerName: match.winner || null,
      duration: match.status === 'done' ? Math.floor(Math.random() * 30) + 15 : null // 15-45 minutes
    }));
    
    // Create C League matches
    const cLeagueMatchesToInsert = TOURNAMENT_DATA.cLeagueMatches.map((match, index) => ({
      _id: new ObjectId(),
      tournamentId,
      round: 'C League Group Stage',
      matchNumber: match.match,
      team1: match.team1,
      team2: match.team2,
      category: 'C League',
      matchCode: `C-${String(match.match).padStart(2, '0')}`,
      status: match.status === 'done' ? 'completed' : 'scheduled',
      scheduledTime: new Date(Date.now() + (index + 20) * 3600000), // 1 hour intervals, offset from A League
      venue: 'Court C',
      score: match.status === 'done' ? {
        team1Sets: match.winner?.toLowerCase() === match.team1.toLowerCase() ? 2 : 0,
        team2Sets: match.winner?.toLowerCase() === match.team2.toLowerCase() ? 2 : 0,
        sets: [
          { set: 1, team1Score: match.winner?.toLowerCase() === match.team1.toLowerCase() ? 11 : 8, team2Score: match.winner?.toLowerCase() === match.team2.toLowerCase() ? 11 : 8 },
          { set: 2, team1Score: match.winner?.toLowerCase() === match.team1.toLowerCase() ? 11 : 6, team2Score: match.winner?.toLowerCase() === match.team2.toLowerCase() ? 11 : 6 }
        ]
      } : { team1Sets: 0, team2Sets: 0, sets: [] },
      winner: match.winner ? playerMap[match.winner.toUpperCase()] : null,
      winnerName: match.winner?.toUpperCase() || null,
      duration: match.status === 'done' ? Math.floor(Math.random() * 30) + 15 : null
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
    
    console.log('🏆 Tournament results populated successfully!');
    console.log(`📊 Summary:
    - Tournament: ${tournament.name}
    - Players: ${playersToInsert.length}
    - Matches: ${allMatches.length}
    - A League Completed: ${TOURNAMENT_DATA.aLeagueMatches.filter(m => m.status === 'done').length}
    - C League Completed: ${TOURNAMENT_DATA.cLeagueMatches.filter(m => m.status === 'done').length}`);
    
  } catch (error) {
    console.error('❌ Error populating tournament:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  populateTournamentResults().then(() => {
    console.log('✨ Script completed!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { populateTournamentResults, TOURNAMENT_DATA };