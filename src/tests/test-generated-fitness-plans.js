// Test script for Generated Fitness Plans API
const API_BASE = 'http://localhost:3000/api';

async function testGeneratedFitnessPlans() {
  console.log('🧪 Testing Generated Fitness Plans API...\n');

  try {
    // Step 1: First ensure we have an active enrollment
    console.log('1. Creating test enrollment for fitness plan generation...');
    const enrollmentData = {
      planId: 'strength-1',
      name: 'Alex Rodriguez',
      email: 'alex.rodriguez@example.com',
      phone: '+91 9876543210',
      experience: 'intermediate',
      goals: 'Build muscle mass and improve overall strength',
      medicalConditions: 'None'
    };

    const enrollResponse = await fetch(`${API_BASE}/fitness-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrollmentData)
    });

    const enrollData = await enrollResponse.json();
    console.log('✅ Enrollment:', enrollData.success ? 'Success' : 'Failed');
    
    if (!enrollData.success) {
      console.log('❌ Cannot proceed without enrollment');
      return;
    }

    const enrollmentId = enrollData.enrollmentId;
    console.log(`   Enrollment ID: ${enrollmentId}\n`);

    // Step 2: Activate the enrollment (simulate payment completion)
    console.log('2. Activating enrollment...');
    const activateResponse = await fetch(`${API_BASE}/fitness-plans/${enrollmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'active',
        paymentStatus: 'completed'
      })
    });

    const activateData = await activateResponse.json();
    console.log('✅ Activation:', activateData.success ? 'Success' : 'Failed');
    
    if (!activateData.success) {
      console.log('❌ Cannot proceed without active enrollment');
      return;
    }

    // Step 3: Generate personalized fitness plan
    console.log('\n3. Generating personalized fitness plan...');
    const generateData = {
      enrollmentId: enrollmentId,
      fitnessGoal: 'Muscle Gain',
      fitnessLevel: 'Intermediate',
      daysPerWeek: 4,
      timePerSession: 60,
      equipmentAvailable: ['Dumbbells', 'Resistance Bands', 'Pull-up Bar'],
      medicalConditions: 'None',
      specificFocus: 'Upper body strength and muscle mass',
      planDuration: 8
    };

    const generateResponse = await fetch(`${API_BASE}/fitness-plans/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generateData)
    });

    const planData = await generateResponse.json();
    console.log('✅ Plan Generation:', planData.success ? 'Success' : 'Failed');
    
    if (planData.success) {
      console.log(`   Plan ID: ${planData.planId}`);
      console.log(`   Using AI: ${!planData.usingFallback}`);
      console.log(`   Total Weeks: ${planData.plan.totalWeeks}`);
      console.log(`   Days per Week: ${planData.plan.daysPerWeek}`);
      console.log(`   Description: ${planData.plan.planDescription?.substring(0, 100)}...`);
      
      // Display first day of first week
      if (planData.plan.weeklyPlans && planData.plan.weeklyPlans.length > 0) {
        const firstWeek = planData.plan.weeklyPlans[0];
        if (firstWeek.days && firstWeek.days.length > 0) {
          const firstDay = firstWeek.days[0];
          console.log(`\n   📋 Sample Day (${firstDay.dayName}):`);
          console.log(`      Focus: ${firstDay.workoutFocus}`);
          console.log(`      Duration: ${firstDay.estimatedDuration} minutes`);
          console.log(`      Main Exercises: ${firstDay.mainWorkout?.length || 0} exercises`);
          
          if (firstDay.mainWorkout && firstDay.mainWorkout.length > 0) {
            console.log(`      First Exercise: ${firstDay.mainWorkout[0].name}`);
            console.log(`      Sets/Reps: ${firstDay.mainWorkout[0].sets || 'N/A'}x${firstDay.mainWorkout[0].reps || 'N/A'}`);
          }
        }
      }
    } else {
      console.log(`   Error: ${planData.message}`);
    }

    // Step 4: Retrieve the generated plan
    console.log('\n4. Retrieving generated fitness plan...');
    const retrieveResponse = await fetch(`${API_BASE}/fitness-plans/generate?enrollmentId=${enrollmentId}`);
    const retrieveData = await retrieveResponse.json();
    
    console.log('✅ Plan Retrieval:', retrieveData.success ? 'Success' : 'Failed');
    if (retrieveData.success && retrieveData.plans.length > 0) {
      const plan = retrieveData.plans[0];
      console.log(`   Current Week: ${plan.currentWeek}`);
      console.log(`   Plan Status: ${plan.planStatus}`);
      console.log(`   Generated At: ${new Date(plan.generatedAt).toLocaleDateString()}`);
    }

    // Step 5: Update plan progress
    console.log('\n5. Updating plan progress (advance to week 2)...');
    const progressResponse = await fetch(`${API_BASE}/fitness-plans/generate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollmentId: enrollmentId,
        currentWeek: 2
      })
    });

    const progressData = await progressResponse.json();
    console.log('✅ Progress Update:', progressData.success ? 'Success' : 'Failed');
    if (progressData.success) {
      console.log(`   Updated to Week: ${progressData.plan.currentWeek}`);
    }

    // Step 6: Get plans by user email
    console.log('\n6. Getting all plans for user...');
    const userPlansResponse = await fetch(`${API_BASE}/fitness-plans/generate?userEmail=${enrollmentData.email}`);
    const userPlansData = await userPlansResponse.json();
    
    console.log('✅ User Plans:', userPlansData.success ? 'Success' : 'Failed');
    if (userPlansData.success) {
      console.log(`   Total Plans Found: ${userPlansData.plans.length}`);
    }

    console.log('\n🎉 All Generated Fitness Plans API tests completed!');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Test different plan configurations
