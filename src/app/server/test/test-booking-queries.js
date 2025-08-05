const mongoose = require('mongoose');

// MongoDB connection string - update with your credentials
const MONGODB_URI = "mongodb://smartsatheesh16:hxyX5nHuJa1Tzgck@ac-zhkkd6w-shard-00-00.ld4gdje.mongodb.net:27017,ac-zhkkd6w-shard-00-01.ld4gdje.mongodb.net:27017,ac-zhkkd6w-shard-00-02.ld4gdje.mongodb.net:27017/SathiyanSports?ssl=true&replicaSet=atlas-12t0o1-shard-0&authSource=admin&retryWrites=true&w=majority";
// Import your Booking model (make sure the path is correct)
const Booking = require('../../models/Booking').default;

async function testBookingQueries() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('✅ Connected to MongoDB successfully!');

    // Test 1: Get all bookings
    console.log('\n📋 Test 1: Get all bookings');
    const allBookings = await Booking.find({});
    console.log(`Total bookings found: ${allBookings.length}`);

    // Test 2: Get booked slots for Cricket on 2025-08-05
    console.log('\n🏏 Test 2: Get booked slots for Cricket on 2025-08-05');
    const cricketBookings = await Booking.find({
      sport: "Cricket",
      date: {
        $gte: new Date("2025-08-05T00:00:00.000Z"),
        $lte: new Date("2025-08-05T23:59:59.999Z")
      }
    }).select('timeSlots');
    
    const bookedSlots = cricketBookings.flatMap(booking => booking.timeSlots);
    console.log('Booked time slots:', bookedSlots);

    // Test 3: Get pending payments
    console.log('\n💳 Test 3: Bookings with pending payments');
    const pendingBookings = await Booking.find({ paymentStatus: "pending" });
    console.log(`Pending bookings: ${pendingBookings.length}`);
    pendingBookings.forEach(booking => {
      console.log(`- ${booking.customerName} (${booking.sport}) - ₹${booking.totalAmount}`);
    });

    // Test 4: Get weekend bookings
    console.log('\n🎉 Test 4: Weekend bookings');
    const weekendBookings = await Booking.find({ isWeekend: true });
    console.log(`Weekend bookings: ${weekendBookings.length}`);
    weekendBookings.forEach(booking => {
      console.log(`- ${booking.sport} on ${booking.date.toDateString()} - ₹${booking.totalAmount}`);
    });

    // Test 5: Get bookings by customer email
    console.log('\n👤 Test 5: Find bookings by customer email');
    const customerBookings = await Booking.find({ customerEmail: "rajesh.kumar@gmail.com" });
    console.log(`Bookings for rajesh.kumar@gmail.com: ${customerBookings.length}`);
    
    // Test 6: Revenue statistics
    console.log('\n💰 Test 6: Revenue statistics');
    const revenueStats = await Booking.aggregate([
      { $match: { paymentStatus: "completed" } },
      {
        $group: {
          _id: "$sport",
          totalRevenue: { $sum: "$totalAmount" },
          bookingCount: { $sum: 1 }
        }
      }
    ]);
    
    console.log('Revenue by sport:');
    revenueStats.forEach(stat => {
      console.log(`- ${stat._id}: ₹${stat.totalRevenue} (${stat.bookingCount} bookings)`);
    });

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error running tests:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

// Run the test function
testBookingQueries();
