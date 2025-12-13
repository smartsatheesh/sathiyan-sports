const mongoose = require('mongoose');

async function removeAllDueDatesFromUsers() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to remove all due dates');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check for users with nextDueDate field
    console.log('\n📋 Checking for users with nextDueDate...');
    const usersWithDueDates = await usersCollection.find({
      nextDueDate: { $exists: true }
    }).toArray();
    
    console.log(`Found ${usersWithDueDates.length} users with nextDueDate field`);
    
    if (usersWithDueDates.length > 0) {
      console.log('\n👥 Users with due dates:');
      usersWithDueDates.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - Due: ${user.nextDueDate}`);
      });
      
      console.log('\n🧹 Removing nextDueDate field from all users...');
      
      const updateResult = await usersCollection.updateMany(
        {},
        {
          $unset: {
            nextDueDate: ""
          }
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} users - removed nextDueDate field`);
      
      // Verify removal
      console.log('\n🔍 Verifying nextDueDate removal...');
      const remainingDueDates = await usersCollection.find({
        nextDueDate: { $exists: true }
      }).count();
      
      if (remainingDueDates === 0) {
        console.log('✅ SUCCESS: All nextDueDate fields removed from users');
      } else {
        console.log(`⚠️  WARNING: ${remainingDueDates} users still have nextDueDate fields`);
      }
    }
    
    // Also check and clean subscriptions collection
    console.log('\n📋 Checking subscriptions collection...');
    const subscriptionsCollection = db.collection('subscriptions');
    const subscriptionsCount = await subscriptionsCollection.countDocuments();
    
    if (subscriptionsCount > 0) {
      console.log(`Found ${subscriptionsCount} subscription records`);
      
      const subscriptionsWithDates = await subscriptionsCollection.find({
        $or: [
          { nextDueDate: { $exists: true } },
          { startDate: { $exists: true } },
          { endDate: { $exists: true } }
        ]
      }).toArray();
      
      console.log(`${subscriptionsWithDates.length} subscriptions have date fields`);
      
      if (subscriptionsWithDates.length > 0) {
        console.log('\n🧹 Removing date fields from subscriptions...');
        
        const subUpdateResult = await subscriptionsCollection.updateMany(
          {},
          {
            $unset: {
              nextDueDate: "",
              startDate: "",
              endDate: ""
            }
          }
        );
        
        console.log(`✅ Updated ${subUpdateResult.modifiedCount} subscriptions`);
      }
    } else {
      console.log('✅ No subscription records found');
    }
    
    // Final verification
    console.log('\n📊 Final verification - checking sample users:');
    const sampleUsers = await usersCollection.find({}).limit(3).toArray();
    sampleUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || user.email}`);
      console.log(`  Payment Status: ${user.paymentStatus}`);
      console.log(`  NextDueDate exists: ${!!user.nextDueDate}`);
      console.log(`  NextDueDate value: ${user.nextDueDate || 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

removeAllDueDatesFromUsers();