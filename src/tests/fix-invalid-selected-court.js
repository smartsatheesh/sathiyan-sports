const mongoose = require('mongoose');

async function fixInvalidSelectedCourt() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to fix invalid selectedCourt values');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find users with invalid selectedCourt values
    console.log('\n📋 Checking for invalid selectedCourt values...');
    const usersWithInvalidCourt = await usersCollection.find({
      selectedCourt: { $exists: true, $nin: ["S1", "S2", "S3", null] }
    }).toArray();
    
    console.log(`Found ${usersWithInvalidCourt.length} users with invalid selectedCourt values`);
    
    if (usersWithInvalidCourt.length > 0) {
      console.log('\n👥 Users with invalid selectedCourt:');
      usersWithInvalidCourt.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - selectedCourt: "${user.selectedCourt}" - Sport: ${user.preferredSport}`);
      });
      
      console.log('\n🔧 Fixing invalid selectedCourt values...');
      
      // For users with non-badminton sports, remove selectedCourt
      const nonBadmintonUpdate = await usersCollection.updateMany(
        { 
          selectedCourt: { $exists: true, $nin: ["S1", "S2", "S3", null] },
          preferredSport: { $ne: "Shuttle Badminton" }
        },
        {
          $unset: { selectedCourt: "" }
        }
      );
      
      console.log(`✅ Removed selectedCourt from ${nonBadmintonUpdate.modifiedCount} non-badminton users`);
      
      // For badminton users with invalid court, set to S1 as default
      const badmintonUpdate = await usersCollection.updateMany(
        { 
          selectedCourt: { $exists: true, $nin: ["S1", "S2", "S3", null] },
          preferredSport: "Shuttle Badminton"
        },
        {
          $set: { selectedCourt: "S1" }
        }
      );
      
      console.log(`✅ Set default court S1 for ${badmintonUpdate.modifiedCount} badminton users`);
      
      // Verify the fix
      console.log('\n🔍 Verifying fix...');
      const remainingInvalid = await usersCollection.find({
        selectedCourt: { $exists: true, $nin: ["S1", "S2", "S3", null] }
      }).count();
      
      if (remainingInvalid === 0) {
        console.log('✅ SUCCESS: All invalid selectedCourt values have been fixed');
      } else {
        console.log(`⚠️  WARNING: ${remainingInvalid} users still have invalid selectedCourt values`);
      }
    } else {
      console.log('✅ No users found with invalid selectedCourt values - already clean!');
    }
    
    // Show current distribution
    console.log('\n📊 Current selectedCourt distribution:');
    const distribution = await usersCollection.aggregate([
      {
        $group: {
          _id: "$selectedCourt",
          count: { $sum: 1 },
          sports: { $addToSet: "$preferredSport" }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    distribution.forEach(group => {
      console.log(`  ${group._id || 'null/undefined'}: ${group.count} users (Sports: ${group.sports.join(', ')})`);
    });
    
    console.log('\n🎯 Mark Paid button should now work without validation errors!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixInvalidSelectedCourt();