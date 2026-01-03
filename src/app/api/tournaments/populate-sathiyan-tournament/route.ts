import { NextResponse } from 'next/server';
import { connectToMongoose } from '../../../server/mongodb';
import Tournament from '../../../models/Tournament';
import Player from '../../../models/Player';
import Match from '../../../models/Match';

export async function POST() {
  try {
    console.log('🎾 Starting Sathiyan Tournament Data Import...');
    
    // Connect to database
    await connectToMongoose();
    console.log('✅ Database connected');

    // Check if tournament already exists
    const existingTournament = await (Tournament.findOne as any)({ 
      name: "Sathiyan Multi Sport Club - In House Tournament" 
    }).lean();
    
    if (existingTournament) {
      return NextResponse.json({
        success: true,
        message: 'Tournament already exists',
        tournament: existingTournament
      });
    }

    // Create the tournament
    const tournament = new Tournament({
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
      }
    });

    const savedTournament = await tournament.save();
    console.log('✅ Tournament created:', savedTournament._id);

    // Players data from the images with categories and mobile numbers
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

    console.log('🏃‍♂️ Creating players...');
    const createdPlayers = [];
    
    for (const playerData of playersData) {
      const player = new Player({
        name: playerData.name,
        phone: playerData.phone,
        tournamentId: savedTournament._id,
        category: playerData.category,
        partner: playerData.partner,
        registrationFee: 100,
        paymentStatus: 'completed',
        registeredAt: new Date(),
        userId: null // No user association for imported data
      });
      
      const savedPlayer = await player.save();
      createdPlayers.push(savedPlayer);
    }

    console.log(`✅ Created ${createdPlayers.length} players`);

    // Create matches based on the tournament structure from images
    console.log('🏸 Creating matches...');
    const matches = [];

    // Category A matches (A1 vs A2, etc.)
    const categoryAMatches = [
      { team1: "Kalaivani & Gokul", team2: "Praveen & Muthukumaran", matchCode: "A1" },
      { team1: "Keerthana & Dhanan", team2: "Maheesh Kanna & Sabareesh", matchCode: "A2" },
      { team1: "Shyam & Siva", team2: "Ramji & SM Moorthy", matchCode: "A3" }
    ];

    // Category B matches
    const categoryBMatches = [
      { team1: "Jeyathi Anand & Pradeep", team2: "Prem & Rita", matchCode: "B1" },
      { team1: "Karthikeyan & Radha", team2: "Matheswaran & Loganayaki", matchCode: "B2" },
      { team1: "Mareeswaran & Chechkiran", team2: "TBD", matchCode: "B3" }
    ];

    // Category C matches  
    const categoryCMatches = [
      { team1: "Siva & Rita Monique", team2: "Sreevarsha & Dr Santhil", matchCode: "C1" },
      { team1: "Workman & Yazhini", team2: "TBD", matchCode: "C2" }
    ];

    const allMatches = [
      ...categoryAMatches.map(m => ({ ...m, category: "A" })),
      ...categoryBMatches.map(m => ({ ...m, category: "B" })),
      ...categoryCMatches.map(m => ({ ...m, category: "C" }))
    ];

    for (const matchData of allMatches) {
      const match = new Match({
        tournamentId: savedTournament._id,
        team1: matchData.team1,
        team2: matchData.team2,
        category: matchData.category,
        matchCode: matchData.matchCode,
        status: "scheduled",
        scheduledTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in next week
        venue: "S" + Math.ceil(Math.random() * 3),
        round: "Group Stage"
      });
      
      const savedMatch = await match.save();
      matches.push(savedMatch);
    }

    console.log(`✅ Created ${matches.length} matches`);

    return NextResponse.json({
      success: true,
      message: 'Sathiyan Tournament data imported successfully!',
      data: {
        tournament: savedTournament,
        playersCount: createdPlayers.length,
        matchesCount: matches.length,
        categories: ["A", "B", "C"]
      }
    });

  } catch (error) {
    console.error('❌ Tournament import error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to import tournament data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
