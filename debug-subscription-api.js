// Simple test to check the API response and user role
console.log('Testing admin subscriptions API...');

fetch('/api/admin/subscriptions')
  .then(response => {
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    return response.json();
  })
  .then(data => {
    console.log('API Response:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });

// Test session data
fetch('/api/auth/session')
  .then(response => response.json())
  .then(data => {
    console.log('Session data:', data);
  })
  .catch(error => {
    console.error('Session error:', error);
  });