async function testDifferentPlanTypes() {
  console.log('\n🎯 Testing Different Plan Types...\n');
  
  const planTypes = [
    {
      name: 'Fat Loss Beginner',
      config: {
        fitnessGoal: 'Fat Loss',
        fitnessLevel: 'Beginner',
        daysPerWeek: 3,
        timePerSession: 45,
        equipmentAvailable: [],
        planDuration: 6
      }
    },
    {
      name: 'Endurance Advanced',
      config: {
        fitnessGoal: 'Endurance',
        fitnessLevel: 'Advanced',
        daysPerWeek: 5,
        timePerSession: 75,
        equipmentAvailable: ['Treadmill', 'Bike', 'Heart Rate Monitor'],
        planDuration: 12
      }
    },
    {
      name: 'General Fitness Intermediate',
      config: {
        fitnessGoal: 'General Fitness',
        fitnessLevel: 'Intermediate',
        daysPerWeek: 4,
        timePerSession: 50,
        equipmentAvailable: ['Yoga Mat', 'Light Weights'],
        planDuration: 8
      }
    }
  ];

  for (const planType of planTypes) {
    console.log(`\n📊 Testing ${planType.name}:`);
    
    // Note: In a real test, you'd need to create enrollments for each test
    // For now, just log the configuration
    console.log(`   Goal: ${planType.config.fitnessGoal}`);
    console.log(`   Level: ${planType.config.fitnessLevel}`);
    console.log(`   Schedule: ${planType.config.daysPerWeek} days/week, ${planType.config.timePerSession} min/session`);
    console.log(`   Duration: ${planType.config.planDuration} weeks`);
    console.log(`   Equipment: ${planType.config.equipmentAvailable.length > 0 ? planType.config.equipmentAvailable.join(', ') : 'Bodyweight only'}`);
  }
}

// Run tests
if (typeof window === 'undefined') {
  // Node.js environment
  testGeneratedFitnessPlans().then(() => {
    return testDifferentPlanTypes();
  });
} else {
  // Browser environment
  console.log('🌐 Running in browser environment');
  window.testGeneratedFitnessPlans = testGeneratedFitnessPlans;
  window.testDifferentPlanTypes = testDifferentPlanTypes;
  console.log('Use testGeneratedFitnessPlans() or testDifferentPlanTypes() to run tests');
}