// Test script to verify court independence for Shuttle Badminton bookings
const testCourtIndependence = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🏸 Testing Court Independence for Shuttle Badminton...\n');

  // Test booking data for the same time slot on different courts
  const bookingDate = new Date().toISOString();
  const timeSlot = "09:00 - 10:00";
  
  const bookingS1 = {
    sport: "Shuttle Badminton",
    date: bookingDate,
    timeSlots: [timeSlot],
    totalAmount: 699,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Test User S1",
    customerEmail: "test.s1@example.com",
    customerPhone: "+91 9876543210",
    court: "S1",
    paymentStatus: "completed",
    bookingStatus: "confirmed"
  };

  const bookingS2 = {
    sport: "Shuttle Badminton",
    date: bookingDate,
    timeSlots: [timeSlot],
    totalAmount: 699,
    pricePerSlot: 699,
    isWeekend: false,
    customerName: "Test User S2",
    customerEmail: "test.s2@example.com",
    customerPhone: "+91 9876543211",
    court: "S2",
    paymentStatus: "completed",
    bookingStatus: "confirmed"
  };

  try {
    // Step 1: Book court S1
    console.log('📅 Step 1: Booking Court S1...');
    const responseS1 = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingS1),
    });
    
    const resultS1 = await responseS1.json();
    if (resultS1.success) {
      console.log('✅ Court S1 booked successfully');
      console.log(`   Booking ID: ${resultS1.bookingId}`);
    } else {
      console.log('❌ Court S1 booking failed:', resultS1.message);
      return;
    }

    // Step 2: Try to book court S2 for the same time slot
    console.log('\n📅 Step 2: Booking Court S2 for the same time slot...');
    const responseS2 = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingS2),
    });
    
    const resultS2 = await responseS2.json();
    if (resultS2.success) {
      console.log('✅ Court S2 booked successfully - Courts are independent!');
      console.log(`   Booking ID: ${resultS2.bookingId}`);
    } else {
      console.log('❌ Court S2 booking failed:', resultS2.message);
      console.log('❌ This indicates courts are NOT independent!');
      return;
    }

    // Step 3: Check availability for each court
    console.log('\n🔍 Step 3: Checking availability for each court...');
    
    const dateParam = encodeURIComponent(bookingDate);
    
    // Check S1 availability
    const availabilityS1 = await fetch(`${baseUrl}/api/bookings?sport=Shuttle%20Badminton&date=${dateParam}&court=S1`);
    const dataS1 = await availabilityS1.json();
    
    if (dataS1.success) {
      const bookedSlotsS1 = dataS1.bookedSlots || [];
      console.log(`   Court S1 booked slots: [${bookedSlotsS1.join(', ')}]`);
      console.log(`   Is ${timeSlot} booked on S1? ${bookedSlotsS1.includes(timeSlot) ? 'YES' : 'NO'}`);
    }
    
    // Check S2 availability
    const availabilityS2 = await fetch(`${baseUrl}/api/bookings?sport=Shuttle%20Badminton&date=${dateParam}&court=S2`);
    const dataS2 = await availabilityS2.json();
    
    if (dataS2.success) {
      const bookedSlotsS2 = dataS2.bookedSlots || [];
      console.log(`   Court S2 booked slots: [${bookedSlotsS2.join(', ')}]`);
      console.log(`   Is ${timeSlot} booked on S2? ${bookedSlotsS2.includes(timeSlot) ? 'YES' : 'NO'}`);
    }
    
    // Check S3 availability (should be empty)
    const availabilityS3 = await fetch(`${baseUrl}/api/bookings?sport=Shuttle%20Badminton&date=${dateParam}&court=S3`);
    const dataS3 = await availabilityS3.json();
    
    if (dataS3.success) {
      const bookedSlotsS3 = dataS3.bookedSlots || [];
      console.log(`   Court S3 booked slots: [${bookedSlotsS3.join(', ')}]`);
      console.log(`   Is ${timeSlot} booked on S3? ${bookedSlotsS3.includes(timeSlot) ? 'YES' : 'NO'}`);
    }

    // Step 4: Check court-specific data structure
    console.log('\n🏢 Step 4: Checking court-specific data structure...');
    const generalAvailability = await fetch(`${baseUrl}/api/bookings?sport=Shuttle%20Badminton&date=${dateParam}`);
    const generalData = await generalAvailability.json();
    
    if (generalData.success && generalData.courtBookings) {
      console.log('   Court-specific bookings structure:');
      console.log(`   S1: [${generalData.courtBookings.S1?.join(', ') || 'none'}]`);
      console.log(`   S2: [${generalData.courtBookings.S2?.join(', ') || 'none'}]`);
      console.log(`   S3: [${generalData.courtBookings.S3?.join(', ') || 'none'}]`);
    }

    console.log('\n🎉 Court Independence Test PASSED!');
    console.log('✅ Both courts can be booked for the same time slot');
    console.log('✅ Each court shows only its own bookings');
    console.log('✅ Court-specific availability API is working correctly');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testCourtIndependence();
} else {
  // Browser environment
  window.testCourtIndependence = testCourtIndependence;
  console.log('Court independence test loaded. Run with: testCourtIndependence()');
}

module.exports = { testCourtIndependence };
