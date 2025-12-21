#!/usr/bin/env node

// Import tournament data script
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'SathiyanSports';

async function importTournamentData() {
  console.log('🎾 Starting Sathiyan Tournament Data Import...');
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    
    await client.connect();
    const db = client.db(DATABASE_NAME);
    console.log('✅ Connected to database:', DATABASE_NAME);

    // Check if tournament already exists
    const tournamentsCollection = db.collection('tournaments');
    const existingTournament = await tournamentsCollection.findOne({ 
      name: "Sathiyan Multi Sport Club - In House Tournament" 
    });
    
    if (existingTournament) {
      console.log('✅ Tournament already exists:', existingTournament._id);
      return existingTournament;
    }

    // Create tournament
    const tournamentData = {
      name: "Sathiyan Multi Sport Club - In House Tournament",
      sport: "Badminton",
      type: "doubles",
      status: "live", 
      description: "In-house badminton doubles tournament with categories A, B, and C",
      startDate: new Date("2024-12-20"),
      endDate: new Date("2024-12-30"),
      registrationFee: 100,
      maxPlayers: 40,
      venue: "Sathiyan Multi Sport Club",
      categories: ["A", "B", "C"],
      rules: [
        "Best of 3 sets format",
        "21 points per set", 
        "Deuce at 20-20",
        "Players must arrive 15 minutes before match time",
        "Proper badminton attire required"
      ],
      prizes: {
        first: "Trophy + ₹5000",
        second: "Trophy + ₹3000",
        third: "Trophy + ₹2000"
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const tournamentResult = await tournamentsCollection.insertOne(tournamentData);
    console.log('✅ Tournament created:', tournamentResult.insertedId);

    // Create players
    const playersData = [
      // Category A
      { name: "Kalaivani", phone: "7373052391", category: "A", partner: "Gokul" },
      { name: "Gokul", phone: "8745497150", category: "A", partner: "Kalaivani" },
      { name: "Praveen", phone: "6381396748", category: "A", partner: "Muthukumaran" },
      { name: "Muthukumaran", phone: "9865370435", category: "A", partner: "Praveen" },
      { name: "Keerthana", phone: "9597248086", category: "A", partner: "Dhanan" },
      { name: "Dhanan", phone: "8128364340", category: "A", partner: "Keerthana" },
      { name: "Maheesh Kanna", phone: "9176718730", category: "A", partner: "Sabareesh" },
      { name: "Sabareesh", phone: "7304403201", category: "A", partner: "Maheesh Kanna" },
      { name: "Shyam", phone: "9789834269", category: "A", partner: "Siva" },
      { name: "Siva", phone: "7339033459", category: "A", partner: "Shyam" },
      { name: "Ramji", phone: "9952732739", category: "A", partner: "SM Moorthy" },
      { name: "SM Moorthy", phone: "9894316317", category: "A", partner: "Ramji" },
      
      // Category B
      { name: "Jeyathi Anand", phone: "9452004539", category: "B", partner: "Pradeep" },
      { name: "Pradeep", phone: "8111784859", category: "B", partner: "Jeyathi Anand" },
      { name: "Prem", phone: "6382417784", category: "B", partner: "Rita" },
      { name: "Rita", phone: "9524043574", category: "B", partner: "Prem" },
      { name: "Karthikeyan", phone: "9791907744", category: "B", partner: "Radha" },
      { name: "Radha", phone: "8098100754", category: "B", partner: "Karthikeyan" },
      { name: "Matheswaran", phone: "9486704340", category: "B", partner: "Loganayaki" },
      { name: "Loganayaki", phone: "8056996975", category: "B", partner: "Matheswaran" },
      { name: "Mareeswaran", phone: "9944819765", category: "B", partner: "Chechkiran" },
      { name: "Chechkiran", phone: "7667784917", category: "B", partner: "Mareeswaran" },
      
      // Category C  
      { name: "Siva", phone: "8072568956", category: "C", partner: "Rita Monique" },
      { name: "Rita Monique", phone: "9043435483", category: "C", partner: "Siva" },
      { name: "Sreevarsha", phone: "9751313429", category: "C", partner: "Dr Santhil" },
      { name: "Dr Santhil", phone: "9003619533", category: "C", partner: "Sreevarsha" },
      { name: "Workman", phone: "6379286026", category: "C", partner: "Yazhini" },
      { name: "Yazhini", phone: "7502092396", category: "C", partner: "Workman" }
    ];

    const playersCollection = db.collection('players');
    const playersToInsert = playersData.map(player => ({
      ...player,
      tournamentId: tournamentResult.insertedId,
      registrationFee: 100,
      paymentStatus: 'completed',
      registeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const playersResult = await playersCollection.insertMany(playersToInsert);
    console.log(`✅ Created ${playersResult.insertedCount} players`);

    // Create matches
    const matchesData = [
      // Category A matches
      { team1: "Kalaivani & Gokul", team2: "Praveen & Muthukumaran", matchCode: "A1", category: "A" },
      { team1: "Keerthana & Dhanan", team2: "Maheesh Kanna & Sabareesh", matchCode: "A2", category: "A" },
      { team1: "Shyam & Siva", team2: "Ramji & SM Moorthy", matchCode: "A3", category: "A" },
      
      // Category B matches
      { team1: "Jeyathi Anand & Pradeep", team2: "Prem & Rita", matchCode: "B1", category: "B" },
      { team1: "Karthikeyan & Radha", team2: "Matheswaran & Loganayaki", matchCode: "B2", category: "B" },
      { team1: "Mareeswaran & Chechkiran", team2: "TBD", matchCode: "B3", category: "B" },
      
      // Category C matches
      { team1: "Siva & Rita Monique", team2: "Sreevarsha & Dr Santhil", matchCode: "C1", category: "C" },
      { team1: "Workman & Yazhini", team2: "TBD", matchCode: "C2", category: "C" }
    ];

    const matchesCollection = db.collection('matches');
    const matchesToInsert = matchesData.map((match, index) => ({
      ...match,
      tournamentId: tournamentResult.insertedId,
      status: "scheduled",
      scheduledTime: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000), // Spread over days
      venue: `Court ${Math.ceil((index + 1) / 2)}`,
      round: "Group Stage",
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const matchesResult = await matchesCollection.insertMany(matchesToInsert);
    console.log(`✅ Created ${matchesResult.insertedCount} matches`);

    console.log('\n🎉 Tournament import completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   Tournament ID: ${tournamentResult.insertedId}`);
    console.log(`   Players: ${playersResult.insertedCount}`);
    console.log(`   Matches: ${matchesResult.insertedCount}`);
    console.log(`   Categories: A, B, C`);

    return {
      tournament: tournamentResult.insertedId,
      playersCount: playersResult.insertedCount,
      matchesCount: matchesResult.insertedCount
    };

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run the import
if (require.main === module) {
  importTournamentData()
    .then(() => {
      console.log('✅ Import script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import script failed:', error);
      process.exit(1);
    });
}

module.exports = importTournamentData;