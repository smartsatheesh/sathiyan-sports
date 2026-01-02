// Script to add historical subscription data for Chezhiyan (S25951)
// Modified to run with Node.js

const https = require('https');
const http = require('http');

const addHistoricalSubscription = async () => {
  const historicalData = {
    // User details for Chezhiyan S25951
    champId: 'S25951',
    userName: 'Chezhiyan',
    userEmail: 'chezhiyan@example.com', // Update with actual email
    userMobile: '9000000000', // Update with actual mobile
    
    // Subscription details for December 2025
    subscriptionType: 'monthly',
    mode: 'fixed', // or 'flexible' based on his preference
    amount: 1199, // Adjust amount as needed
    duration: 1,
    
    // December 2025 period dates
    startDate: '2025-12-01T00:00:00.000Z',
    endDate: '2025-12-31T23:59:59.999Z',
    nextDueDate: '2025-12-31T23:59:59.999Z',
    
    // Payment details
    paymentStatus: 'Paid',
    status: 'expired', // Since it's historical data
    paymentMethod: 'Cash', // Update as needed
    transactionId: 'HIST_DEC2025_S25951',
    lastPaymentDate: '2025-12-01T00:00:00.000Z',
    
    // Historical tracking fields
    subscriptionPeriodId: 'S25951_historical_dec2025',
    isRenewal: false, // This is a historical entry
    renewalNumber: 1,
    
    // Sport preferences
    preferredSport: 'Cricket', // Update as needed
    preferredTimeSlot: '6:00 AM - 8:00 AM', // Update as needed
    selectedCourt: '', // Leave empty unless badminton
    
    // Admin notes
    notes: 'Historical subscription entry for December 2025 - Added manually for revenue tracking',
    
    autoRenewal: false,
    notificationsSent: {
      twoDaysBefore: true,
      onDueDate: true, 
      twoDaysAfter: true
    }
  };

  const postData = JSON.stringify(historicalData);
  
  // You'll need to update this URL to match your actual server
  const url = 'http://localhost:3000/api/subscriptions/create-historical'; // Update with your actual URL
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    console.log('📝 Adding historical subscription for Chezhiyan (S25951)...');
    console.log('Data to be sent:', historicalData);
    
    // Note: You'll need to update the URL and possibly add authentication
    console.log('⚠️  Please run this script in the browser console instead, as it needs access to your authenticated session.');
    console.log('Or update the URL and add proper authentication headers.');
    
  } catch (error) {
    console.error('❌ Error adding historical subscription:', error);
  }
};

// Run the function
addHistoricalSubscription();