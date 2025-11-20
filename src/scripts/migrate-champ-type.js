/**
 * Migration script to add champType "adult" to all existing users
 * This script will update all users who don't have a champType set
 */

const mongoose = require('mongoose');

async function migrateExistingUsers() {
  try {
    console.log('🚀 Starting migration: Adding champType to existing users...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports');
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Find all users without champType field
    console.log('🔍 Checking existing users without champType...');
    const usersWithoutChampType = await db.collection('users').find({
      champType: { $exists: false }
    }).toArray();
    
    console.log(`📊 Found ${usersWithoutChampType.length} users without champType field\n`);
    
    if (usersWithoutChampType.length === 0) {
      console.log('✨ All users already have champType set. No migration needed.');
      return;
    }
    
    // Show sample users that will be updated
    console.log('👥 Sample users to be updated:');
    usersWithoutChampType.slice(0, 5).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
    });
    
    if (usersWithoutChampType.length > 5) {
      console.log(`   ... and ${usersWithoutChampType.length - 5} more users`);
    }
    console.log('');
    
    // Update all users without champType to have "adult"
    console.log('🔄 Updating users with champType: "adult"...');
    const result = await db.collection('users').updateMany(
      { champType: { $exists: false } },
      { $set: { champType: "adult" } }
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📈 Updated ${result.modifiedCount} users`);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration results...');
    const champTypeStats = await db.collection('users').aggregate([
      {
        $group: {
          _id: "$champType",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('📊 Champion Type Distribution:');
    champTypeStats.forEach(stat => {
      const label = stat._id || 'undefined';
      console.log(`   ${label}: ${stat.count} users`);
    });
    
    // Check if any users still missing champType
    const stillMissing = await db.collection('users').countDocuments({
      champType: { $exists: false }
    });
    
    if (stillMissing === 0) {
      console.log('\n🎉 All users now have champType assigned!');
    } else {
      console.log(`\n⚠️  Warning: ${stillMissing} users still missing champType`);
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
  migrateExistingUsers()
    .then(() => {
      console.log('\n✨ Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateExistingUsers;