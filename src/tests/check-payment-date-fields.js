const { MongoClient } = require('mongodb');

async function checkPaymentDateFields() {
  const client = new MongoClient('mongodb+srv://sathiyanathan2005:sathiyan2005@cluster0.s5rcp.mongodb.net/');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('sathiyan-sports');
    const usersCollection = db.collection('users');
    
    // Find users with any payment date fields
    const usersWithPaymentDates = await usersCollection.find({
      $or: [
        { paymentDate: { $exists: true, $ne: null } },
        { lastPaymentDate: { $exists: true, $ne: null } },
        { subscriptionStartDate: { $exists: true, $ne: null } },
        { subscriptionEndDate: { $exists: true, $ne: null } },
        { nextDueDate: { $exists: true, $ne: null } },
        { nextPaymentDate: { $exists: true, $ne: null } },
        { dueDate: { $exists: true, $ne: null } },
        { paymentDueDate: { $exists: true, $ne: null } }
      ]
    }).toArray();
    
    console.log(`Found ${usersWithPaymentDates.length} users with payment date fields`);
    
    if (usersWithPaymentDates.length > 0) {
      console.log('\nUsers with payment dates:');
      usersWithPaymentDates.forEach(user => {
        console.log(`\nUser: ${user.name || user.email}`);
        if (user.paymentDate) console.log(`  paymentDate: ${user.paymentDate}`);
        if (user.lastPaymentDate) console.log(`  lastPaymentDate: ${user.lastPaymentDate}`);
        if (user.subscriptionStartDate) console.log(`  subscriptionStartDate: ${user.subscriptionStartDate}`);
        if (user.subscriptionEndDate) console.log(`  subscriptionEndDate: ${user.subscriptionEndDate}`);
        if (user.nextDueDate) console.log(`  nextDueDate: ${user.nextDueDate}`);
        if (user.nextPaymentDate) console.log(`  nextPaymentDate: ${user.nextPaymentDate}`);
        if (user.dueDate) console.log(`  dueDate: ${user.dueDate}`);
        if (user.paymentDueDate) console.log(`  paymentDueDate: ${user.paymentDueDate}`);
      });
    }
    
    // Check all possible field names in the database
    console.log('\nChecking all field names in users collection...');
    const sampleUser = await usersCollection.findOne({});
    if (sampleUser) {
      const fieldNames = Object.keys(sampleUser);
      const dateFields = fieldNames.filter(field => 
        field.toLowerCase().includes('date') || 
        field.toLowerCase().includes('payment') ||
        field.toLowerCase().includes('due')
      );
      console.log('Date/Payment related fields found:', dateFields);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkPaymentDateFields();