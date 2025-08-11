// Test your specific UPI URL
const testUrl = "tez://upi/pay?pa=smartsatheesh7-1%40okhdfcbank&pn=Smart%20Satheesh&am=999&cu=INR&tn=Booking%20payment%20for%20Cricket%20-%2068918018241bdf061d129615&tr=TXN43659977588amjf";

console.log('Testing your UPI URL:');
console.log('====================');
console.log('URL:', testUrl);

// Parse the URL
try {
  const url = new URL(testUrl);
  console.log('\nURL Components:');
  console.log('Protocol:', url.protocol);
  console.log('Host:', url.host);
  console.log('Pathname:', url.pathname);
  
  console.log('\nParameters:');
  const params = new URLSearchParams(url.search);
  for (const [key, value] of params) {
    console.log(`${key}: ${decodeURIComponent(value)}`);
  }
  
  console.log('\nValidation:');
  console.log('- Has all required params:', 
    params.has('pa') && params.has('pn') && params.has('am') && 
    params.has('cu') && params.has('tn') && params.has('tr'));
  console.log('- Transaction ref length:', params.get('tr')?.length || 0, '(should be <= 25)');
  console.log('- Amount is valid:', !isNaN(Number(params.get('am'))));
  
  console.log('\nCommon Issues:');
  console.log('- URLs with tez:// scheme work best on mobile devices');
  console.log('- Desktop browsers may show blank page for UPI schemes');
  console.log('- Use QR code for better compatibility');
  
} catch (error) {
  console.error('Error parsing URL:', error.message);
}

console.log('\nRecommendations:');
console.log('1. Use QR code instead of direct URL');
console.log('2. Provide manual UPI ID for copying');
console.log('3. Show clear instructions for different payment methods');
