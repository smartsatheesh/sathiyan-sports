// Fix null mode values and set them to "fixed"
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  mode: { type: String, enum: ["fixed", "flexible"], default: "fixed" },
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function fixNullModeValues() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to fix null mode values');
    
    // Update Users with null/undefined mode to "fixed"
    const userResult = await User.updateMany(
      { $or: [{ mode: null }, { mode: { $exists: false } }, { mode: "" }] },
      { $set: { mode: "fixed" } }
    );
    
    console.log(`✅ Updated mode for ${userResult.modifiedCount} users (null → fixed)`);
    
    // Show final distribution
    const userModeStats = await User.aggregate([
      { $group: { _id: "$mode", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Final User Mode Distribution:');
    userModeStats.forEach(stat => {
      console.log(`- ${stat._id || 'null'}: ${stat.count} users`);
    });
    
    // Show sample of updated records
    const sampleUsers = await User.find({ mode: "fixed" }).select('name mode champId').limit(8);
    console.log('\n📋 Sample users with fixed mode:');
    sampleUsers.forEach(user => {
      console.log(`- ${user.name} (${user.champId}): mode = ${user.mode}`);
    });
    
    console.log('\n🎉 Mode cleanup completed successfully!');
    console.log('📝 All users now have either "fixed" or "flexible" mode values');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

fixNullModeValues();