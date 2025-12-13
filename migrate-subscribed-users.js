// Migration script to add existing subscribed users to subscription collection
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

// Define schemas inline
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
  paymentStatus: String,
  paymentCompletedDate: Date,
  paymentDate: Date,
  nextDueDate: Date,
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  gracePeriodDays: Number,
  mode: String
}, { timestamps: true });

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  champId: String,
  userName: String,
  userEmail: String,
  userMobile: String,
  subscriptionType: {
    type: String,
    enum: ['monthly', 'quarterly', 'half yearly', 'yearly'],
    default: 'monthly'
  },
  subscriptionPrice: Number,
  mode: { type: String, enum: ['fixed', 'flexible'], default: 'fixed' },
  duration: Number,
  startDate: Date,
  endDate: Date,
  nextDueDate: Date,
  lastPaidDate: Date,
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active'
  },
  preferredSport: String,
  preferredTimeSlot: String,
  selectedCourt: String,
  gracePeriod: { type: Number, default: 7 },
  isOverdue: { type: Boolean, default: false },
  isPastGrace: { type: Boolean, default: false },
  daysPastDue: { type: Number, default: 0 },
  autoRenewal: { type: Boolean, default: false },
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

async function migrateSubscribedUsers() {
  try {
    console.log('🔄 Starting migration of subscribed users...');
    
    await connectToMongoose();
    
    // Find all users with subscribed = "yes" (lowercase)
    const subscribedUsers = await User.find({ subscribed: 'yes' });
    console.log(`📊 Found ${subscribedUsers.length} subscribed users to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const user of subscribedUsers) {
      try {
        console.log(`\n👤 Processing user: ${user.name} (${user.champId || user._id})`);
        
        // Check if subscription already exists for this user
        const existingSubscription = await Subscription.findOne({ userId: user._id });
        
        if (existingSubscription) {
          console.log(`   ⚠️  Subscription already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        // Helper function to check if time slot qualifies for female discount
        function isFemalDiscountTimeSlot(timeSlot) {
          if (!timeSlot) return false;
          
          const startTime = timeSlot.split(' - ')[0];
          const [time, period] = startTime.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          
          const startHour = hour24 + minutes / 60;
          
          // Female discount applies from 10:00 AM (10.0) to 4:00 PM (16.0)
          return startHour >= 10.0 && startHour < 16.0;
        }
        
        // Calculate subscription amount based on user profile
        function calculateSubscriptionAmount(champType, subscriptionType, gender, preferredTimeSlot) {
          // Default pricing structure
          const ADULT_MALE_PRICING = {
            monthly: 1499,
            quarterly: 4299, 
            'half yearly': 8099,
            yearly: 11499
          };

          const ADULT_FEMALE_PRICING = {
            monthly: 1199,
            quarterly: 3599,
            'half yearly': 6899,
            yearly: 10999
          };

          const KIDS_PRICING = {
            monthly: 899,
            quarterly: 2399,
            'half yearly': 4599,
            yearly: 8999
          };

          // Determine pricing category
          if (champType === 'kids') {
            return KIDS_PRICING[subscriptionType || 'monthly'] || KIDS_PRICING.monthly;
          } else if (gender === 'female' && isFemalDiscountTimeSlot(preferredTimeSlot || '')) {
            return ADULT_FEMALE_PRICING[subscriptionType || 'monthly'] || ADULT_FEMALE_PRICING.monthly;
          } else {
            return ADULT_MALE_PRICING[subscriptionType || 'monthly'] || ADULT_MALE_PRICING.monthly;
          }
        }
        
        // Calculate subscription price
        const subscriptionAmount = user.subscriptionAmount || 
          calculateSubscriptionAmount(
            user.champType,
            user.subscriptionType || 'monthly',
            user.gender,
            user.preferredTimeSlot
          );
        
        // Determine payment status
        let subscriptionPaymentStatus = 'Pending'; // Default to pending
        if (user.paymentStatus === 'completed') {
          subscriptionPaymentStatus = 'Paid';
        } else if (user.paymentStatus === 'failed') {
          subscriptionPaymentStatus = 'Failed';
        } else if (user.paymentStatus === 'pending') {
          subscriptionPaymentStatus = 'Pending';
        }
        
        // Calculate due date
        let dueDate = user.nextDueDate;
        if (!dueDate) {
          const today = new Date();
          if (subscriptionPaymentStatus === 'Pending') {
            // For pending payments, set due date to today
            dueDate = today;
          } else {
            // For completed payments, calculate next due date
            const subscriptionType = user.subscriptionType || 'monthly';
            switch (subscriptionType) {
              case 'monthly':
                dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                break;
              case 'quarterly':
                const currentQuarter = Math.floor(today.getMonth() / 3);
                const nextQuarterMonth = (currentQuarter + 1) * 3;
                dueDate = nextQuarterMonth >= 12 ? 
                  new Date(today.getFullYear() + 1, 0, 1) : 
                  new Date(today.getFullYear(), nextQuarterMonth, 1);
                break;
              case 'half yearly':
                const currentHalf = Math.floor(today.getMonth() / 6);
                const nextHalfMonth = (currentHalf + 1) * 6;
                dueDate = nextHalfMonth >= 12 ? 
                  new Date(today.getFullYear() + 1, 0, 1) : 
                  new Date(today.getFullYear(), nextHalfMonth, 1);
                break;
              case 'yearly':
                dueDate = new Date(today.getFullYear() + 1, today.getMonth(), 1);
                break;
              default:
                dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            }
          }
        }
        
        // Calculate overdue status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateObj = new Date(dueDate);
        dueDateObj.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - dueDateObj.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const gracePeriod = user.gracePeriodDays || 7;
        
        const isOverdue = diffDays > 0 && subscriptionPaymentStatus !== 'Paid';
        const isPastGrace = diffDays > gracePeriod && subscriptionPaymentStatus !== 'Paid';
        const daysPastDue = Math.max(diffDays, 0);
        
        // Duration mapping
        const durationMap = {
          'monthly': 1,
          'quarterly': 3,
          'half yearly': 6,
          'yearly': 12
        };
        
        // Create subscription data
        const subscriptionData = {
          userId: user._id,
          champId: user.champId,
          userName: user.name,
          userEmail: user.email,
          userMobile: user.mobile || user.phone,
          subscriptionType: user.subscriptionType || 'monthly',
          subscriptionPrice: subscriptionAmount,
          mode: user.mode || 'fixed',
          duration: durationMap[user.subscriptionType || 'monthly'] || 1,
          startDate: user.subscriptionStartDate || user.paymentCompletedDate || new Date(),
          endDate: user.subscriptionEndDate,
          nextDueDate: dueDate,
          lastPaidDate: subscriptionPaymentStatus === 'Paid' ? 
            (user.paymentCompletedDate || user.paymentDate) : null,
          paymentStatus: subscriptionPaymentStatus,
          status: 'active',
          preferredSport: user.preferredSport,
          preferredTimeSlot: user.preferredTimeSlot,
          selectedCourt: user.selectedCourt,
          gracePeriod: gracePeriod,
          isOverdue: isOverdue,
          isPastGrace: isPastGrace,
          daysPastDue: daysPastDue,
          autoRenewal: false,
          createdBy: user._id,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Create subscription
        const subscription = await Subscription.create(subscriptionData);
        
        console.log(`   ✅ Created subscription: ${subscription._id}`);
        console.log(`   📊 Details: ${user.subscriptionType || 'monthly'} | ${subscriptionPaymentStatus} | ₹${subscriptionAmount}`);
        console.log(`   📅 Due: ${dueDate.toDateString()} | Overdue: ${isOverdue} | Past Grace: ${isPastGrace}`);
        
        migratedCount++;
        
      } catch (userError) {
        console.error(`   ❌ Error creating subscription for ${user.name}:`, userError.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎯 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount} users`);
    console.log(`   ⚠️  Already existed: ${skippedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   📊 Total processed: ${subscribedUsers.length} users`);
    
    if (migratedCount > 0) {
      console.log(`\n🚀 Migration completed! ${migratedCount} new subscription entries created.`);
      console.log(`   📱 You can now view them at: localhost:3001/admin/subscriptions`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateSubscribedUsers();