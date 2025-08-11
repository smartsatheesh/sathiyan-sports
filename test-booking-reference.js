// Test for booking reference fix
const testBookingReference = async () => {
  console.log('🧪 Testing Booking Reference Generation...\n');

  const bookingData = {
    sport: "Shuttle Badminton",
    date: new Date().toISOString(),
    timeSlot: "09:00 - 10:00",
    court: "S1",
    customerInfo: {
      name: "Test User",
      email: "test@example.com",
      phone: "+91 9876543210"
    },
    totalPrice: 699,
    transactionId: "TEST123456",
    paymentMethod: "gpay",
    paymentReference: "GPAY_" + Date.now()
  };

  try {
    console.log('📝 Creating booking via simple-create API...');
    const response = await fetch('http://localhost:3000/api/bookings/simple-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });

    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Booking created successfully!');
      console.log('🆔 Booking Reference:', result.booking.bookingReference);
      
      if (result.booking.bookingReference && result.booking.bookingReference !== 'undefined') {
        console.log('✅ Booking reference is properly generated!');
        console.log('✅ SUCCESS: Booking reference issue is FIXED!');
      } else {
        console.log('❌ Booking reference is still undefined or null');
        console.log('❌ FAILED: Issue not resolved');
      }
    } else {
      console.log('❌ Booking creation failed:', result.message);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Export for both Node.js and browser environments
if (typeof window === 'undefined') {
  // Node.js environment
  console.log('🧪 Running booking reference test...');
  testBookingReference();
} else {
  // Browser environment
  window.testBookingReference = testBookingReference;
  console.log('Test function loaded. Run with: testBookingReference()');
}

module.exports = { testBookingReference };
