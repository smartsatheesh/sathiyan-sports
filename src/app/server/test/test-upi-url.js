// Test script to verify UPI URL generation
const generateUpiUrl = (amount, bookingId, paymentMethod = 'upi') => {
  const upiId = 'smartsatheesh7-1@okhdfcbank';
  const name = 'Smart Satheesh';
  const note = `Booking payment for Shuttle Badminton - ${bookingId}`;
  
  // Generate shorter transaction reference (max 25 characters)
  const timestamp = Date.now().toString();
  const transactionRef = `TXN${timestamp.slice(-10)}${Math.random().toString(36).substr(2, 5)}`;
  
  // Properly encode all parameters
  const params = new URLSearchParams({
    pa: upiId,                    // Payee VPA
    pn: name,                     // Payee Name
    am: amount.toString(),        // Amount
    cu: 'INR',                    // Currency
    tn: note,                     // Transaction Note
    tr: transactionRef            // Transaction Reference
  });
  
  // Use more reliable schemes
  if (paymentMethod === 'gpay') {
    return `tez://upi/pay?${params.toString()}`;
  } else {
    return `upi://pay?${params.toString()}`;
  }
};

// Test UPI URL generation
console.log('Testing UPI URL Generation:');
console.log('=============================');

const testAmount = 699;
const testBookingId = '68917c0f57722ffd1f433498';

console.log('\n1. Generic UPI URL:');
const upiUrl = generateUpiUrl(testAmount, testBookingId, 'upi');
console.log(upiUrl);

console.log('\n2. Google Pay (Tez) URL:');
const gpayUrl = generateUpiUrl(testAmount, testBookingId, 'gpay');
console.log(gpayUrl);

console.log('\n3. URL Components breakdown:');
const url = new URL(upiUrl);
console.log('Protocol:', url.protocol);
console.log('Hostname:', url.hostname);
console.log('Pathname:', url.pathname);
console.log('Search params:', url.searchParams.toString());

console.log('\n4. Individual Parameters:');
const params = new URLSearchParams(url.search);
for (const [key, value] of params) {
  console.log(`${key}: ${value}`);
}

console.log('\n5. Validation:');
console.log('- No trailing "?" found:', !upiUrl.endsWith('?'));
console.log('- Contains all required params:', 
  params.has('pa') && params.has('pn') && params.has('am') && 
  params.has('cu') && params.has('tn') && params.has('tr'));
console.log('- Transaction reference length:', params.get('tr').length, '(should be <= 25)');
