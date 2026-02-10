const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  champId: String,
  userName: String,
  subscriptionType: String,
  amount: Number,
  paymentStatus: String,
  status: String,
  createdAt: Date
}, { collection: 'subscriptions' });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

async function checkSubscriptions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sathiyan-sports');
    
    const count = await Subscription.countDocuments({});
    console.log('📊 Total subscriptions in database:', count);
    
    const recentSubs = await Subscription.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    console.log('\n📋 Last 5 subscriptions:');
    recentSubs.forEach((sub, i) => {
      console.log(`\n${i + 1}. ${sub.userName || 'Unknown'}`);
      console.log(`   ID: ${sub._id}`);
      console.log(`   ChampID: ${sub.champId}`);
      console.log(`   Type: ${sub.subscriptionType}`);
      console.log(`   Amount: ₹${sub.amount}`);
      console.log(`   Payment: ${sub.paymentStatus}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log(`   UserId: ${sub.userId}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSubscriptions();
