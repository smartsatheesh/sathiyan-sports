const mongoose = require('mongoose');

async function removeLastPaymentAmountField() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to clean up lastPaymentAmount field');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check how many users have the lastPaymentAmount field
    console.log('\n📋 Checking for lastPaymentAmount field...');
    const usersWithLastPayment = await usersCollection.find({
      lastPaymentAmount: { $exists: true }
    }).toArray();
    
    console.log(`Found ${usersWithLastPayment.length} users with lastPaymentAmount field`);
    
    if (usersWithLastPayment.length > 0) {
      console.log('\n👥 Users with lastPaymentAmount:');
      usersWithLastPayment.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.email} - Amount: ₹${user.lastPaymentAmount || 'N/A'}`);
      });
      
      console.log('\n🧹 Removing lastPaymentAmount field from all users...');
      
      const updateResult = await usersCollection.updateMany(
        {},
        {
          $unset: {
            lastPaymentAmount: ""
          }
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} users - removed lastPaymentAmount field`);
      
      // Verify removal
      console.log('\n🔍 Verifying field removal...');
      const remainingFields = await usersCollection.find({
        lastPaymentAmount: { $exists: true }
      }).count();
      
      if (remainingFields === 0) {
        console.log('✅ SUCCESS: All lastPaymentAmount fields removed');
      } else {
        console.log(`⚠️  WARNING: ${remainingFields} users still have lastPaymentAmount field`);
      }
    } else {
      console.log('✅ No users found with lastPaymentAmount field - already clean!');
    }
    
    // Show the current clean table structure
    console.log('\n📊 Updated admin table will now show these columns:');
    console.log('  1. ChampID');
    console.log('  2. Name');  
    console.log('  3. Email');
    console.log('  4. Mobile');
    console.log('  5. Sport');
    console.log('  6. Preferred Time Slot');
    console.log('  7. Court');
    console.log('  8. Subscription');
    console.log('  9. Status');
    console.log('  10. Payment Status');
    console.log('  11. Next Due Date');
    console.log('  12. Payment Date');
    console.log('  13. Comments');
    console.log('  14. Mode');
    console.log('  15. Actions');
    console.log('\n✨ Removed: "Last Payment" column - table is now cleaner!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

removeLastPaymentAmountField();