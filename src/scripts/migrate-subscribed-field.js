/**
 * Migration script to add subscribed field to existing users
 * Sets all existing users to subscribed: "no" by default
 */

const mongoose = require('mongoose');

async function migrateSubscribedField() {
  try {
    console.log('🚀 Starting migration: Adding subscribed field to existing users...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports');
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Find all users without subscribed field
    console.log('🔍 Checking existing users without subscribed field...');
    const usersWithoutSubscribed = await db.collection('users').find({
      subscribed: { $exists: false }
    }).toArray();
    
    console.log(`📊 Found ${usersWithoutSubscribed.length} users without subscribed field\n`);
    
    if (usersWithoutSubscribed.length === 0) {
      console.log('✨ All users already have subscribed field set. No migration needed.');
      return;
    }
    
    // Show sample users that will be updated
    console.log('👥 Sample users to be updated:');
    usersWithoutSubscribed.slice(0, 5).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
    });
    
    if (usersWithoutSubscribed.length > 5) {
      console.log(`   ... and ${usersWithoutSubscribed.length - 5} more users`);
    }
    console.log('');
    
    // Update all users without subscribed field to have "no"
    console.log('🔄 Updating users with subscribed: "no"...');
    const result = await db.collection('users').updateMany(
      { subscribed: { $exists: false } },
      { $set: { subscribed: "no" } }
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📈 Updated ${result.modifiedCount} users`);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration results...');
    const subscribedStats = await db.collection('users').aggregate([
      {
        $group: {
          _id: "$subscribed",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('📊 Subscribed Status Distribution:');
    subscribedStats.forEach(stat => {
      const emoji = stat._id === 'yes' ? '✅' : stat._id === 'no' ? '❌' : '❓';
      console.log(`   ${emoji} ${stat._id || 'undefined'}: ${stat.count} users`);
    });
    
    // Check if any users still missing subscribed field
    const stillMissing = await db.collection('users').countDocuments({
      subscribed: { $exists: false }
    });
    
    if (stillMissing === 0) {
      console.log('\n🎉 All users now have subscribed field assigned!');
    } else {
      console.log(`\n⚠️  Warning: ${stillMissing} users still missing subscribed field`);
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
  migrateSubscribedField()
    .then(() => {
      console.log('\n✨ Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateSubscribedField;