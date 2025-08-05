// Test script for Functions and Events booking
const testFunctionsBooking = async () => {
  const bookingData = {
    sport: "Functions and Events",
    date: new Date().toISOString(),
    timeSlots: ["06:00 - 18:00 (Full Day)"],
    totalAmount: 24000, // 12 hours * 2000
    pricePerSlot: 2000,
    isWeekend: false,
    customerName: "John Doe",
    customerEmail: "john@example.com",
    customerPhone: "+91 9876543210",
    totalHours: 12,
    eventType: "Corporate Event",
    specialRequirements: "Audio/Video equipment needed for presentation",
    paymentStatus: "pending",
    bookingStatus: "pending"
  };

  try {
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Functions and Events booking created successfully!');
      console.log('Booking ID:', result.bookingId);
      console.log('Total Amount:', result.booking.totalAmount);
      console.log('Event Type:', result.booking.eventType);
      console.log('Total Hours:', result.booking.totalHours);
    } else {
      console.log('❌ Booking failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error testing booking:', error);
  }
};

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testFunctionsBooking();
} else {
  // Browser environment
  window.testFunctionsBooking = testFunctionsBooking;
}
