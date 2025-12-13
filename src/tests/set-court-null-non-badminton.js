const mongoose = require('mongoose');

async function setCourtToNullForNonBadminton() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to set court to null for non-badminton users');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check current state
    console.log('\n📋 Current court distribution by sport:');
    const distribution = await usersCollection.aggregate([
      {
        $group: {
          _id: {
            sport: "$preferredSport",
            court: "$selectedCourt"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.sport": 1, "_id.court": 1 } }
    ]).toArray();
    
    distribution.forEach(group => {
      console.log(`  ${group._id.sport} - Court: ${group._id.court || 'null'} - ${group.count} users`);
    });
    
    // Find non-badminton users with court values
    console.log('\n🎯 Finding non-badminton users with court values...');
    const nonBadmintonWithCourt = await usersCollection.find({
      preferredSport: { $ne: "Shuttle Badminton" },
      selectedCourt: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`Found ${nonBadmintonWithCourt.length} non-badminton users with court values`);
    
    if (nonBadmintonWithCourt.length > 0) {
      console.log('\n👥 Non-badminton users with courts (will be set to null):');
      nonBadmintonWithCourt.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - Sport: ${user.preferredSport} - Court: ${user.selectedCourt}`);
      });
      
      console.log('\n🔧 Setting selectedCourt to null for non-badminton users...');
      
      const updateResult = await usersCollection.updateMany(
        { 
          preferredSport: { $ne: "Shuttle Badminton" },
          selectedCourt: { $exists: true, $ne: null }
        },
        {
          $set: { selectedCourt: null }
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} users - set selectedCourt to null`);
    } else {
      console.log('✅ All non-badminton users already have null courts');
    }
    
    // Also ensure badminton users without courts get default S1
    console.log('\n🏸 Checking badminton users without courts...');
    const badmintonWithoutCourt = await usersCollection.find({
      preferredSport: "Shuttle Badminton",
      $or: [
        { selectedCourt: { $exists: false } },
        { selectedCourt: null },
        { selectedCourt: "" }
      ]
    }).toArray();
    
    console.log(`Found ${badmintonWithoutCourt.length} badminton users without courts`);
    
    if (badmintonWithoutCourt.length > 0) {
      console.log('\n🏸 Badminton users without courts (will be set to S1):');
      badmintonWithoutCourt.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - Court: ${user.selectedCourt || 'null'}`);
      });
      
      const badmintonUpdate = await usersCollection.updateMany(
        {
          preferredSport: "Shuttle Badminton",
          $or: [
            { selectedCourt: { $exists: false } },
            { selectedCourt: null },
            { selectedCourt: "" }
          ]
        },
        {
          $set: { selectedCourt: "S1" }
        }
      );
      
      console.log(`✅ Set default court S1 for ${badmintonUpdate.modifiedCount} badminton users`);
    }
    
    // Final verification
    console.log('\n📊 Final court distribution by sport:');
    const finalDistribution = await usersCollection.aggregate([
      {
        $group: {
          _id: {
            sport: "$preferredSport",
            court: "$selectedCourt"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.sport": 1, "_id.court": 1 } }
    ]).toArray();
    
    finalDistribution.forEach(group => {
      console.log(`  ${group._id.sport} - Court: ${group._id.court || 'null'} - ${group.count} users`);
    });
    
    console.log('\n🎯 Expected admin panel display:');
    console.log('  - Cricket/Football users: "No Court"');
    console.log('  - Badminton users: "S1", "S2", or "S3"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

setCourtToNullForNonBadminton();