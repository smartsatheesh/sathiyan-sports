// Check and reset all possible data sources for subscription information
const mongoose = require('mongoose');

async function findAndResetAllSubscriptionData() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to find all subscription data sources');
    
    // Check all collections that might contain subscription data
    const collectionsToCheck = [
      'subscriptions', 
      'billing_cycles', 
      'billing_reminders', 
      'bookings',
      'users'
    ];
    
    for (const collectionName of collectionsToCheck) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          console.log(`\n📊 ${collectionName} collection has ${count} documents`);
          
          const sample = await collection.findOne({});
          console.log(`📋 Sample ${collectionName} document fields:`);
          console.log(Object.keys(sample));
          
          // If this collection has payment/subscription data, show some details
          if (sample.amount || sample.dueDate || sample.paymentDate || sample.nextDueDate) {
            console.log(`💰 Found financial data in ${collectionName}:`);
            console.log(`  - Amount: ${sample.amount || 'N/A'}`);
            console.log(`  - Due Date: ${sample.dueDate || sample.nextDueDate || 'N/A'}`);
            console.log(`  - Payment Date: ${sample.paymentDate || sample.lastPaymentDate || 'N/A'}`);
          }
        } else {
          console.log(`\n📊 ${collectionName} collection is empty`);
        }
      } catch (e) {
        console.log(`\n📊 ${collectionName} collection doesn't exist`);
      }
    }
    
    // Now reset ALL possible sources
    console.log('\n🔧 Resetting all subscription data sources...');
    
    // Reset users collection (just the basic fields)
    const userResetResult = await mongoose.connection.db.collection('users').updateMany(
      {},
      {
        $unset: {
          hasActiveSubscription: "",
          subscriptionAmount: "",
          subscriptionStartDate: "",
          subscriptionEndDate: "",
          lastPaymentDate: "",
          nextDueDate: "",
          lastPaymentAmount: ""
        },
        $set: {
          paymentStatus: "pending",
          updatedAt: new Date()
        }
      }
    );
    console.log(`✅ Reset ${userResetResult.modifiedCount} user records`);
    
    // Reset/delete billing_cycles
    try {
      const billingResetResult = await mongoose.connection.db.collection('billing_cycles').deleteMany({});
      console.log(`✅ Deleted ${billingResetResult.deletedCount} billing cycle records`);
    } catch (e) {
      console.log(`📝 No billing_cycles to reset`);
    }
    
    // Reset/delete billing_reminders
    try {
      const reminderResetResult = await mongoose.connection.db.collection('billing_reminders').deleteMany({});
      console.log(`✅ Deleted ${reminderResetResult.deletedCount} billing reminder records`);
    } catch (e) {
      console.log(`📝 No billing_reminders to reset`);
    }
    
    // Reset/delete subscriptions (if any)
    try {
      const subscriptionResetResult = await mongoose.connection.db.collection('subscriptions').deleteMany({});
      console.log(`✅ Deleted ${subscriptionResetResult.deletedCount} subscription records`);
    } catch (e) {
      console.log(`📝 No subscriptions to reset`);
    }
    
    // Reset any payment-related booking data
    try {
      const bookingResetResult = await mongoose.connection.db.collection('bookings').updateMany(
        {},
        {
          $unset: {
            paymentAmount: "",
            paymentDate: "",
            dueDate: "",
            nextPaymentDate: ""
          }
        }
      );
      console.log(`✅ Reset payment data in ${bookingResetResult.modifiedCount} booking records`);
    } catch (e) {
      console.log(`📝 No booking payment data to reset`);
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    
    const verifyUser = await mongoose.connection.db.collection('users').findOne({});
    console.log('📊 Sample user after reset:');
    console.log(`  - Payment Status: ${verifyUser.paymentStatus}`);
    console.log(`  - Subscription Type: ${verifyUser.subscriptionType || 'null'}`);
    console.log(`  - Has Active Subscription: ${verifyUser.hasActiveSubscription || 'null'}`);
    
    // Check if any collections still have financial data
    for (const collectionName of collectionsToCheck) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const count = await collection.countDocuments();
        if (count > 0) {
          console.log(`📊 ${collectionName}: ${count} records remaining`);
        }
      } catch (e) {
        // Ignore if collection doesn't exist
      }
    }
    
    console.log('\n🎉 Complete subscription data reset completed!');
    console.log('📝 All financial and subscription data cleared from all collections');
    console.log('💡 Admin panel should now show "Not Set", "Not Paid", "Not Completed"');
    
  } catch (error) {
    console.error('❌ Complete reset failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

findAndResetAllSubscriptionData();