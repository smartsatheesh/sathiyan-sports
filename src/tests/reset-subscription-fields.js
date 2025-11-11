// Reset all subscription-related fields to default "not set" values
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
  hasActiveSubscription: { type: Boolean, default: false },
  lastSubscriptionDate: { type: Date },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

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
    default: 'pending'
  },
  lastPaymentDate: { type: Date },
  nextDueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);

async function resetSubscriptionFieldsToDefault() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB for subscription fields reset');
    
    // Get current stats before update
    console.log('\n📊 Current User Subscription Status (Before):');
    const beforeUserStats = await User.aggregate([
      { 
        $group: { 
          _id: null,
          totalUsers: { $sum: 1 },
          usersWithStartDate: { $sum: { $cond: [{ $ne: ["$subscriptionStartDate", null] }, 1, 0] } },
          usersWithEndDate: { $sum: { $cond: [{ $ne: ["$subscriptionEndDate", null] }, 1, 0] } },
          usersWithActiveSubscription: { $sum: { $cond: [{ $eq: ["$hasActiveSubscription", true] }, 1, 0] } },
          usersWithLastSubscription: { $sum: { $cond: [{ $ne: ["$lastSubscriptionDate", null] }, 1, 0] } }
        }
      }
    ]);
    
    if (beforeUserStats.length > 0) {
      const stats = beforeUserStats[0];
      console.log(`- Total Users: ${stats.totalUsers}`);
      console.log(`- Users with Start Date: ${stats.usersWithStartDate}`);
      console.log(`- Users with End Date: ${stats.usersWithEndDate}`);
      console.log(`- Users with Active Subscription: ${stats.usersWithActiveSubscription}`);
      console.log(`- Users with Last Subscription Date: ${stats.usersWithLastSubscription}`);
    }
    
    console.log('\n📊 Current Subscription Status (Before):');
    const beforeSubStats = await Subscription.aggregate([
      { 
        $group: { 
          _id: "$paymentStatus",
          count: { $sum: 1 },
          withLastPayment: { $sum: { $cond: [{ $ne: ["$lastPaymentDate", null] }, 1, 0] } },
          withNextDue: { $sum: { $cond: [{ $ne: ["$nextDueDate", null] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    beforeSubStats.forEach(stat => {
      console.log(`- ${stat._id}: ${stat.count} subscriptions (LastPayment: ${stat.withLastPayment}, NextDue: ${stat.withNextDue})`);
    });
    
    // Reset User subscription fields to null/default
    console.log('\n🔄 Resetting User subscription fields...');
    const userUpdateResult = await User.updateMany(
      {},
      { 
        $unset: {
          subscriptionStartDate: "",
          subscriptionEndDate: "",
          lastSubscriptionDate: "",
          subscriptionAmount: ""
        },
        $set: {
          hasActiveSubscription: false,
          paymentStatus: "pending",
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Updated ${userUpdateResult.modifiedCount} users (subscription fields → null/default)`);
    
    // Reset Subscription payment fields to null/default 
    console.log('\n🔄 Resetting Subscription payment fields...');
    const subscriptionUpdateResult = await Subscription.updateMany(
      {},
      { 
        $unset: {
          lastPaymentDate: "",
          nextDueDate: ""
        },
        $set: {
          paymentStatus: "Pending",
          status: "pending",
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Updated ${subscriptionUpdateResult.modifiedCount} subscriptions (payment fields → null/default)`);
    
    // Get final stats
    console.log('\n📊 Final User Subscription Status (After):');
    const afterUserStats = await User.aggregate([
      { 
        $group: { 
          _id: null,
          totalUsers: { $sum: 1 },
          usersWithStartDate: { $sum: { $cond: [{ $ne: ["$subscriptionStartDate", null] }, 1, 0] } },
          usersWithEndDate: { $sum: { $cond: [{ $ne: ["$subscriptionEndDate", null] }, 1, 0] } },
          usersWithActiveSubscription: { $sum: { $cond: [{ $eq: ["$hasActiveSubscription", true] }, 1, 0] } },
          usersWithLastSubscription: { $sum: { $cond: [{ $ne: ["$lastSubscriptionDate", null] }, 1, 0] } },
          pendingPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] } }
        }
      }
    ]);
    
    if (afterUserStats.length > 0) {
      const stats = afterUserStats[0];
      console.log(`- Total Users: ${stats.totalUsers}`);
      console.log(`- Users with Start Date: ${stats.usersWithStartDate} (should be 0)`);
      console.log(`- Users with End Date: ${stats.usersWithEndDate} (should be 0)`);
      console.log(`- Users with Active Subscription: ${stats.usersWithActiveSubscription} (should be 0)`);
      console.log(`- Users with Last Subscription Date: ${stats.usersWithLastSubscription} (should be 0)`);
      console.log(`- Users with Pending Payment: ${stats.pendingPayments}`);
    }
    
    console.log('\n📊 Final Subscription Status (After):');
    const afterSubStats = await Subscription.aggregate([
      { 
        $group: { 
          _id: "$paymentStatus",
          count: { $sum: 1 },
          withLastPayment: { $sum: { $cond: [{ $ne: ["$lastPaymentDate", null] }, 1, 0] } },
          withNextDue: { $sum: { $cond: [{ $ne: ["$nextDueDate", null] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    afterSubStats.forEach(stat => {
      console.log(`- ${stat._id}: ${stat.count} subscriptions (LastPayment: ${stat.withLastPayment}, NextDue: ${stat.withNextDue})`);
    });
    
    // Show sample of updated records
    console.log('\n📋 Sample updated users:');
    const sampleUsers = await User.find({}).select('name champId paymentStatus hasActiveSubscription subscriptionStartDate subscriptionEndDate').limit(8);
    sampleUsers.forEach(user => {
      console.log(`- ${user.name} (${user.champId}): Payment=${user.paymentStatus}, ActiveSub=${user.hasActiveSubscription}, StartDate=${user.subscriptionStartDate || 'null'}, EndDate=${user.subscriptionEndDate || 'null'}`);
    });
    
    console.log('\n📋 Sample updated subscriptions:');
    const sampleSubscriptions = await Subscription.find({}).select('champId userName paymentStatus status lastPaymentDate nextDueDate').limit(5);
    sampleSubscriptions.forEach(sub => {
      console.log(`- ${sub.userName} (${sub.champId}): Payment=${sub.paymentStatus}, Status=${sub.status}, LastPayment=${sub.lastPaymentDate || 'null'}, NextDue=${sub.nextDueDate || 'null'}`);
    });
    
    console.log('\n🎉 Subscription fields reset completed successfully!');
    console.log('📝 Summary:');
    console.log('   ✅ Next Due Date → Not Set (null)');
    console.log('   ✅ Last Payment → Not Paid (null)');
    console.log('   ✅ Payment Date → Not Completed (null)');
    console.log('   ✅ Payment Status → Pending');
    console.log('   ✅ Active Subscription → false');
    console.log('   ✅ All subscription dates cleared');
    
  } catch (error) {
    console.error('❌ Subscription fields reset failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

resetSubscriptionFieldsToDefault();