// Direct cleanup script to update existing users
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
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
  mode: { type: String, enum: ["standard", "flexible"], default: "standard" },
  comments: { type: String, default: "" },
  subscriptionStartDate: { type: Date },
  subscriptionEndDate: { type: Date },
  subscriptionAmount: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function runCleanup() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB');
    
    // Update all users' slots to "-" and set status to registered
    const slotsResult = await User.updateMany(
      {}, // Update all users
      {
        $set: {
          preferredTimeSlot: "-",
          selectedCourt: "-"
        }
      }
    );
    
    console.log(`✅ Updated slots for ${slotsResult.modifiedCount} users`);
    
    // Update status for users who are not already "registered"
    const statusResult = await User.updateMany(
      { status: { $ne: "registered" } },
      {
        $set: {
          status: "registered",
          paymentStatus: "completed"
        }
      }
    );
    
    console.log(`✅ Updated status for ${statusResult.modifiedCount} users`);
    
    // Show final count
    const totalUsers = await User.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);
    
    // Show sample of updated users
    const sampleUsers = await User.find({}).select('name preferredTimeSlot selectedCourt status paymentStatus').limit(5);
    console.log('\n📋 Sample updated users:');
    sampleUsers.forEach(user => {
      console.log(`- ${user.name}: Slot=${user.preferredTimeSlot}, Court=${user.selectedCourt}, Status=${user.status}, Payment=${user.paymentStatus}`);
    });
    
    console.log('\n🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

runCleanup();