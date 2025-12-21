// Test script to check and fix subscription entries
// This can be run as a one-time fix for existing users

import { connectToMongoose } from "./src/app/server/mongodb.js";
import User from "./src/app/models/User.js";
import Subscription from "./src/app/models/Subscription.js";

async function checkSubscriptionIssue() {
  try {
    await connectToMongoose();
    console.log("Connected to MongoDB");

    // Find users with subscribed: "yes" but no subscription entry
    const users = await User.find({ subscribed: "yes" });
    console.log(`Found ${users.length} users with subscribed=yes`);

    for (const user of users) {
      const existingSubscription = await Subscription.findOne({ userId: user._id });
      
      if (!existingSubscription) {
        console.log(`❌ MISSING: User ${user.name} (${user.champId}) has subscribed=yes but NO subscription entry`);
        console.log(`   Email: ${user.email}, Sport: ${user.preferredSport}, Type: ${user.subscriptionType}`);
      } else {
        console.log(`✅ OK: User ${user.name} (${user.champId}) has subscription entry`);
      }
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the check
checkSubscriptionIssue();