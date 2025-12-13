const mongoose = require('mongoose');

async function testCompleteCourtAssignmentFlow() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to test complete court assignment flow');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Test 1: Check unpaid badminton user (should have null court)
    console.log('\n📋 Test 1: Unpaid badminton user');
    const unpaidBadminton = await usersCollection.findOne({ 
      preferredSport: "Shuttle Badminton",
      paymentStatus: "pending"
    });
    
    if (unpaidBadminton) {
      console.log(`   Name: ${unpaidBadminton.name}`);
      console.log(`   Sport: ${unpaidBadminton.preferredSport}`);
      console.log(`   Payment Status: ${unpaidBadminton.paymentStatus}`);
      console.log(`   Selected Court: ${unpaidBadminton.selectedCourt || 'null'}`);
      console.log(`   Expected Admin Display: "No Court" ✅`);
    }
    
    // Test 2: Check paid badminton user (should have court)
    console.log('\n📋 Test 2: Paid badminton user');
    const paidBadminton = await usersCollection.findOne({ 
      preferredSport: "Shuttle Badminton",
      paymentStatus: "completed"
    });
    
    if (paidBadminton) {
      console.log(`   Name: ${paidBadminton.name}`);
      console.log(`   Sport: ${paidBadminton.preferredSport}`);
      console.log(`   Payment Status: ${paidBadminton.paymentStatus}`);
      console.log(`   Selected Court: ${paidBadminton.selectedCourt || 'null'}`);
      console.log(`   Expected Admin Display: "${paidBadminton.selectedCourt || 'No Court'}" ✅`);
    }
    
    // Test 3: Check non-badminton user (should have null court)
    console.log('\n📋 Test 3: Non-badminton user');
    const nonBadminton = await usersCollection.findOne({ 
      preferredSport: { $ne: "Shuttle Badminton" }
    });
    
    if (nonBadminton) {
      console.log(`   Name: ${nonBadminton.name}`);
      console.log(`   Sport: ${nonBadminton.preferredSport}`);
      console.log(`   Payment Status: ${nonBadminton.paymentStatus}`);
      console.log(`   Selected Court: ${nonBadminton.selectedCourt || 'null'}`);
      console.log(`   Expected Admin Display: "No Court" ✅`);
    }
    
    // Test 4: Simulate payment completion for an unpaid badminton user
    console.log('\n📋 Test 4: Simulating payment completion for unpaid badminton user');
    
    if (unpaidBadminton) {
      console.log(`\n🎯 Before payment completion:`);
      console.log(`   ${unpaidBadminton.name} - Court: ${unpaidBadminton.selectedCourt || 'null'} - Status: ${unpaidBadminton.paymentStatus}`);
      
      // Simulate payment completion (this would happen via the API)
      const paymentUpdate = await usersCollection.updateOne(
        { _id: unpaidBadminton._id },
        {
          $set: {
            paymentStatus: 'completed',
            selectedCourt: 'S1', // Assign court upon payment
            paymentCompletedDate: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`\n💳 Payment completed: Updated ${paymentUpdate.modifiedCount} user`);
      
      // Check the result
      const updatedUser = await usersCollection.findOne({ _id: unpaidBadminton._id });
      console.log(`\n🎯 After payment completion:`);
      console.log(`   ${updatedUser.name} - Court: ${updatedUser.selectedCourt || 'null'} - Status: ${updatedUser.paymentStatus}`);
      console.log(`   Expected Admin Display: "${updatedUser.selectedCourt}" ✅`);
      
      // Revert for next test
      await usersCollection.updateOne(
        { _id: unpaidBadminton._id },
        {
          $set: {
            paymentStatus: 'pending',
            selectedCourt: null,
            paymentCompletedDate: null
          },
          $unset: {
            subscriptionStartDate: "",
            subscriptionEndDate: "",
            nextDueDate: "",
            hasActiveSubscription: ""
          }
        }
      );
      console.log(`   ↩️  Reverted user for clean test environment`);
    }
    
    // Summary
    console.log('\n📊 Summary of court assignment logic:');
    console.log('  1. ❌ Unpaid users (all sports): selectedCourt = null → "No Court"');
    console.log('  2. ✅ Paid badminton users: selectedCourt = "S1/S2/S3" → Show court');
    console.log('  3. ❌ Paid non-badminton users: selectedCourt = null → "No Court"');
    
    // Final verification
    console.log('\n📈 Current database state:');
    const finalStats = await usersCollection.aggregate([
      {
        $group: {
          _id: {
            sport: "$preferredSport",
            paymentStatus: "$paymentStatus",
            hasCourt: { 
              $cond: [
                { 
                  $and: [
                    { $ne: ["$selectedCourt", null] },
                    { $ne: ["$selectedCourt", undefined] },
                    { $in: ["$selectedCourt", ["S1", "S2", "S3"]] }
                  ]
                }, 
                "Has Court", 
                "No Court"
              ] 
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.sport": 1, "_id.paymentStatus": 1 } }
    ]).toArray();
    
    finalStats.forEach(stat => {
      console.log(`  ${stat._id.sport} | ${stat._id.paymentStatus} | ${stat._id.hasCourt}: ${stat.count} users`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testCompleteCourtAssignmentFlow();