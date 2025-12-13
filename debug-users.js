// Debug script to check existing users and their subscription status
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection
async function connectToMongoose() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB (Mongoose) connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Define user schema
const userSchema = new mongoose.Schema({
  champId: String,
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: String,
  phone: String,
  gender: String,
  champType: String,
  subscribed: String,
  preferredSport: String,
  preferredTimeSlot: String,
  selectedCourt: String,
  subscriptionType: String,
  subscriptionAmount: Number,
  paymentStatus: String
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function debugUsers() {
  try {
    console.log('🔍 Debugging user subscription status...');
    
    await connectToMongoose();
    
    // Check total users
    const totalUsers = await User.countDocuments({});
    console.log(`📊 Total users in database: ${totalUsers}`);
    
    // Check users with subscribed field
    const usersWithSubscribedField = await User.countDocuments({ subscribed: { $exists: true } });
    console.log(`📋 Users with 'subscribed' field: ${usersWithSubscribedField}`);
    
    // Check all possible subscription values
    const subscriptionValues = await User.aggregate([
      {
        $group: {
          _id: "$subscribed",
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('\n📈 Subscription status breakdown:');
    subscriptionValues.forEach(item => {
      console.log(`   "${item._id}": ${item.count} users`);
    });
    
    // Get sample users
    const sampleUsers = await User.find({}).limit(5).select('name champId subscribed subscriptionType paymentStatus');
    console.log('\n👥 Sample users:');
    sampleUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} | ChampID: ${user.champId} | Subscribed: "${user.subscribed}" | Type: ${user.subscriptionType} | Payment: ${user.paymentStatus}`);
    });
    
    // Check for different case variations
    const yesVariations = ['Yes', 'yes', 'YES', 'Y', 'y'];
    for (const variation of yesVariations) {
      const count = await User.countDocuments({ subscribed: variation });
      if (count > 0) {
        console.log(`\n✅ Found ${count} users with subscribed = "${variation}"`);
        
        // Show sample of these users
        const users = await User.find({ subscribed: variation }).limit(3).select('name champId subscribed subscriptionType');
        users.forEach(user => {
          console.log(`   - ${user.name} (${user.champId}) | Type: ${user.subscriptionType}`);
        });
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

// Run debug
debugUsers();