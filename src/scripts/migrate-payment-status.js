/**
 * Migration script to update paymentStatus from "registered" to "pending"
 * This removes the "registered" status from payment status and keeps it only in user status
 */

const mongoose = require('mongoose');

async function migratePaymentStatus() {
  try {
    console.log('🚀 Starting migration: Removing "registered" from payment status...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports');
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Find all users with paymentStatus "registered"
    console.log('🔍 Checking users with paymentStatus "registered"...');
    const usersWithRegisteredPayment = await db.collection('users').find({
      paymentStatus: "registered"
    }).toArray();
    
    console.log(`📊 Found ${usersWithRegisteredPayment.length} users with paymentStatus "registered"\n`);
    
    if (usersWithRegisteredPayment.length === 0) {
      console.log('✨ No users found with paymentStatus "registered". No migration needed.');
      return;
    }
    
    // Show sample users that will be updated
    console.log('👥 Users to be updated (paymentStatus: registered → pending):');
    usersWithRegisteredPayment.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - Status: ${user.status}, Payment: ${user.paymentStatus}`);
    });
    console.log('');
    
    // Update all users with paymentStatus "registered" to "pending"
    console.log('🔄 Updating paymentStatus from "registered" to "pending"...');
    const result = await db.collection('users').updateMany(
      { paymentStatus: "registered" },
      { $set: { paymentStatus: "pending" } }
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📈 Updated ${result.modifiedCount} users`);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration results...');
    const paymentStatusStats = await db.collection('users').aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('📊 Payment Status Distribution:');
    paymentStatusStats.forEach(stat => {
      const emoji = stat._id === 'pending' ? '⏳' : stat._id === 'completed' ? '✅' : stat._id === 'failed' ? '❌' : stat._id === 'overdue' ? '⚠️' : '❓';
      console.log(`   ${emoji} ${stat._id || 'undefined'}: ${stat.count} users`);
    });
    
    // Also show user status distribution to confirm "registered" is still there
    console.log('\n📋 User Status Distribution (should still have "registered"):');
    const userStatusStats = await db.collection('users').aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    userStatusStats.forEach(stat => {
      const emoji = stat._id === 'pending' ? '⏳' : stat._id === 'verified' ? '✅' : stat._id === 'registered' ? '📝' : stat._id === 'suspended' ? '🚫' : '❓';
      console.log(`   ${emoji} ${stat._id || 'undefined'}: ${stat.count} users`);
    });
    
    // Check if any users still have paymentStatus "registered"
    const stillRegistered = await db.collection('users').countDocuments({
      paymentStatus: "registered"
    });
    
    if (stillRegistered === 0) {
      console.log('\n🎉 Success! No users have paymentStatus "registered" anymore');
    } else {
      console.log(`\n⚠️  Warning: ${stillRegistered} users still have paymentStatus "registered"`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  migratePaymentStatus()
    .then(() => {
      console.log('\n✨ Payment status migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Payment status migration failed:', error);
      process.exit(1);
    });
}

module.exports = migratePaymentStatus;