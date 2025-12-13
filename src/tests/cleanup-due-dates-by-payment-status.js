const mongoose = require('mongoose');

async function cleanupDueDatesBasedOnPaymentStatus() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to cleanup due dates based on payment status');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // First, let's see the current state
    console.log('\n📋 Current state analysis:');
    const totalUsers = await usersCollection.countDocuments();
    console.log(`Total users: ${totalUsers}`);
    
    const usersByPaymentStatus = await usersCollection.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          withDueDate: { $sum: { $cond: [{ $ne: ["$nextDueDate", null] }, 1, 0] } }
        }
      }
    ]).toArray();
    
    console.log('\nUsers by payment status:');
    usersByPaymentStatus.forEach(group => {
      console.log(`  ${group._id}: ${group.count} users (${group.withDueDate} have due dates)`);
    });
    
    // Find users with pending payment status who have due dates
    console.log('\n🎯 Finding users with pending status who have due dates...');
    const pendingUsersWithDueDates = await usersCollection.find({
      paymentStatus: "pending",
      nextDueDate: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`Found ${pendingUsersWithDueDates.length} pending users with due dates`);
    
    if (pendingUsersWithDueDates.length > 0) {
      console.log('\n👥 Pending users with due dates (will be cleared):');
      pendingUsersWithDueDates.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - Due: ${user.nextDueDate}`);
      });
      
      console.log('\n🧹 Removing due dates from pending users...');
      
      const updateResult = await usersCollection.updateMany(
        { 
          paymentStatus: "pending",
          nextDueDate: { $exists: true, $ne: null }
        },
        {
          $unset: {
            nextDueDate: ""
          }
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} pending users - removed nextDueDate`);
    }
    
    // Check completed users - they should keep their due dates
    console.log('\n✅ Checking completed users (should keep due dates):');
    const completedUsersWithDueDates = await usersCollection.find({
      paymentStatus: "completed",
      nextDueDate: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`Found ${completedUsersWithDueDates.length} completed users with due dates (these will be kept)`);
    
    if (completedUsersWithDueDates.length > 0) {
      console.log('\n👥 Completed users with due dates (keeping these):');
      completedUsersWithDueDates.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - Due: ${user.nextDueDate}`);
      });
    }
    
    // Also clean up subscription collection for pending entries
    console.log('\n📋 Cleaning up subscriptions collection...');
    const subscriptionsCollection = db.collection('subscriptions');
    const subscriptionsCount = await subscriptionsCollection.countDocuments();
    
    if (subscriptionsCount > 0) {
      console.log(`Found ${subscriptionsCount} subscription records`);
      
      // Remove dates from pending subscriptions only
      const pendingSubsUpdate = await subscriptionsCollection.updateMany(
        { paymentStatus: { $in: ["pending", "Pending"] } },
        {
          $unset: {
            nextDueDate: "",
            startDate: "",
            endDate: ""
          }
        }
      );
      
      console.log(`✅ Updated ${pendingSubsUpdate.modifiedCount} pending subscriptions`);
    }
    
    // Final verification
    console.log('\n📊 Final verification:');
    const finalStats = await usersCollection.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          withDueDate: { $sum: { $cond: [{ $ne: ["$nextDueDate", null] }, 1, 0] } }
        }
      }
    ]).toArray();
    
    console.log('\nFinal state:');
    finalStats.forEach(group => {
      console.log(`  ${group._id}: ${group.count} users (${group.withDueDate} have due dates)`);
    });
    
    // Show sample from each status
    console.log('\n📄 Sample verification:');
    const pendingSample = await usersCollection.findOne({ paymentStatus: "pending" });
    const completedSample = await usersCollection.findOne({ paymentStatus: "completed" });
    
    if (pendingSample) {
      console.log(`\nPending user sample: ${pendingSample.name}`);
      console.log(`  NextDueDate: ${pendingSample.nextDueDate || 'NULL (should show "Not Set")'}`);
    }
    
    if (completedSample) {
      console.log(`\nCompleted user sample: ${completedSample.name}`);
      console.log(`  NextDueDate: ${completedSample.nextDueDate || 'NULL'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

cleanupDueDatesBasedOnPaymentStatus();