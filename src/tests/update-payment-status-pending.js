// Update all users' payment status to "pending"
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  password: { type: String },
  gender: { type: String, required: true },
  preferredSport: { type: String, required: true },
  preferredTimeSlot: { type: String, default: "-" },
  selectedCourt: { type: String, default: "-" },
  subscriptionType: { type: String, required: true },
  role: { type: String, default: "customer" },
  status: { type: String, enum: ["pending", "verified", "suspended", "registered"], default: "registered" },
  paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  champId: { type: String, unique: true },
  mode: { type: String, enum: ["fixed", "flexible"], default: "fixed" },
  comments: { type: String, default: "" },
  subscriptionStartDate: { type: Date },
  subscriptionEndDate: { type: Date },
  subscriptionAmount: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function updateAllPaymentStatusToPending() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB for payment status update');
    
    // Get current payment status distribution before update
    const beforeStats = await User.aggregate([
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Current Payment Status Distribution (Before):');
    beforeStats.forEach(stat => {
      console.log(`- ${stat._id || 'null'}: ${stat.count} users`);
    });
    
    // Update ALL users' payment status to "pending"
    const updateResult = await User.updateMany(
      {}, // Empty filter = all users
      { 
        $set: { 
          paymentStatus: "pending",
          updatedAt: new Date()
        } 
      }
    );
    
    console.log(`\n✅ Updated payment status for ${updateResult.modifiedCount} users → "pending"`);
    console.log(`📝 Total users matched: ${updateResult.matchedCount}`);
    
    // Get updated payment status distribution
    const afterStats = await User.aggregate([
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Final Payment Status Distribution (After):');
    afterStats.forEach(stat => {
      console.log(`- ${stat._id || 'null'}: ${stat.count} users`);
    });
    
    // Show sample of updated users
    const sampleUsers = await User.find({}).select('name champId paymentStatus status updatedAt').limit(10);
    console.log('\n📋 Sample updated users:');
    sampleUsers.forEach(user => {
      console.log(`- ${user.name} (${user.champId}): Payment=${user.paymentStatus}, Status=${user.status}`);
    });
    
    // Get total count
    const totalUsers = await User.countDocuments();
    console.log(`\n📊 Total users in database: ${totalUsers}`);
    
    console.log('\n🎉 Payment status update completed successfully!');
    console.log('📝 All users now have payment status = "pending"');
    console.log('💡 Users will need to complete payment during their next login/booking');
    
  } catch (error) {
    console.error('❌ Payment status update failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

updateAllPaymentStatusToPending();