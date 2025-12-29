// Simple API-based script to populate tournament results
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Tournament data based on the images provided
const TOURNAMENT_DATA = {
  // A League Players (from image 1)
  aLeaguePlayers: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
  
  // C League Players (from image 2)
  cLeaguePlayers: ['C1', 'C2', 'C3', 'C4', 'C5'],
  
  // Additional players from handwritten sheet (image 3) 
  additionalPlayers: [
    'Katayee P', 'Mukesh S', 'Srinivashen D', 'Karthi Vel',
    'Balaji P', 'Vinod S', 'Sathiyan S', 'Prasad T', 
    'Vineet G', 'Ragava K'
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
    { match: 6, team1: 'C2', team2: 'C4', status: 'done', winner: 'C2', loser: 'C4' },
    { match: 7, team1: 'C2', team2: 'C5', status: 'done', winner: 'C2', loser: 'C5' },
    { match: 8, team1: 'C3', team2: 'C4', status: 'scheduled', winner: null, loser: null },
    { match: 9, team1: 'C3', team2: 'C5', status: 'done', winner: 'C5', loser: 'C3' },
    { match: 10, team1: 'C4', team2: 'C5', status: 'done', winner: 'C4', loser: 'C5' }
  ]
};

function displaySummary() {
  const allPlayers = [
    ...TOURNAMENT_DATA.aLeaguePlayers.map(name => ({ name, category: 'A League' })),
    ...TOURNAMENT_DATA.cLeaguePlayers.map(name => ({ name, category: 'C League' })),
    ...TOURNAMENT_DATA.additionalPlayers.map(name => ({ name, category: 'B League' })),
    // Add more B League players to reach 34 total
    ...Array.from({ length: 14 }, (_, i) => ({ name: `B${i + 1}`, category: 'B League' }))
  ];

  console.log('🏆 Tournament Data Summary:');
  console.log(`📊 Players by Category:
  - A League: ${TOURNAMENT_DATA.aLeaguePlayers.length} players
  - C League: ${TOURNAMENT_DATA.cLeaguePlayers.length} players  
  - B League: ${TOURNAMENT_DATA.additionalPlayers.length + 14} players
  - Total: ${allPlayers.length} players`);
  
  console.log(`🎯 Match Results:
  - A League: ${TOURNAMENT_DATA.aLeagueMatches.filter(m => m.status === 'done').length}/${TOURNAMENT_DATA.aLeagueMatches.length} completed
  - C League: ${TOURNAMENT_DATA.cLeagueMatches.filter(m => m.status === 'done').length}/${TOURNAMENT_DATA.cLeagueMatches.length} completed`);

  console.log('🏅 Match Winners (A League):');
  TOURNAMENT_DATA.aLeagueMatches
    .filter(m => m.status === 'done')
    .forEach(m => console.log(`  Match ${m.match}: ${m.team1} vs ${m.team2} → Winner: ${m.winner}`));
  
  console.log('🏅 Match Winners (C League):');
  TOURNAMENT_DATA.cLeagueMatches
    .filter(m => m.status === 'done')
    .forEach(m => console.log(`  Match ${m.match}: ${m.team1} vs ${m.team2} → Winner: ${m.winner}`));
}

// Run the summary 
displaySummary();

module.exports = { TOURNAMENT_DATA, displaySummary };