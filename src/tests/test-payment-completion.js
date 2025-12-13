const mongoose = require('mongoose');

async function testPaymentCompletionFlow() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to test payment completion flow');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const subscriptionsCollection = db.collection('subscriptions');
    
    // Find a user with pending payment status to test with
    console.log('\n📋 Finding a user with pending payment status...');
    const testUser = await usersCollection.findOne({ 
      paymentStatus: "pending",
      subscriptionType: { $exists: true }
    });
    
    if (!testUser) {
      console.log('❌ No users with pending payment status found');
      return;
    }
    
    console.log(`\n👤 Test User: ${testUser.name}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Current Payment Status: ${testUser.paymentStatus}`);
    console.log(`   Subscription Type: ${testUser.subscriptionType}`);
    console.log(`   Current NextDueDate: ${testUser.nextDueDate || 'null'}`);
    
    // Check current subscription count
    const currentSubCount = await subscriptionsCollection.countDocuments({ userId: testUser._id });
    console.log(`   Current Subscription Records: ${currentSubCount}`);
    
    // Simulate payment completion by updating payment status
    console.log('\n💳 Simulating payment completion...');
    
    // Calculate expected dates
    const durationMap = {
      'monthly': 1,
      'quarterly': 3,
      'half yearly': 6,
      'yearly': 12
    };
    
    const duration = durationMap[testUser.subscriptionType] || 1;
    const expectedStartDate = new Date();
    const expectedEndDate = new Date(expectedStartDate);
    expectedEndDate.setMonth(expectedEndDate.getMonth() + duration);
    
    console.log(`   Expected Start Date: ${expectedStartDate.toDateString()}`);
    console.log(`   Expected End Date: ${expectedEndDate.toDateString()}`);
    console.log(`   Expected Duration: ${duration} month(s)`);
    
    // Update payment status to completed (this should trigger the logic)
    const updateResult = await usersCollection.updateOne(
      { _id: testUser._id },
      {
        $set: {
          paymentStatus: 'completed',
          subscriptionStartDate: expectedStartDate,
          subscriptionEndDate: expectedEndDate,
          nextDueDate: expectedEndDate,
          hasActiveSubscription: true,
          paymentCompletedDate: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ User updated: ${updateResult.modifiedCount} document modified`);
    
    // Create subscription record
    try {
      const subscriptionData = {
        userId: testUser._id,
        champId: testUser.champId,
        userName: testUser.name,
        userEmail: testUser.email,
        userMobile: testUser.mobile,
        subscriptionType: testUser.subscriptionType,
        mode: testUser.mode || 'fixed',
        amount: testUser.subscriptionAmount,
        duration: duration,
        startDate: expectedStartDate,
        endDate: expectedEndDate,
        nextDueDate: expectedEndDate,
        paymentStatus: 'completed',
        status: 'active',
        preferredSport: testUser.preferredSport,
        preferredTimeSlot: testUser.preferredTimeSlot,
        selectedCourt: testUser.selectedCourt,
        autoRenewal: false,
        createdBy: testUser._id
      };

      const subscriptionResult = await subscriptionsCollection.insertOne(subscriptionData);
      console.log(`✅ Subscription created: ${subscriptionResult.insertedId}`);
    } catch (subError) {
      console.log('⚠️ Subscription creation error:', subError.message);
    }
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const updatedUser = await usersCollection.findOne({ _id: testUser._id });
    const newSubCount = await subscriptionsCollection.countDocuments({ userId: testUser._id });
    
    console.log(`\n✅ Updated User: ${updatedUser.name}`);
    console.log(`   Payment Status: ${updatedUser.paymentStatus}`);
    console.log(`   NextDueDate: ${updatedUser.nextDueDate ? updatedUser.nextDueDate.toDateString() : 'null'}`);
    console.log(`   Subscription Start: ${updatedUser.subscriptionStartDate ? updatedUser.subscriptionStartDate.toDateString() : 'null'}`);
    console.log(`   Subscription End: ${updatedUser.subscriptionEndDate ? updatedUser.subscriptionEndDate.toDateString() : 'null'}`);
    console.log(`   Has Active Subscription: ${updatedUser.hasActiveSubscription}`);
    console.log(`   Subscription Records: ${newSubCount}`);
    
    // Test what the admin panel would show
    console.log('\n📊 Admin Panel Preview:');
    console.log(`   Next Due Date: ${updatedUser.nextDueDate ? 
      `${updatedUser.nextDueDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}` : 
      'Not Set'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testPaymentCompletionFlow();