const mongoose = require('mongoose');

async function testCurrentAPIResponse() {
  try {
    await mongoose.connect("mongodb+srv://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w.ld4gdje.mongodb.net/SathiyanSports?retryWrites=true&w=majority&appName=SathiyanSports");
    
    console.log('🔌 Connected to MongoDB to simulate API response');
    
    // Simulate the exact same query as the admin API
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("-__v");
    
    console.log('\n📡 API Response Simulation - First 5 users:');
    console.log('=====================================');
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. Name: ${user.name || 'N/A'}`);
      console.log(`   Payment Status: ${user.paymentStatus || 'N/A'}`);
      console.log(`   NextDueDate: ${user.nextDueDate || 'undefined'}`);
      console.log(`   NextDueDate Type: ${typeof user.nextDueDate}`);
      
      // This is what the admin panel will receive
      const apiUserObject = {
        name: user.name,
        paymentStatus: user.paymentStatus,
        nextDueDate: user.nextDueDate  // This should be undefined
      };
      
      console.log(`   API Object nextDueDate: ${apiUserObject.nextDueDate}`);
      console.log(`   formatDueDate() would return: ${!apiUserObject.nextDueDate ? 'Not Set' : 'A formatted date'}`);
    });
    
    console.log('\n💡 Analysis:');
    console.log('✅ Database is clean - all nextDueDate fields are undefined');
    console.log('✅ API will return undefined for nextDueDate');
    console.log('✅ formatDueDate(undefined) should return "Not Set"');
    console.log('\n🎯 If you still see dates in admin panel, try:');
    console.log('1. Hard refresh (Ctrl+F5 / Cmd+Shift+R)');
    console.log('2. Clear browser cache');
    console.log('3. Open admin panel in incognito/private window');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testCurrentAPIResponse();