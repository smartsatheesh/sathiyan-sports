// Debug and force delete all subscription-related fields
const mongoose = require('mongoose');

async function debugAndForceReset() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB for debug and force reset');
    
    // First, let's see what fields actually exist
    const sampleUser = await mongoose.connection.db.collection('users').findOne({});
    console.log('\n📊 Sample user fields:');
    console.log(Object.keys(sampleUser));
    
    // Check if we have a subscriptions collection
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Available collections:');
    collections.forEach(col => console.log(`- ${col.name}`));
    
    // Check subscriptions collection if it exists
    try {
      const subscriptionCount = await mongoose.connection.db.collection('subscriptions').countDocuments();
      console.log(`\n📊 Subscriptions collection has ${subscriptionCount} documents`);
      
      if (subscriptionCount > 0) {
        const sampleSub = await mongoose.connection.db.collection('subscriptions').findOne({});
        console.log('\n📊 Sample subscription fields:');
        console.log(Object.keys(sampleSub));
      }
    } catch (e) {
      console.log('\n📊 No subscriptions collection found');
    }
    
    // Force delete ALL subscription-related fields using raw MongoDB operations
    console.log('\n🔧 Force deleting subscription fields...');
    
    const forceDeleteResult = await mongoose.connection.db.collection('users').updateMany(
      {}, 
      { 
        $unset: {
          // All possible subscription-related field names
          "subscriptionStartDate": "",
          "subscriptionEndDate": "",
          "subscriptionAmount": "",
          "lastPaymentDate": "",
          "nextDueDate": "",
          "lastPaymentAmount": "",
          "dueDate": "",
          "paymentDate": "",
          "subscription": "",
          "billing": "",
          "invoice": "",
          "amount": "",
          "startDate": "",
          "endDate": "",
          
          // Check if fields have different casing
          "SubscriptionStartDate": "",
          "SubscriptionEndDate": "",
          "SubscriptionAmount": "",
          "LastPaymentDate": "",
          "NextDueDate": "",
        }
      }
    );
    
    console.log(`✅ Force delete affected ${forceDeleteResult.modifiedCount} users`);
    
    // Also completely delete subscriptions collection
    try {
      await mongoose.connection.db.collection('subscriptions').drop();
      console.log('✅ Dropped subscriptions collection completely');
    } catch (e) {
      console.log('📝 Subscriptions collection already empty/doesn\'t exist');
    }
    
    // Final verification - check remaining fields
    const verifyUser = await mongoose.connection.db.collection('users').findOne({});
    console.log('\n📊 Remaining user fields after cleanup:');
    const remainingFields = Object.keys(verifyUser);
    const subscriptionFields = remainingFields.filter(field => 
      field.toLowerCase().includes('subscription') || 
      field.toLowerCase().includes('payment') ||
      field.toLowerCase().includes('amount') ||
      field.toLowerCase().includes('date')
    );
    
    if (subscriptionFields.length > 0) {
      console.log('⚠️ Remaining subscription-related fields:');
      subscriptionFields.forEach(field => console.log(`  - ${field}: ${verifyUser[field]}`));
    } else {
      console.log('✅ No subscription-related fields remain');
    }
    
    console.log('\n🎉 Force reset completed!');
    
  } catch (error) {
    console.error('❌ Debug and reset failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

debugAndForceReset();