const mongoose = require('mongoose');

async function setCourtNullForUnpaidUsers() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to set court to null for unpaid users');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check current state by payment status
    console.log('\n📋 Current court distribution by payment status and sport:');
    const distribution = await usersCollection.aggregate([
      {
        $group: {
          _id: {
            paymentStatus: "$paymentStatus",
            sport: "$preferredSport",
            court: "$selectedCourt"
          },
          count: { $sum:1 }
        }
      },
      { $sort: { "_id.paymentStatus": 1, "_id.sport": 1, "_id.court": 1 } }
    ]).toArray();
    
    distribution.forEach(group => {
      console.log(`  ${group._id.paymentStatus} - ${group._id.sport} - Court: ${group._id.court || 'null'} - ${group.count} users`);
    });
    
    // Find unpaid badminton users with court assignments
    console.log('\n🎯 Finding unpaid badminton users with court assignments...');
    const unpaidBadmintonWithCourt = await usersCollection.find({
      preferredSport: "Shuttle Badminton",
      paymentStatus: { $in: ["pending", "registered"] }, // unpaid statuses
      selectedCourt: { $exists: true, $ne: null, $in: ["S1", "S2", "S3"] }
    }).toArray();
    
    console.log(`Found ${unpaidBadmintonWithCourt.length} unpaid badminton users with court assignments`);
    
    if (unpaidBadmintonWithCourt.length > 0) {
      console.log('\n👥 Unpaid badminton users with courts (will be set to null):');
      unpaidBadmintonWithCourt.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - Payment: ${user.paymentStatus} - Court: ${user.selectedCourt}`);
      });
      
      console.log('\n🔧 Setting selectedCourt to null for unpaid badminton users...');
      
      const updateResult = await usersCollection.updateMany(
        { 
          preferredSport: "Shuttle Badminton",
          paymentStatus: { $in: ["pending", "registered"] },
          selectedCourt: { $exists: true, $ne: null }
        },
        {
          $set: { selectedCourt: null }
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} unpaid badminton users - set selectedCourt to null`);
    } else {
      console.log('✅ No unpaid badminton users found with court assignments');
    }
    
    // Show who should still have courts (paid badminton users)
    console.log('\n🏸 Checking paid badminton users (should keep their courts)...');
    const paidBadmintonUsers = await usersCollection.find({
      preferredSport: "Shuttle Badminton",
      paymentStatus: "completed"
    }).toArray();
    
    console.log(`Found ${paidBadmintonUsers.length} paid badminton users`);
    
    if (paidBadmintonUsers.length > 0) {
      console.log('\n💳 Paid badminton users (should have courts):');
      paidBadmintonUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - Payment: ${user.paymentStatus} - Court: ${user.selectedCourt || 'null (needs assignment)'}`);
      });
      
      // Set default court for paid badminton users who don't have one
      const paidWithoutCourt = paidBadmintonUsers.filter(user => !user.selectedCourt || user.selectedCourt === null);
      
      if (paidWithoutCourt.length > 0) {
        console.log(`\n🔧 Setting default court S1 for ${paidWithoutCourt.length} paid badminton users without courts...`);
        
        const paidUpdate = await usersCollection.updateMany(
          {
            preferredSport: "Shuttle Badminton",
            paymentStatus: "completed",
            $or: [
              { selectedCourt: { $exists: false } },
              { selectedCourt: null }
            ]
          },
          {
            $set: { selectedCourt: "S1" }
          }
        );
        
        console.log(`✅ Set default court S1 for ${paidUpdate.modifiedCount} paid badminton users`);
      }
    }
    
    // Final verification
    console.log('\n📊 Final court distribution by payment status and sport:');
    const finalDistribution = await usersCollection.aggregate([
      {
        $group: {
          _id: {
            paymentStatus: "$paymentStatus",
            sport: "$preferredSport",
            court: "$selectedCourt"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.paymentStatus": 1, "_id.sport": 1, "_id.court": 1 } }
    ]).toArray();
    
    finalDistribution.forEach(group => {
      console.log(`  ${group._id.paymentStatus} - ${group._id.sport} - Court: ${group._id.court || 'null'} - ${group.count} users`);
    });
    
    console.log('\n🎯 Expected admin panel display:');
    console.log('  - Unpaid users (all sports): "No Court"');
    console.log('  - Paid badminton users: "S1", "S2", or "S3"');
    console.log('  - Paid non-badminton users: "No Court"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

setCourtNullForUnpaidUsers();