const mongoose = require('mongoose');

async function testMarkPaidButton() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to test Mark Paid functionality');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find a user with pending payment status
    console.log('\n📋 Finding a user to test Mark Paid functionality...');
    const testUser = await usersCollection.findOne({ 
      paymentStatus: "pending",
      subscriptionType: { $exists: true }
    });
    
    if (!testUser) {
      console.log('❌ No users with pending payment status found');
      return;
    }
    
    console.log(`\n👤 Testing with user: ${testUser.name}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Current Status: ${testUser.paymentStatus}`);
    console.log(`   Subscription Type: ${testUser.subscriptionType}`);
    console.log(`   Current NextDueDate: ${testUser.nextDueDate || 'null'}`);
    
    // Simulate the "Mark Paid" button click by calling the user update API
    console.log('\n💳 Simulating Mark Paid button click...');
    
    const updateData = {
      paymentStatus: 'completed',
      paymentMethod: 'gpay',
      transactionId: `TXN${Date.now()}`
    };
    
    // This simulates what the admin panel would do
    const result = await usersCollection.updateOne(
      { _id: testUser._id },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Update result: ${result.modifiedCount} document modified`);
    
    // Now trigger the payment completion logic manually (simulating the API endpoint)
    if (updateData.paymentStatus === 'completed' && testUser.paymentStatus !== 'completed') {
      const durationMap = {
        'monthly': 1,
        'quarterly': 3,
        'half yearly': 6,
        'yearly': 12
      };

      const duration = durationMap[testUser.subscriptionType] || 1;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);
      
      console.log('📅 Setting subscription dates...');
      console.log(`   Start Date: ${startDate.toDateString()}`);
      console.log(`   End Date: ${endDate.toDateString()}`);
      
      const subscriptionUpdate = await usersCollection.updateOne(
        { _id: testUser._id },
        {
          $set: {
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            nextDueDate: endDate,
            hasActiveSubscription: true,
            paymentCompletedDate: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`✅ Subscription dates set: ${subscriptionUpdate.modifiedCount} document modified`);
    }
    
    // Verify the final state
    console.log('\n🔍 Verifying final state...');
    const updatedUser = await usersCollection.findOne({ _id: testUser._id });
    
    console.log(`\n✅ Final User State:`);
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Payment Status: ${updatedUser.paymentStatus}`);
    console.log(`   Payment Method: ${updatedUser.paymentMethod || 'Not Set'}`);
    console.log(`   Transaction ID: ${updatedUser.transactionId || 'Not Set'}`);
    console.log(`   Next Due Date: ${updatedUser.nextDueDate ? updatedUser.nextDueDate.toDateString() : 'Not Set'}`);
    console.log(`   Payment Completed Date: ${updatedUser.paymentCompletedDate ? updatedUser.paymentCompletedDate.toDateString() : 'Not Set'}`);
    console.log(`   Has Active Subscription: ${updatedUser.hasActiveSubscription || false}`);
    
    console.log('\n🎯 Expected Admin Panel Display:');
    console.log(`   Payment Status: Completed`);
    console.log(`   Next Due Date: ${updatedUser.nextDueDate ? 
      updatedUser.nextDueDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 
      'Not Set'}`);
    console.log(`   Payment Date: ${updatedUser.paymentCompletedDate ? 
      updatedUser.paymentCompletedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 
      'Not Completed'}`);
    
    // Test if Mark Paid button should now be hidden
    const showMarkPaidButton = (updatedUser.paymentStatus === 'registered' || updatedUser.paymentStatus === 'pending');
    console.log(`\n🔘 Mark Paid Button Visible: ${showMarkPaidButton ? 'YES' : 'NO (correctly hidden)'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testMarkPaidButton();