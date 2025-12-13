console.log('=== SUBSCRIPTION PAGE DEBUG ===');

// Check if we're in the browser
if (typeof window !== 'undefined') {
  // Browser-side debug
  console.log('🌐 Running in browser');
  console.log('🔗 Current URL:', window.location.href);
  console.log('🍪 Document cookies:', document.cookie);
  
  // Test NextAuth session
  fetch('/api/auth/session')
    .then(res => res.json())
    .then(data => {
      console.log('🔐 NextAuth Session:', data);
      
      if (data?.user) {
        console.log('✅ User is logged in:', data.user.name, data.user.email);
        
        // Now test the admin API
        console.log('📡 Testing admin API...');
        return fetch('/api/admin/subscriptions');
      } else {
        console.log('❌ No user session found');
        console.log('🔗 Redirect to login:', '/auth/login');
      }
    })
    .then(response => {
      if (response) {
        console.log('📡 Admin API response status:', response.status);
        return response.json();
      }
    })
    .then(data => {
      if (data) {
        console.log('📊 Admin API response:', data);
        if (data.subscriptions) {
          console.log('✅ Got', data.subscriptions.length, 'subscriptions');
        }
      }
    })
    .catch(error => {
      console.error('❌ Error in debug test:', error);
    });
}