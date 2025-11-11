// Complete reset of all subscription-related fields to null/default values
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({}, { strict: false });
const SubscriptionSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);

async function completeSubscriptionReset() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB for complete subscription reset');
    
    // Get current state before reset
    const beforeStats = await User.find({}).select('name champId subscriptionStartDate subscriptionEndDate subscriptionAmount lastPaymentDate nextDueDate').limit(5);
    console.log('\n📊 Current state (Before reset):');
    beforeStats.forEach(user => {
      console.log(`- ${user.name} (${user.champId}): Start=${user.subscriptionStartDate}, End=${user.subscriptionEndDate}, Amount=${user.subscriptionAmount}`);
    });
    
    // COMPLETE RESET - Remove/null all subscription-related fields in User collection
    const userResetResult = await User.updateMany(
      {}, // All users
      { 
        $unset: {
          // Subscription dates
          subscriptionStartDate: "",
          subscriptionEndDate: "",
          lastPaymentDate: "",
          nextDueDate: "",
          
          // Subscription financial
          subscriptionAmount: "",
          lastPaymentAmount: "",
          
          // Other subscription fields that might exist
          subscriptionStatus: "",
          subscriptionPlan: "",
          subscriptionId: "",
          renewalDate: "",
          expiryDate: "",
          dueDate: "",
          paymentDate: "",
          billingDate: "",
          invoiceDate: "",
          
          // Additional cleanup
          subscription: "",
          billing: "",
          payment: ""
        },
        $set: {
          // Keep these as they should remain
          paymentStatus: "pending",
          status: "registered",
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`\n✅ Reset subscription fields for ${userResetResult.modifiedCount} users`);
    
    // ALSO DELETE ALL SUBSCRIPTION RECORDS (if you want complete reset)
    console.log('\n🗑️ Deleting all subscription records...');
    const subscriptionDeleteResult = await Subscription.deleteMany({});
    console.log(`✅ Deleted ${subscriptionDeleteResult.deletedCount} subscription records`);
    
    // Verify the reset worked
    const afterStats = await User.find({}).select('name champId subscriptionStartDate subscriptionEndDate subscriptionAmount lastPaymentDate nextDueDate paymentStatus status').limit(5);
    console.log('\n📊 State after reset:');
    afterStats.forEach(user => {
      console.log(`- ${user.name} (${user.champId}): Start=${user.subscriptionStartDate || 'null'}, End=${user.subscriptionEndDate || 'null'}, Amount=${user.subscriptionAmount || 'null'}, Payment=${user.paymentStatus}`);
    });
    
    // Get field summary
    const fieldSummary = await User.aggregate([
      {
        $project: {
          hasStartDate: { $ne: ["$subscriptionStartDate", null] },
          hasEndDate: { $ne: ["$subscriptionEndDate", null] },
          hasAmount: { $ne: ["$subscriptionAmount", null] },
          hasLastPayment: { $ne: ["$lastPaymentDate", null] }
        }
      },
      {
        $group: {
          _id: null,
          usersWithStartDate: { $sum: { $cond: ["$hasStartDate", 1, 0] } },
          usersWithEndDate: { $sum: { $cond: ["$hasEndDate", 1, 0] } },
          usersWithAmount: { $sum: { $cond: ["$hasAmount", 1, 0] } },
          usersWithLastPayment: { $sum: { $cond: ["$hasLastPayment", 1, 0] } },
          totalUsers: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📊 Field Summary After Reset:');
    if (fieldSummary.length > 0) {
      const summary = fieldSummary[0];
      console.log(`- Users with subscription start date: ${summary.usersWithStartDate}/${summary.totalUsers}`);
      console.log(`- Users with subscription end date: ${summary.usersWithEndDate}/${summary.totalUsers}`);
      console.log(`- Users with subscription amount: ${summary.usersWithAmount}/${summary.totalUsers}`);
      console.log(`- Users with last payment date: ${summary.usersWithLastPayment}/${summary.totalUsers}`);
    }
    
    // Get payment status distribution
    const paymentStats = await User.aggregate([
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Payment Status Distribution:');
    paymentStats.forEach(stat => {
      console.log(`- ${stat._id || 'null'}: ${stat.count} users`);
    });
    
    console.log('\n🎉 Complete subscription reset completed!');
    console.log('📝 All subscription dates, amounts, and records have been cleared');
    console.log('💡 Users will need to create new subscriptions from scratch');
    
  } catch (error) {
    console.error('❌ Complete reset failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

completeSubscriptionReset();