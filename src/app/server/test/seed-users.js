const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = "mongodb+srv://ganesan:ganesan1234@sathiyan-sports.pqsnj.mongodb.net/sathiyan-sports?retryWrites=true&w=majority&appName=sathiyan-sports";

// Sample users data
const sampleUsers = [
  {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@email.com",
    phone: "+91 9876543210",
    preferredSport: "badminton",
    subscriptionType: "monthly",
    paymentStatus: "completed",
    createdAt: new Date("2024-01-15T10:30:00Z")
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@email.com",
    phone: "+91 9876543211",
    preferredSport: "tennis",
    subscriptionType: "yearly",
    paymentStatus: "completed",
    createdAt: new Date("2024-01-20T14:15:00Z")
  },
  {
    name: "Arjun Singh",
    email: "arjun.singh@email.com",
    phone: "+91 9876543212",
    preferredSport: "football",
    subscriptionType: "weekly",
    paymentStatus: "pending",
    createdAt: new Date("2024-02-01T09:00:00Z")
  },
  {
    name: "Meera Patel",
    email: "meera.patel@email.com",
    phone: "+91 9876543213",
    preferredSport: "badminton",
    subscriptionType: "monthly",
    paymentStatus: "completed",
    createdAt: new Date("2024-02-05T16:45:00Z")
  },
  {
    name: "Vikram Reddy",
    email: "vikram.reddy@email.com",
    phone: "+91 9876543214",
    preferredSport: "tennis",
    subscriptionType: "monthly",
    paymentStatus: "completed",
    createdAt: new Date("2024-02-10T11:20:00Z")
  },
  {
    name: "Anita Joshi",
    email: "anita.joshi@email.com",
    phone: "+91 9876543215",
    preferredSport: "football",
    subscriptionType: "yearly",
    paymentStatus: "completed",
    createdAt: new Date("2024-02-15T13:30:00Z")
  },
  {
    name: "Suresh Gupta",
    email: "suresh.gupta@email.com",
    phone: "+91 9876543216",
    preferredSport: "badminton",
    subscriptionType: "weekly",
    paymentStatus: "pending",
    createdAt: new Date("2024-02-20T08:15:00Z")
  },
  {
    name: "Kavya Nair",
    email: "kavya.nair@email.com",
    phone: "+91 9876543217",
    preferredSport: "tennis",
    subscriptionType: "monthly",
    paymentStatus: "completed",
    createdAt: new Date("2024-02-25T15:45:00Z")
  },
  {
    name: "Rohit Verma",
    email: "rohit.verma@email.com",
    phone: "+91 9876543218",
    preferredSport: "football",
    subscriptionType: "monthly",
    paymentStatus: "completed",
    createdAt: new Date("2024-03-01T12:00:00Z")
  },
  {
    name: "Deepika Rao",
    email: "deepika.rao@email.com",
    phone: "+91 9876543219",
    preferredSport: "badminton",
    subscriptionType: "yearly",
    paymentStatus: "completed",
    createdAt: new Date("2024-03-05T10:30:00Z")
  }
];

async function seedUsers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('sathiyan-sports');
    const usersCollection = db.collection('users');
    
    // Clear existing users
    await usersCollection.deleteMany({});
    console.log('Cleared existing users');
    
    // Insert sample users
    const result = await usersCollection.insertMany(sampleUsers);
    console.log(`Inserted ${result.insertedCount} users`);
    
    // Create index on email for uniqueness
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log('Created unique index on email');
    
    // Create index on phone for uniqueness
    await usersCollection.createIndex({ phone: 1 }, { unique: true });
    console.log('Created unique index on phone');
    
    // Display inserted users
    const insertedUsers = await usersCollection.find({}).toArray();
    console.log('\nInserted users:');
    insertedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.preferredSport}`);
    });
    
  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

seedUsers();
