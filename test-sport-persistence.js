// Test script to verify sport field persistence
// Run this in browser console to test sport field

console.log('🧪 Testing Sport Field Persistence');

// Step 1: Clear all localStorage
localStorage.clear();
console.log('✅ Cleared localStorage');

// Step 2: Simulate form data with sport
const testFormData = {
  name: 'Test User',
  age: '25',
  height: 175,
  weight: 70,
  sport: 'Shuttle Badminton',
  skillLevel: 'beginner',
  weeklyHours: 5,
  goal: 'Improve fitness'
};

// Step 3: Save to localStorage
localStorage.setItem('coachFormData', JSON.stringify(testFormData));
console.log('💾 Saved test form data:', testFormData);

// Step 4: Verify it was saved
const savedData = localStorage.getItem('coachFormData');
if (savedData) {
  const parsed = JSON.parse(savedData);
  console.log('📋 Retrieved data:', parsed);
  console.log('🏃 Sport field:', parsed.sport);
} else {
  console.log('❌ No data found');
}

// Step 5: Reload page to test
console.log('🔄 Now reload the page to test if sport is pre-populated');