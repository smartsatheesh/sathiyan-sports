// WhatsApp URL Debugging Tool
const testWhatsAppUrl = () => {
  console.log('🧪 Testing WhatsApp URL Generation...\n');

  const testData = {
    whatsappNumber: '9787020525',
    amount: 699,
    bookingReference: 'BK_123456_TEST',
    customerName: 'Test User',
    customerPhone: '+91 9876543210'
  };

  // Test different URL formats
  console.log('📱 Testing different WhatsApp URL formats:\n');

  // Format 1: Standard format with country code
  const formattedNumber1 = testData.whatsappNumber.startsWith('91') 
    ? testData.whatsappNumber 
    : `91${testData.whatsappNumber}`;
  
  const message1 = `Hi! Payment request for booking ${testData.bookingReference}. Amount: ₹${testData.amount}. Customer: ${testData.customerName}`;
  const url1 = `https://wa.me/${formattedNumber1}?text=${encodeURIComponent(message1)}`;
  
  console.log('1. Standard Format:');
  console.log('   Number:', formattedNumber1);
  console.log('   Message:', message1);
  console.log('   URL:', url1);
  console.log('   URL Length:', url1.length);
  console.log('');

  // Format 2: Without message (just open WhatsApp)
  const url2 = `https://wa.me/${formattedNumber1}`;
  console.log('2. Number Only:');
  console.log('   URL:', url2);
  console.log('');

  // Format 3: Alternative format with +
  const url3 = `https://wa.me/+${formattedNumber1}`;
  console.log('3. With + prefix:');
  console.log('   URL:', url3);
  console.log('');

  // Format 4: Web WhatsApp format
  const url4 = `https://web.whatsapp.com/send?phone=${formattedNumber1}&text=${encodeURIComponent(message1)}`;
  console.log('4. Web WhatsApp Format:');
  console.log('   URL:', url4);
  console.log('   URL Length:', url4.length);
  console.log('');

  // Test message encoding
  console.log('📝 Testing message encoding:\n');
  
  const specialCharsMessage = 'Test with ₹ symbols & special chars!';
  console.log('Original:', specialCharsMessage);
  console.log('Encoded:', encodeURIComponent(specialCharsMessage));
  console.log('');

  // URL validation
  console.log('✅ URL Validation:\n');
  
  try {
    const testUrl = new URL(url1);
    console.log('URL is valid:', true);
    console.log('Protocol:', testUrl.protocol);
    console.log('Host:', testUrl.host);
    console.log('Search params:', testUrl.searchParams.toString());
  } catch (error) {
    console.log('URL is valid:', false);
    console.log('Error:', error.message);
  }

  console.log('\n🔧 Troubleshooting Tips:');
  console.log('1. Try the "Number Only" URL if the full message URL fails');
  console.log('2. Ensure WhatsApp is installed on the device');
  console.log('3. On desktop, try Web WhatsApp format');
  console.log('4. Check if the message is too long (URL length limit)');
  console.log('5. Try without special characters in the message');
  
  console.log('\n🌐 Test URLs in browser:');
  console.log('Standard:', url1);
  console.log('Number only:', url2);
  console.log('Web WhatsApp:', url4);

  // Return URLs for testing
  return {
    standard: url1,
    numberOnly: url2,
    withPlus: url3,
    webWhatsApp: url4,
    formattedNumber: formattedNumber1,
    message: message1
  };
};

// Export for both Node.js and browser environments
if (typeof window !== 'undefined') {
  // Browser environment
  window.testWhatsAppUrl = testWhatsAppUrl;
  console.log('WhatsApp URL test function loaded. Run with: testWhatsAppUrl()');
} else {
  // Node.js environment
  console.log('Running WhatsApp URL test...');
  testWhatsAppUrl();
}

module.exports = { testWhatsAppUrl };
