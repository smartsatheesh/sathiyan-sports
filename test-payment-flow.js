// Test the complete booking and payment flow
const testPaymentFlow = async () => {
  try {
    console.log('🧪 Testing payment flow...');
    
    // Step 1: Create a booking
    const bookingData = {
      sport: "Cricket",
      date: new Date().toISOString(),
      timeSlots: ["10:00 AM - 11:00 AM"],
      totalAmount: 699,
      pricePerSlot: 699,
      isWeekend: false,
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerPhone: "+91 9876543210",
      paymentExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
    };

    console.log('📝 Creating booking...');
    const bookingResponse = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });

    const bookingResult = await bookingResponse.json();
    
    if (!bookingResult.success) {
      throw new Error(`Booking creation failed: ${bookingResult.message}`);
    }

    console.log('✅ Booking created:', bookingResult.bookingId);

    // Step 2: Test payment confirmation
    console.log('💳 Testing payment confirmation...');
    const paymentData = {
      paymentStatus: 'completed',
      bookingStatus: 'confirmed',
      paymentMethod: 'upi',
      upiTransactionId: 'TEST123456789'
    };

    const paymentResponse = await fetch(`http://localhost:3000/api/bookings/${bookingResult.bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });

    const paymentResult = await paymentResponse.json();
    
    if (!paymentResult.success) {
      throw new Error(`Payment confirmation failed: ${paymentResult.message}`);
    }

    console.log('✅ Payment confirmed successfully!');
    console.log('📋 Final booking status:', paymentResult.booking);

    // Step 3: Verify booking status
    console.log('🔍 Verifying booking...');
    const verifyResponse = await fetch(`http://localhost:3000/api/bookings/${bookingResult.bookingId}`);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResult.success) {
      console.log('✅ Booking verification successful!');
      console.log('Status:', verifyResult.booking.bookingStatus);
      console.log('Payment:', verifyResult.booking.paymentStatus);
      console.log('UPI Transaction ID:', verifyResult.booking.upiTransactionId);
    } else {
      throw new Error(`Booking verification failed: ${verifyResult.message}`);
    }

    console.log('🎉 All tests passed! Payment flow is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
};

// Run the test
testPaymentFlow();
