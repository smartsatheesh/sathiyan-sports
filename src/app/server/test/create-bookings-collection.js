// MongoDB Shell Script for Creating Bookings Collection
// Use this script in MongoDB Compass or MongoDB Shell

// Switch to your database
use('sathiyanSports');

// Drop existing collection (optional - remove this line if you want to keep existing data)
db.bookings.drop();

// Create the bookings collection with sample data
db.bookings.insertMany([
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
]);

// Create indexes for better performance
db.bookings.createIndex({ sport: 1, date: 1, timeSlots: 1 }); // Compound index to prevent double booking
db.bookings.createIndex({ customerEmail: 1 }); // Index for customer lookups
db.bookings.createIndex({ date: 1 }); // Index for date-based queries
db.bookings.createIndex({ paymentStatus: 1 }); // Index for payment status queries
db.bookings.createIndex({ bookingStatus: 1 }); // Index for booking status queries

// Display collection statistics
print("📊 Collection Statistics:");
print("Total Bookings: " + db.bookings.countDocuments());
print("Completed Payments: " + db.bookings.countDocuments({ paymentStatus: "completed" }));
print("Pending Payments: " + db.bookings.countDocuments({ paymentStatus: "pending" }));
print("Failed Payments: " + db.bookings.countDocuments({ paymentStatus: "failed" }));
print("Cricket Bookings: " + db.bookings.countDocuments({ sport: "Cricket" }));
print("Football Bookings: " + db.bookings.countDocuments({ sport: "Football" }));
print("Badminton Bookings: " + db.bookings.countDocuments({ sport: "Shuttle Badminton" }));

print("🎉 Bookings collection created successfully with sample data!");

// Sample queries you can use:

// 1. Find all bookings for a specific sport and date
// db.bookings.find({ sport: "Cricket", date: ISODate("2025-08-05") });

// 2. Find all bookings with pending payments
// db.bookings.find({ paymentStatus: "pending" });

// 3. Find bookings for a specific customer
// db.bookings.find({ customerEmail: "rajesh.kumar@gmail.com" });

// 4. Find all weekend bookings
// db.bookings.find({ isWeekend: true });

// 5. Find bookings within a date range
// db.bookings.find({ 
//   date: { 
//     $gte: ISODate("2025-08-05"), 
//     $lte: ISODate("2025-08-10") 
//   } 
// });

// 6. Find booked time slots for a specific sport and date
// db.bookings.find(
//   { sport: "Cricket", date: ISODate("2025-08-05") },
//   { timeSlots: 1, _id: 0 }
// );
