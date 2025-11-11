// Database migration script to update mode from "standard" to "fixed"
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  gender: { type: String, required: true },
  preferredSport: { type: String, required: true },
  preferredTimeSlot: { type: String, default: "-" },
  selectedCourt: { type: String, default: "-" },
  subscriptionType: { type: String, required: true },
  role: { type: String, default: "customer" },
  status: { type: String, enum: ["pending", "verified", "suspended", "registered"], default: "registered" },
  paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  champId: { type: String, unique: true },
  mode: { type: String, enum: ["fixed", "flexible"], default: "fixed" },
  comments: { type: String, default: "" },
  subscriptionStartDate: { type: Date },
  subscriptionEndDate: { type: Date },
  subscriptionAmount: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  champId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userMobile: { type: String, required: true },
  subscriptionType: { 
    type: String, 
    enum: ['monthly', 'quarterly', 'half yearly', 'yearly'],
    required: true 
  },
  mode: { 
    type: String, 
    enum: ['fixed', 'flexible'],
    default: 'fixed' 
  },
  amount: { type: Number, required: true },
  duration: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);

async function migrateModeValues() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB for mode migration');
    
    // Update Users: "standard" → "fixed"
    const userResult = await User.updateMany(
      { mode: "standard" },
      { $set: { mode: "fixed" } }
    );
    
    console.log(`✅ Updated mode for ${userResult.modifiedCount} users (standard → fixed)`);
    
    // Update Subscriptions: "standard" → "fixed"  
    const subscriptionResult = await Subscription.updateMany(
      { mode: "standard" },
      { $set: { mode: "fixed" } }
    );
    
    console.log(`✅ Updated mode for ${subscriptionResult.modifiedCount} subscriptions (standard → fixed)`);
    
    // Show current distribution
    const userModeStats = await User.aggregate([
      { $group: { _id: "$mode", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Current User Mode Distribution:');
    userModeStats.forEach(stat => {
      console.log(`- ${stat._id || 'null'}: ${stat.count} users`);
    });
    
    const subscriptionModeStats = await Subscription.aggregate([
      { $group: { _id: "$mode", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Current Subscription Mode Distribution:');
    subscriptionModeStats.forEach(stat => {
      console.log(`- ${stat._id || 'null'}: ${stat.count} subscriptions`);
    });
    
    // Show sample of updated records
    const sampleUsers = await User.find({ mode: "fixed" }).select('name mode champId').limit(5);
    console.log('\n📋 Sample updated users:');
    sampleUsers.forEach(user => {
      console.log(`- ${user.name} (${user.champId}): mode = ${user.mode}`);
    });
    
    console.log('\n🎉 Mode migration completed successfully!');
    console.log('📝 Summary: All "standard" mode values have been changed to "fixed"');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

migrateModeValues();