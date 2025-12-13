const mongoose = require('mongoose');

async function debugDueDateIssue() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB for due date debugging');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check the exact fields and values
    console.log('\n🔍 Detailed investigation of first 5 users:');
    const users = await usersCollection.find({}).limit(5).toArray();
    
    users.forEach((user, index) => {
      console.log(`\n--- User ${index + 1}: ${user.name || user.email} ---`);
      console.log(`Payment Status: ${user.paymentStatus}`);
      console.log(`NextDueDate exists: ${user.hasOwnProperty('nextDueDate')}`);
      console.log(`NextDueDate value: ${user.nextDueDate}`);
      console.log(`NextDueDate type: ${typeof user.nextDueDate}`);
      
      // Check if it's an empty string or other falsy value
      if (user.nextDueDate === "") {
        console.log(`NextDueDate is empty string - this counts as exists but null`);
      }
      
      // Show all date-related fields
      const dateFields = Object.keys(user).filter(key => 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('due') ||
        key.toLowerCase().includes('payment')
      );
      console.log(`Date-related fields: ${dateFields.join(', ')}`);
      
      dateFields.forEach(field => {
        if (user[field] !== undefined) {
          console.log(`  ${field}: ${user[field]} (${typeof user[field]})`);
        }
      });
    });
    
    // Check how many users actually have nextDueDate as null vs empty string vs undefined
    console.log('\n📊 NextDueDate value analysis:');
    
    const nullCount = await usersCollection.countDocuments({ nextDueDate: null });
    const undefinedCount = await usersCollection.countDocuments({ nextDueDate: { $exists: false } });
    const emptyStringCount = await usersCollection.countDocuments({ nextDueDate: "" });
    const withValueCount = await usersCollection.countDocuments({ 
      nextDueDate: { $exists: true, $ne: null, $ne: "" } 
    });
    
    console.log(`nextDueDate = null: ${nullCount} users`);
    console.log(`nextDueDate doesn't exist: ${undefinedCount} users`);
    console.log(`nextDueDate = empty string: ${emptyStringCount} users`);
    console.log(`nextDueDate has actual value: ${withValueCount} users`);
    
    // If there are users with actual values, show them
    if (withValueCount > 0) {
      console.log('\n👥 Users with actual nextDueDate values:');
      const usersWithDates = await usersCollection.find({
        nextDueDate: { $exists: true, $ne: null, $ne: "" }
      }).toArray();
      
      usersWithDates.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email}`);
        console.log(`   Payment Status: ${user.paymentStatus}`);
        console.log(`   NextDueDate: ${user.nextDueDate}`);
        console.log(`   Type: ${typeof user.nextDueDate}`);
      });
    }
    
    // The issue might be that our previous scripts set nextDueDate to empty string "" instead of removing it
    // Let's fix this by actually removing the field
    console.log('\n🧹 Fixing empty string nextDueDate fields...');
    
    const fixResult = await usersCollection.updateMany(
      { nextDueDate: "" },
      { $unset: { nextDueDate: "" } }
    );
    
    console.log(`✅ Fixed ${fixResult.modifiedCount} users with empty string nextDueDate`);
    
    // Final verification
    console.log('\n📋 Final verification:');
    const finalCounts = {
      null: await usersCollection.countDocuments({ nextDueDate: null }),
      undefined: await usersCollection.countDocuments({ nextDueDate: { $exists: false } }),
      emptyString: await usersCollection.countDocuments({ nextDueDate: "" }),
      withValue: await usersCollection.countDocuments({ 
        nextDueDate: { $exists: true, $ne: null, $ne: "" } 
      })
    };
    
    console.log('Final nextDueDate distribution:');
    console.log(`  null: ${finalCounts.null}`);
    console.log(`  undefined: ${finalCounts.undefined}`);
    console.log(`  empty string: ${finalCounts.emptyString}`);
    console.log(`  with value: ${finalCounts.withValue}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugDueDateIssue();