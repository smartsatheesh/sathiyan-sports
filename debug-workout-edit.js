// Debug script for testing workout edit API
// Run this in browser console on /coach page

async function debugWorkoutEdit() {
  console.log('🧪 Starting workout edit debug...');
  
  try {
    // First check if we can get workout edits
    console.log('📖 Testing GET /api/coach/workout-edits');
    const getResponse = await fetch('/api/coach/workout-edits');
    const getResult = await getResponse.json();
    console.log('GET Response:', getResult);
    
    // Test saving a workout edit
    console.log('💾 Testing POST /api/coach/workout-edits');
    const testWorkout = {
      type: 'Debug Test Workout',
      duration: '30 minutes',
      intensity: 'Low',
      warmup: 'Light movement',
      cooldown: 'Stretching',
      tips: 'Test workout for debugging',
      exercises: ['Test exercise 1', 'Test exercise 2']
    };
    
    const postResponse = await fetch('/api/coach/workout-edits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: new Date().toISOString(),
        workout: testWorkout,
        planId: getResult.planId
      }),
    });
    
    const postResult = await postResponse.json();
    console.log('POST Response:', postResult);
    
    if (postResult.success) {
      console.log('✅ API test PASSED - workout can be saved');
    } else {
      console.log('❌ API test FAILED:', postResult.error);
    }
    
  } catch (error) {
    console.error('❌ Debug test error:', error);
  }
}

// Make function available globally
window.debugWorkoutEdit = debugWorkoutEdit;

console.log('🧪 Debug script loaded. Run debugWorkoutEdit() to test the API.');