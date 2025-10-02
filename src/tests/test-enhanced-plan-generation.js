// Test script to verify enhanced Gemini plan generation with detailed exercises
const testEnhancedPlanGeneration = async () => {
  const testData = {
    name: "Test Athlete",
    dateOfBirth: "1995-01-01",
    sex: "Male",
    height: 175,
    weight: 70,
    sport: "Shuttle Badminton",
    skillLevel: "Intermediate",
    objectives: ["Fitness", "Strengthening"],
    dailyHours: 1.5,
    weeklyHours: 7.5,
    schedule: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    preferredTime: "Evening",
    motorSkillsScore: 75,
    coordinationScore: 80,
    strengthScore: 70,
    enduranceScore: 75
  };

  try {
    console.log('🧪 Testing enhanced plan generation...');
    
    const response = await fetch('/api/coach/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Plan generated successfully!');
      
      // Check if detailed exercises are included
      const weeklySchedule = result.coachingPlan?.weeklySchedule;
      if (weeklySchedule) {
        console.log('📋 Weekly schedule found!');
        
        // Check first week's Monday
        const week1 = weeklySchedule.week1;
        const monday = week1?.days?.monday;
        
        if (monday?.exercises && monday.exercises.length > 0) {
          console.log('💪 Detailed exercises found for Monday:');
          monday.exercises.forEach((exercise, index) => {
            console.log(`${index + 1}. ${exercise.name}: ${exercise.sets}x${exercise.reps}`);
            console.log(`   Instructions: ${exercise.instructions}`);
          });
        } else {
          console.log('⚠️ No detailed exercises found, using fallback templates');
        }
      } else {
        console.log('⚠️ No weekly schedule found in response');
      }
      
      return result;
    } else {
      console.error('❌ Failed to generate plan:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing plan generation:', error);
    return null;
  }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testEnhancedPlanGeneration };
} else {
  // Browser environment
  window.testEnhancedPlanGeneration = testEnhancedPlanGeneration;
}

console.log('🔧 Enhanced plan generation test ready. Run testEnhancedPlanGeneration() to test.');