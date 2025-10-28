#!/usr/bin/env node

// Direct MongoDB script to remove unique indexes
const mongoose = require('mongoose');

async function removeUniqueIndexes() {
  try {
    // Connect to MongoDB using the same connection string as your app
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SathiyanSports';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB');
    
    // Get the users collection
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // List current indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('\n📋 Current indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });
    
    // Find and drop unique indexes on email and mobile
    const indexesToDrop = indexes.filter(idx => 
      idx.unique && (
        (idx.key.email === 1) || 
        (idx.key.mobile === 1)
      )
    );
    
    if (indexesToDrop.length === 0) {
      console.log('\n✅ No unique indexes found on email or mobile fields');
      process.exit(0);
    }
    
    console.log('\n🗑️  Dropping unique indexes:');
    for (const idx of indexesToDrop) {
      console.log(`  - Dropping ${idx.name} (${JSON.stringify(idx.key)})`);
      await collection.dropIndex(idx.name);
      console.log(`    ✅ Dropped ${idx.name}`);
    }
    
    // Verify indexes after cleanup
    const newIndexes = await collection.listIndexes().toArray();
    console.log('\n📋 Indexes after cleanup:');
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('Users can now register with duplicate email/mobile numbers');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📤 Database connection closed');
    process.exit(0);
  }
}

// Run the migration
removeUniqueIndexes();