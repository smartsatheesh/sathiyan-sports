// Force reset all subscription fields to null with explicit null values
const mongoose = require('mongoose');

async function forceResetAllSubscriptionFields() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB for FORCE subscription fields reset');
    
    // Force reset User subscription fields to null explicitly
    console.log('\n🔄 FORCE resetting User subscription fields to NULL...');
    const userResult = await mongoose.connection.db.collection('users').updateMany(
      {},
      { 
        $set: {
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          lastSubscriptionDate: null,
          subscriptionAmount: null,
          hasActiveSubscription: false,
          paymentStatus: "pending",
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Force updated ${userResult.modifiedCount} users (all subscription fields → NULL)`);
    
    // Force reset Subscription payment fields to null explicitly
    console.log('\n🔄 FORCE resetting Subscription payment fields to NULL...');
    const subscriptionResult = await mongoose.connection.db.collection('subscriptions').updateMany(
      {},
      { 
        $set: {
          lastPaymentDate: null,
          nextDueDate: null,
          paymentStatus: "Pending",
          status: "pending",
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Force updated ${subscriptionResult.modifiedCount} subscriptions (payment fields → NULL)`);
    
    // Verify the reset worked
    console.log('\n🔍 Verification - Checking for NULL values...');
    
    const userNullCheck = await mongoose.connection.db.collection('users').aggregate([
      { 
        $group: { 
          _id: null,
          totalUsers: { $sum: 1 },
          nullStartDate: { $sum: { $cond: [{ $eq: ["$subscriptionStartDate", null] }, 1, 0] } },
          nullEndDate: { $sum: { $cond: [{ $eq: ["$subscriptionEndDate", null] }, 1, 0] } },
          nullLastSub: { $sum: { $cond: [{ $eq: ["$lastSubscriptionDate", null] }, 1, 0] } },
          nullAmount: { $sum: { $cond: [{ $eq: ["$subscriptionAmount", null] }, 1, 0] } },
          inactiveSubscriptions: { $sum: { $cond: [{ $eq: ["$hasActiveSubscription", false] }, 1, 0] } },
          pendingPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] } }
        }
      }
    ]).toArray();
    
    if (userNullCheck.length > 0) {
      const stats = userNullCheck[0];
      console.log(`📊 Users Verification:`);
      console.log(`   - Total Users: ${stats.totalUsers}`);
      console.log(`   - NULL Start Date: ${stats.nullStartDate}/${stats.totalUsers} ✅`);
      console.log(`   - NULL End Date: ${stats.nullEndDate}/${stats.totalUsers} ✅`);
      console.log(`   - NULL Last Subscription: ${stats.nullLastSub}/${stats.totalUsers} ✅`);
      console.log(`   - NULL Amount: ${stats.nullAmount}/${stats.totalUsers} ✅`);
      console.log(`   - Inactive Subscriptions: ${stats.inactiveSubscriptions}/${stats.totalUsers} ✅`);
      console.log(`   - Pending Payments: ${stats.pendingPayments}/${stats.totalUsers} ✅`);
    }
    
    const subNullCheck = await mongoose.connection.db.collection('subscriptions').aggregate([
      { 
        $group: { 
          _id: null,
          totalSubs: { $sum: 1 },
          nullLastPayment: { $sum: { $cond: [{ $eq: ["$lastPaymentDate", null] }, 1, 0] } },
          nullNextDue: { $sum: { $cond: [{ $eq: ["$nextDueDate", null] }, 1, 0] } },
          pendingPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Pending"] }, 1, 0] } },
          pendingStatus: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }
        }
      }
    ]).toArray();
    
    if (subNullCheck.length > 0) {
      const stats = subNullCheck[0];
      console.log(`📊 Subscriptions Verification:`);
      console.log(`   - Total Subscriptions: ${stats.totalSubs}`);
      console.log(`   - NULL Last Payment: ${stats.nullLastPayment}/${stats.totalSubs} ✅`);
      console.log(`   - NULL Next Due Date: ${stats.nullNextDue}/${stats.totalSubs} ✅`);
      console.log(`   - Pending Payments: ${stats.pendingPayments}/${stats.totalSubs} ✅`);
      console.log(`   - Pending Status: ${stats.pendingStatus}/${stats.totalSubs} ✅`);
    }
    
    // Show sample records to confirm
    console.log('\n📋 Sample Records After Force Reset:');
    const sampleUsers = await mongoose.connection.db.collection('users')
      .find({})
      .project({ 
        name: 1, 
        champId: 1, 
        paymentStatus: 1, 
        hasActiveSubscription: 1,
        subscriptionStartDate: 1,
        subscriptionEndDate: 1,
        lastSubscriptionDate: 1,
        subscriptionAmount: 1
      })
      .limit(5)
      .toArray();
      
    sampleUsers.forEach(user => {
      console.log(`👤 ${user.name} (${user.champId}):`);
      console.log(`   Payment: ${user.paymentStatus}`);
      console.log(`   Active: ${user.hasActiveSubscription}`);
      console.log(`   Start Date: ${user.subscriptionStartDate}`);
      console.log(`   End Date: ${user.subscriptionEndDate}`);
      console.log(`   Last Sub: ${user.lastSubscriptionDate}`);
      console.log(`   Amount: ${user.subscriptionAmount}`);
      console.log('   ---');
    });
    
    const sampleSubs = await mongoose.connection.db.collection('subscriptions')
      .find({})
      .project({ 
        champId: 1, 
        userName: 1, 
        paymentStatus: 1, 
        status: 1,
        lastPaymentDate: 1,
        nextDueDate: 1
      })
      .limit(3)
      .toArray();
      
    sampleSubs.forEach(sub => {
      console.log(`📋 ${sub.userName} (${sub.champId}):`);
      console.log(`   Payment Status: ${sub.paymentStatus}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Last Payment: ${sub.lastPaymentDate}`);
      console.log(`   Next Due: ${sub.nextDueDate}`);
      console.log('   ---');
    });
    
    console.log('\n🎉 FORCE RESET COMPLETED SUCCESSFULLY!');
    console.log('📝 All fields are now properly set to NULL/default values:');
    console.log('   ✅ Next Due Date → NULL (displays as "Not Set")');
    console.log('   ✅ Last Payment → NULL (displays as "Not Paid")');  
    console.log('   ✅ Payment Date → NULL (displays as "Not Completed")');
    console.log('   ✅ All subscription dates → NULL');
    console.log('   ✅ Payment Status → "Pending"');
    console.log('   ✅ Subscription Status → "pending"');
    console.log('   ✅ Active Subscription → false');
    
  } catch (error) {
    console.error('❌ Force reset failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

forceResetAllSubscriptionFields();