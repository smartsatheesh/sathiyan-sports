const mongoose = require('mongoose');

async function resetAllPaymentDates() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to reset payment dates');
    
    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // First, let's check what payment date fields exist
    console.log('\n📋 Checking for users with payment date fields...');
    const usersWithPaymentDates = await usersCollection.find({
      $or: [
        { paymentDate: { $exists: true, $ne: null } },
        { lastPaymentDate: { $exists: true, $ne: null } },
        { subscriptionStartDate: { $exists: true, $ne: null } },
        { subscriptionEndDate: { $exists: true, $ne: null } },
        { nextDueDate: { $exists: true, $ne: null } },
        { nextPaymentDate: { $exists: true, $ne: null } },
        { dueDate: { $exists: true, $ne: null } },
        { paymentDueDate: { $exists: true, $ne: null } },
        { subscriptionDate: { $exists: true, $ne: null } },
        { billingDate: { $exists: true, $ne: null } },
        { renewalDate: { $exists: true, $ne: null } }
      ]
    }).toArray();
    
    console.log(`Found ${usersWithPaymentDates.length} users with payment date fields`);
    
    if (usersWithPaymentDates.length > 0) {
      console.log('\n👥 Users with payment dates:');
      usersWithPaymentDates.forEach((user, index) => {
        console.log(`\nUser ${index + 1}: ${user.name || user.email || user._id}`);
        if (user.paymentDate) console.log(`  paymentDate: ${user.paymentDate}`);
        if (user.lastPaymentDate) console.log(`  lastPaymentDate: ${user.lastPaymentDate}`);
        if (user.subscriptionStartDate) console.log(`  subscriptionStartDate: ${user.subscriptionStartDate}`);
        if (user.subscriptionEndDate) console.log(`  subscriptionEndDate: ${user.subscriptionEndDate}`);
        if (user.nextDueDate) console.log(`  nextDueDate: ${user.nextDueDate}`);
        if (user.nextPaymentDate) console.log(`  nextPaymentDate: ${user.nextPaymentDate}`);
        if (user.dueDate) console.log(`  dueDate: ${user.dueDate}`);
        if (user.paymentDueDate) console.log(`  paymentDueDate: ${user.paymentDueDate}`);
        if (user.subscriptionDate) console.log(`  subscriptionDate: ${user.subscriptionDate}`);
        if (user.billingDate) console.log(`  billingDate: ${user.billingDate}`);
        if (user.renewalDate) console.log(`  renewalDate: ${user.renewalDate}`);
      });
      
      console.log('\n🧹 Resetting all payment date fields to null...');
      
      // Reset all possible payment date fields
      const updateResult = await usersCollection.updateMany(
        {},
        {
          $unset: {
            paymentDate: "",
            lastPaymentDate: "",
            subscriptionStartDate: "",
            subscriptionEndDate: "",
            nextDueDate: "",
            nextPaymentDate: "",
            dueDate: "",
            paymentDueDate: "",
            subscriptionDate: "",
            billingDate: "",
            renewalDate: ""
          }
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} users - removed all payment date fields`);
      
      // Verify the reset
      console.log('\n🔍 Verifying payment dates have been reset...');
      const remainingPaymentDates = await usersCollection.find({
        $or: [
          { paymentDate: { $exists: true, $ne: null } },
          { lastPaymentDate: { $exists: true, $ne: null } },
          { subscriptionStartDate: { $exists: true, $ne: null } },
          { subscriptionEndDate: { $exists: true, $ne: null } },
          { nextDueDate: { $exists: true, $ne: null } },
          { nextPaymentDate: { $exists: true, $ne: null } },
          { dueDate: { $exists: true, $ne: null } },
          { paymentDueDate: { $exists: true, $ne: null } },
          { subscriptionDate: { $exists: true, $ne: null } },
          { billingDate: { $exists: true, $ne: null } },
          { renewalDate: { $exists: true, $ne: null } }
        ]
      }).count();
      
      if (remainingPaymentDates === 0) {
        console.log('✅ SUCCESS: All payment date fields have been reset to null');
      } else {
        console.log(`⚠️  WARNING: ${remainingPaymentDates} users still have payment date fields`);
      }
      
    } else {
      console.log('✅ No users found with payment date fields - already clean!');
    }
    
    // Final verification - show a few sample users
    console.log('\n📊 Final verification - showing payment status for first 5 users:');
    const sampleUsers = await usersCollection.find({}).limit(5).toArray();
    sampleUsers.forEach((user, index) => {
      console.log(`\nUser ${index + 1}: ${user.name || user.email}`);
      console.log(`  Payment Status: ${user.paymentStatus || 'undefined'}`);
      console.log(`  Has Payment Date: ${!!user.paymentDate}`);
      console.log(`  Has Last Payment Date: ${!!user.lastPaymentDate}`);
      console.log(`  Has Next Due Date: ${!!user.nextDueDate}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

resetAllPaymentDates();