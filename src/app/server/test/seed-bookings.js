const mongoose = require('mongoose');

// MongoDB connection string - update with your credentials
const MONGODB_URI = "mongodb://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w-shard-00-00.ld4gdje.mongodb.net:27017,ac-zhkkd6w-shard-00-01.ld4gdje.mongodb.net:27017,ac-zhkkd6w-shard-00-02.ld4gdje.mongodb.net:27017/SathiyanSports?ssl=true&replicaSet=atlas-12t0o1-shard-0&authSource=admin&retryWrites=true&w=majority";

// Booking Schema
const bookingSchema = new mongoose.Schema({
  sport: {
    type: String,
    required: [true, "Sport is required"],
    enum: ["Cricket", "Football", "Shuttle Badminton"],
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
  },
  timeSlots: [{
    type: String,
    required: true,
  }],
  totalAmount: {
    type: Number,
    required: [true, "Total amount is required"],
  },
  pricePerSlot: {
    type: Number,
    required: [true, "Price per slot is required"],
  },
  isWeekend: {
    type: Boolean,
    required: true,
  },
  customerName: {
    type: String,
    required: [true, "Customer name is required"],
  },
  customerEmail: {
    type: String,
    required: [true, "Customer email is required"],
  },
  customerPhone: {
    type: String,
    required: [true, "Customer phone is required"],
  },
  paymentStatus: {
    type: String,
    default: "pending",
    enum: ["pending", "completed", "failed", "cancelled"],
  },
  bookingStatus: {
    type: String,
    default: "confirmed",
    enum: ["confirmed", "cancelled", "completed"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create compound index to prevent double booking
bookingSchema.index({ sport: 1, date: 1, timeSlots: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

// Sample booking data
const sampleBookings = [
  {
    sport: "Cricket",
    date: new Date("2025-08-05"),
    timeSlots: ["09:00 am", "10:00 am"],
    totalAmount: 1398,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Rajesh Kumar",
    customerEmail: "rajesh.kumar@gmail.com",
    customerPhone: "+91 9876543210",
    paymentStatus: "completed",
    bookingStatus: "confirmed",
    createdAt: new Date("2025-08-04T10:30:00Z"),
    updatedAt: new Date("2025-08-04T10:30:00Z")
  },
  {
    sport: "Football",
    date: new Date("2025-08-05"),
    timeSlots: ["06:00 pm", "07:00 pm", "08:00 pm"],
    totalAmount: 2097,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Priya Sharma",
    customerEmail: "priya.sharma@yahoo.com",
    customerPhone: "+91 9876543211",
    paymentStatus: "completed",
    bookingStatus: "confirmed",
    createdAt: new Date("2025-08-04T14:15:00Z"),
    updatedAt: new Date("2025-08-04T14:15:00Z")
  },
  {
    sport: "Shuttle Badminton",
    date: new Date("2025-08-06"),
    timeSlots: ["07:00 am"],
    totalAmount: 699,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Amit Patel",
    customerEmail: "amit.patel@hotmail.com",
    customerPhone: "+91 9876543212",
    paymentStatus: "pending",
    bookingStatus: "confirmed",
    createdAt: new Date("2025-08-04T16:45:00Z"),
    updatedAt: new Date("2025-08-04T16:45:00Z")
  },
  {
    sport: "Cricket",
    date: new Date("2025-08-10"), // Weekend
    timeSlots: ["11:00 am", "12:00 pm"],
    totalAmount: 1998,
    pricePerSlot: 999,
    isWeekend: true,
    customerName: "Sanjay Reddy",
    customerEmail: "sanjay.reddy@gmail.com",
    customerPhone: "+91 9876543213",
    paymentStatus: "completed",
    bookingStatus: "confirmed",
    createdAt: new Date("2025-08-04T09:20:00Z"),
    updatedAt: new Date("2025-08-04T09:20:00Z")
  },
  {
    sport: "Football",
    date: new Date("2025-08-11"), // Weekend
    timeSlots: ["05:00 pm"],
    totalAmount: 999,
    pricePerSlot: 999,
    isWeekend: true,
    customerName: "Deepika Singh",
    customerEmail: "deepika.singh@outlook.com",
    customerPhone: "+91 9876543214",
    paymentStatus: "completed",
    bookingStatus: "confirmed",
    createdAt: new Date("2025-08-04T11:10:00Z"),
    updatedAt: new Date("2025-08-04T11:10:00Z")
  },
  {
    sport: "Shuttle Badminton",
    date: new Date("2025-08-07"),
    timeSlots: ["08:00 am", "09:00 am"],
    totalAmount: 1398,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Vikram Joshi",
    customerEmail: "vikram.joshi@gmail.com",
    customerPhone: "+91 9876543215",
    paymentStatus: "failed",
    bookingStatus: "cancelled",
    createdAt: new Date("2025-08-04T13:25:00Z"),
    updatedAt: new Date("2025-08-04T13:30:00Z")
  },
  {
    sport: "Cricket",
    date: new Date("2025-08-08"),
    timeSlots: ["04:00 pm", "05:00 pm", "06:00 pm"],
    totalAmount: 2097,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Meera Nair",
    customerEmail: "meera.nair@yahoo.co.in",
    customerPhone: "+91 9876543216",
    paymentStatus: "completed",
    bookingStatus: "completed",
    createdAt: new Date("2025-08-03T15:40:00Z"),
    updatedAt: new Date("2025-08-08T19:00:00Z")
  },
  {
    sport: "Football",
    date: new Date("2025-08-09"),
    timeSlots: ["07:00 pm", "08:00 pm"],
    totalAmount: 1398,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Arjun Kapoor",
    customerEmail: "arjun.kapoor@gmail.com",
    customerPhone: "+91 9876543217",
    paymentStatus: "pending",
    bookingStatus: "confirmed",
    createdAt: new Date("2025-08-04T17:55:00Z"),
    updatedAt: new Date("2025-08-04T17:55:00Z")
  },
  {
    sport: "Shuttle Badminton",
    date: new Date("2025-08-12"), // Weekend
    timeSlots: ["06:00 am", "07:00 am"],
    totalAmount: 1998,
    pricePerSlot: 999,
    isWeekend: true,
    customerName: "Kavya Menon",
    customerEmail: "kavya.menon@hotmail.com",
    customerPhone: "+91 9876543218",
    paymentStatus: "completed",
    bookingStatus: "confirmed",
    createdAt: new Date("2025-08-04T12:30:00Z"),
    updatedAt: new Date("2025-08-04T12:30:00Z")
  },
  {
    sport: "Cricket",
    date: new Date("2025-08-13"),
    timeSlots: ["10:00 am"],
    totalAmount: 699,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Rohit Verma",
    customerEmail: "rohit.verma@gmail.com",
    customerPhone: "+91 9876543219",
    paymentStatus: "completed",
    bookingStatus: "confirmed",
    createdAt: new Date("2025-08-04T18:20:00Z"),
    updatedAt: new Date("2025-08-04T18:20:00Z")
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('✅ Connected to MongoDB successfully!');

    // Clear existing bookings (optional)
    console.log('Clearing existing bookings...');
    await Booking.deleteMany({});
    console.log('✅ Existing bookings cleared!');

    // Insert sample data
    console.log('Inserting sample booking data...');
    const insertedBookings = await Booking.insertMany(sampleBookings);
    console.log(`✅ Successfully inserted ${insertedBookings.length} bookings!`);

    // Create indexes
    console.log('Creating database indexes...');
    await Booking.createIndexes();
    console.log('✅ Database indexes created!');

    // Display some statistics
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ paymentStatus: 'completed' });
    const pendingBookings = await Booking.countDocuments({ paymentStatus: 'pending' });
    const cricketBookings = await Booking.countDocuments({ sport: 'Cricket' });
    const footballBookings = await Booking.countDocuments({ sport: 'Football' });
    const badmintonBookings = await Booking.countDocuments({ sport: 'Shuttle Badminton' });

    console.log('\n📊 Database Statistics:');
    console.log(`Total Bookings: ${totalBookings}`);
    console.log(`Completed Payments: ${completedBookings}`);
    console.log(`Pending Payments: ${pendingBookings}`);
    console.log(`Cricket Bookings: ${cricketBookings}`);
    console.log(`Football Bookings: ${footballBookings}`);
    console.log(`Badminton Bookings: ${badmintonBookings}`);

    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

// Run the seeding function
seedDatabase();
