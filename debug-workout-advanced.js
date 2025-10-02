// Enhanced debug script for testing workout edit API
async function debugWorkoutEditAdvanced() {
  console.log('🧪 Starting advanced workout edit debug...');
  
  try {
    // First, test the API directly
    console.log('📖 Testing GET /api/coach/workout-edits');
    const getResponse = await fetch('/api/coach/workout-edits');
    const getResult = await getResponse.json();
    console.log('GET Response:', getResult);
    
    if (!getResult.success) {
      console.log('❌ Cannot proceed - no plan found');
      return;
    }
    
    // Test saving a workout edit with detailed logging
    console.log('💾 Testing POST /api/coach/workout-edits');
    const testWorkout = {
      type: 'Debug Test Advanced',
      duration: '30 minutes',
      intensity: 'Low',
      warmup: 'Light movement',
      cooldown: 'Stretching',
      tips: 'Advanced test workout for debugging',
      exercises: [
        {
          name: 'Test Exercise 1',
          sets: 3,
          reps: '10',
          instructions: 'Test instructions',
          equipment: 'None',
          targetMuscles: ['Core']
        }
      ]
    };
    
    const testDate = new Date();
    console.log('📅 Test date:', testDate.toISOString());
    console.log('🎯 Test workout:', testWorkout);
    console.log('🆔 Plan ID:', getResult.planId);
    
    const startTime = Date.now();
    
    const postResponse = await fetch('/api/coach/workout-edits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: testDate.toISOString(),
        workout: testWorkout,
        planId: getResult.planId
      }),
    });
    
    const endTime = Date.now();
    console.log(`⏱️ Request took ${endTime - startTime}ms`);
    
    console.log('📡 Response status:', postResponse.status);
    console.log('📡 Response ok:', postResponse.ok);
    console.log('📡 Response headers:', [...postResponse.headers.entries()]);
    
    if (postResponse.ok) {
      const responseText = await postResponse.text();
      console.log('📄 Raw response:', responseText);
      
      try {
        const postResult = JSON.parse(responseText);
        console.log('📦 Parsed response:', postResult);
        
        if (postResult.success) {
          console.log('✅ API test PASSED - workout can be saved');
          
          // Verify the save by getting edits again
          console.log('🔄 Verifying save by fetching edits again...');
          const verifyResponse = await fetch('/api/coach/workout-edits');
          const verifyResult = await verifyResponse.json();
          console.log('🔍 Verification result:', verifyResult);
          
          const savedDate = testDate.toDateString();
          if (verifyResult.workoutEdits && verifyResult.workoutEdits[savedDate]) {
            console.log('✅ VERIFICATION PASSED - workout was saved in MongoDB');
            console.log('💾 Saved workout:', verifyResult.workoutEdits[savedDate]);
          } else {
            console.log('❌ VERIFICATION FAILED - workout not found in MongoDB');
          }
        } else {
          console.log('❌ API test FAILED:', postResult.error);
        }
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.log('📄 Response was:', responseText);
      }
    } else {
      const errorText = await postResponse.text();
      console.error('❌ HTTP Error:', postResponse.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Debug test error:', error);
  }
}

// Make function available globally
window.debugWorkoutEditAdvanced = debugWorkoutEditAdvanced;

console.log('🧪 Advanced debug script loaded. Run debugWorkoutEditAdvanced() in browser console to test.');