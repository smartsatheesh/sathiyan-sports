// Test WhatsApp URL generation with the current environment variables
console.log('Testing WhatsApp URL Generation...\n');

// Simulate the environment variable
const whatsappNumber = '919787020525'; // From .env.local

// Function to clean and format WhatsApp number
function formatWhatsAppNumber(number) {
  // Remove any non-numeric characters
  const cleaned = number.replace(/\D/g, '');
  
  // Handle different number formats
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned; // Already has country code
  } else if (cleaned.length === 10) {
    return `91${cleaned}`; // Add country code to 10-digit number
  } else if (cleaned.startsWith('919') && cleaned.length === 13) {
    return cleaned.substring(1); // Remove extra 9 if it's 919...
  }
  return cleaned;
}

// Test data
const testBookingReference = 'BK_1234567890_ABC123';
const testAmount = 500;

// Format the number
const formattedWhatsappNumber = formatWhatsAppNumber(whatsappNumber);

// Create message
const paymentMessage = `Payment request: ₹${testAmount} for booking ${testBookingReference}`;

// Generate URL
const whatsappUrl = `https://wa.me/${formattedWhatsappNumber}?text=${encodeURIComponent(paymentMessage)}`;

console.log('Test Results:');
console.log('============');
console.log('Original Number:', whatsappNumber);
console.log('Formatted Number:', formattedWhatsappNumber);
console.log('Message:', paymentMessage);
console.log('Encoded Message:', encodeURIComponent(paymentMessage));
console.log('Full URL:', whatsappUrl);
console.log('URL Length:', whatsappUrl.length);
console.log('\nValidation:');
console.log('- Number starts with 91?', formattedWhatsappNumber.startsWith('91'));
console.log('- Number length correct?', formattedWhatsappNumber.length === 12);
console.log('- URL is valid?', whatsappUrl.startsWith('https://wa.me/'));

// Test different number formats
console.log('\n\nTesting Different Number Formats:');
console.log('=================================');

const testNumbers = [
  '9787020525',      // 10 digit
  '919787020525',    // 12 digit with country code
  '9197870205259',   // 13 digit with extra 9
  '+919787020525',   // With plus sign
  '91-9787020525',   // With dash
];

testNumbers.forEach(num => {
  const formatted = formatWhatsAppNumber(num);
  console.log(`${num} -> ${formatted} (Length: ${formatted.length})`);
});
