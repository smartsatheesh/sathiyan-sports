// test-mongo.js
const mongoose = require('mongoose');

// Direct connection string (no DNS SRV lookup needed)
const directUri = "mongodb://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w-shard-00-00.ld4gdje.mongodb.net:27017,ac-zhkkd6w-shard-00-01.ld4gdje.mongodb.net:27017,ac-zhkkd6w-shard-00-02.ld4gdje.mongodb.net:27017/sathiyanSports?ssl=true&replicaSet=atlas-12t0o1-shard-0&authSource=admin&retryWrites=true&w=majority";

// Local MongoDB fallback
const localUri = "mongodb://localhost:27017/sathiyan-sports";

// Try Atlas connection first
console.log('Attempting to connect to MongoDB Atlas...');
mongoose.connect(directUri, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
.then(() => {
  console.log('✅ Connected successfully to MongoDB Atlas');
  process.exit(0);
})
.catch(err => {
  console.error('❌ Failed to connect to MongoDB Atlas:', err);
  
  // Try local connection as fallback
  console.log('\nAttempting to connect to local MongoDB...');
  mongoose.connect(localUri, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => {
    console.log('✅ Connected successfully to local MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed to connect to local MongoDB:', err);
    console.log('\n📋 MongoDB Connection Troubleshooting:');
    console.log('1. Check if MongoDB Atlas IP whitelist includes your IP (0.0.0.0/0)');
    console.log('2. Verify username/password is correct');
    console.log('3. Make sure your network allows outbound connections to MongoDB ports');
    console.log('4. For local connection, ensure MongoDB is installed and running');
    process.exit(1);
  });
});