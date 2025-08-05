const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = "mongodb+srv://ganesan:ganesan1234@sathiyan-sports.pqsnj.mongodb.net/sathiyan-sports?retryWrites=true&w=majority&appName=sathiyan-sports";

// Sample contact data
const sampleContacts = [
  {
    name: "Amit Sharma",
    email: "amit.sharma@email.com",
    message: "I would like to know more about the membership plans and pricing for badminton courts.",
    status: "new",
    createdAt: new Date("2024-03-01T10:30:00Z"),
    updatedAt: new Date("2024-03-01T10:30:00Z")
  },
  {
    name: "Riya Patel",
    email: "riya.patel@email.com",
    message: "Hi, I tried to book a slot for tennis but the system is showing all slots as unavailable. Can you please help?",
    status: "read",
    createdAt: new Date("2024-03-02T14:15:00Z"),
    updatedAt: new Date("2024-03-02T16:20:00Z")
  },
  {
    name: "Karan Singh",
    email: "karan.singh@email.com",
    message: "Great facilities! I'm interested in organizing a football tournament. Can we discuss the rates for group bookings?",
    status: "replied",
    createdAt: new Date("2024-03-03T09:45:00Z"),
    updatedAt: new Date("2024-03-03T11:30:00Z")
  },
  {
    name: "Priyanka Gupta",
    email: "priyanka.gupta@email.com",
    message: "I'm new to the area and looking for a good sports club. Do you offer trial sessions before committing to membership?",
    status: "new",
    createdAt: new Date("2024-03-04T16:20:00Z"),
    updatedAt: new Date("2024-03-04T16:20:00Z")
  },
  {
    name: "Rahul Verma",
    email: "rahul.verma@email.com",
    message: "The online payment failed but the money was deducted from my account. Please check booking ID: BK123456789",
    status: "read",
    createdAt: new Date("2024-03-05T11:00:00Z"),
    updatedAt: new Date("2024-03-05T12:15:00Z")
  }
];

async function seedContacts() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('sathiyan-sports');
    const contactsCollection = db.collection('contacts');
    
    // Clear existing contacts
    await contactsCollection.deleteMany({});
    console.log('Cleared existing contacts');
    
    // Insert sample contacts
    const result = await contactsCollection.insertMany(sampleContacts);
    console.log(`Inserted ${result.insertedCount} contacts`);
    
    // Create indexes
    await contactsCollection.createIndex({ createdAt: -1 });
    await contactsCollection.createIndex({ status: 1 });
    await contactsCollection.createIndex({ email: 1 });
    console.log('Created indexes');
    
    // Display inserted contacts
    const insertedContacts = await contactsCollection.find({}).toArray();
    console.log('\nInserted contacts:');
    insertedContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.name} (${contact.email}) - Status: ${contact.status}`);
      console.log(`   Message: ${contact.message.substring(0, 50)}...`);
    });
    
    // Display statistics
    const statusStats = await contactsCollection.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\nContact Statistics:');
    statusStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} messages`);
    });
    
  } catch (error) {
    console.error('Error seeding contacts:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

seedContacts();
