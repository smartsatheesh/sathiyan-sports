// Simple test for Functions and Events booking
const testBooking = async () => {
  const testData = {
    sport: "Functions and Events",
    date: new Date().toISOString(),
    timeSlots: ["06:00 - 18:00 (Full Day)"],
    totalAmount: 24000,
    pricePerSlot: 2000,
    isWeekend: false,
    customerName: "Test User",
    customerEmail: "test@example.com",
    customerPhone: "+91 9876543210",
    totalHours: 12,
    eventType: "Corporate Event",
    specialRequirements: "Test event requirements"
  };

  try {
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', result);
    
    if (result.success) {
      console.log('✅ Functions and Events booking test PASSED!');
      console.log('Booking ID:', result.bookingId);
    } else {
      console.log('❌ Booking test FAILED:', result.message);
    }
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
};

testBooking();
