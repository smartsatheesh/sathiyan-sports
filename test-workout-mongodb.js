// Test script to verify MongoDB workout editing functionality
const testWorkoutEditing = async () => {
  console.log('🧪 Testing MongoDB workout editing API...');
  
  try {
    // Test saving a workout edit
    const saveResponse = await fetch('/api/coach/workout-edits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: new Date().toISOString(),
        workout: {
          type: 'Test Workout',
          duration: '45 minutes',
          intensity: 'Medium',
          warmup: 'Light stretching',
          cooldown: 'Deep breathing',
          tips: 'Stay hydrated',
          exercises: ['Push-ups', 'Squats', 'Planks']
        }
      }),
    });

    const saveResult = await saveResponse.json();
    console.log('💾 Save workout result:', saveResult);

    // Test retrieving workout edits
    const getResponse = await fetch('/api/coach/workout-edits');
    const getResult = await getResponse.json();
    console.log('📖 Get workout edits result:', getResult);

    if (saveResult.success && getResult.success) {
      console.log('✅ MongoDB workout editing test PASSED');
    } else {
      console.log('❌ MongoDB workout editing test FAILED');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

// Export for use in browser console
window.testWorkoutEditing = testWorkoutEditing;

console.log('🧪 Test script loaded. Run window.testWorkoutEditing() in browser console to test.');