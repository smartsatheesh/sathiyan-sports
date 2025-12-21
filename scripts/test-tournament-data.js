#!/usr/bin/env node

// Test tournament data script
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'SathiyanSports';

async function testTournamentData() {
  console.log('🔍 Testing Tournament Data Access...');
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  let client;
  
  try {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    
    await client.connect();
    const db = client.db(DATABASE_NAME);
    console.log('✅ Connected to database');

    // Check tournaments
    const tournaments = await db.collection('tournaments').find({}).toArray();
    console.log(`📊 Found ${tournaments.length} tournaments`);
    
    if (tournaments.length > 0) {
      const tournament = tournaments[0];
      console.log(`🏆 Tournament: ${tournament.name}`);
      console.log(`📍 Status: ${tournament.status}`);
      console.log(`🎯 Sport: ${tournament.sport} (${tournament.type})`);
      
      // Check players for this tournament
      const players = await db.collection('players').find({ 
        tournamentId: tournament._id 
      }).toArray();
      console.log(`👥 Players: ${players.length}`);
      
      // Group by category
      const categories = {};
      players.forEach(player => {
        const cat = player.category || 'General';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      
      console.log('📋 Category breakdown:');
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`   Category ${cat}: ${count} players`);
      });
      
      // Check matches
      const matches = await db.collection('matches').find({ 
        tournamentId: tournament._id 
      }).toArray();
      console.log(`🏸 Matches: ${matches.length}`);
      
      return {
        success: true,
        tournament: {
          id: tournament._id,
          name: tournament.name,
          playersCount: players.length,
          matchesCount: matches.length,
          categories: Object.keys(categories)
        }
      };
    }

    return { success: false, message: 'No tournaments found' };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (client) {
      await client.close();
      console.log('🔐 Connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testTournamentData()
    .then((result) => {
      if (result.success) {
        console.log('✅ Tournament data is accessible!');
        console.log('🎯 You can now view it at: http://localhost:3000/tournaments');
      } else {
        console.log('❌ Tournament data not accessible:', result.message || result.error);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = testTournamentData;