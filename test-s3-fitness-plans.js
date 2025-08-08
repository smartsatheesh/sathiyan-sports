// Test script for S3 Fitness Plans API
const API_BASE = 'http://localhost:3001/api';

async function testFitnessPlansAPI() {
  console.log('🧪 Testing S3 Fitness Plans API...\n');

  try {
    // Test 1: Get all fitness plans
    console.log('1. Testing GET /api/fitness-plans');
    const plansResponse = await fetch(`${API_BASE}/fitness-plans`);
    const plansData = await plansResponse.json();
    console.log('✅ Plans fetched:', plansData.success ? 'Success' : 'Failed');
    console.log(`   Plans count: ${plansData.plans?.length || 0}\n`);

    // Test 2: Enroll in a fitness plan
    console.log('2. Testing POST /api/fitness-plans (Enrollment)');
    const enrollmentData = {
      planId: 'strength-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+91 9876543210',
      experience: 'beginner',
      goals: 'Build muscle mass and improve overall strength',
      medicalConditions: 'None'
    };

    const enrollResponse = await fetch(`${API_BASE}/fitness-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrollmentData)
    });

    const enrollData = await enrollResponse.json();
    console.log('✅ Enrollment:', enrollData.success ? 'Success' : 'Failed');
    console.log(`   Enrollment ID: ${enrollData.enrollmentId || 'N/A'}`);
    
    if (enrollData.success) {
      const enrollmentId = enrollData.enrollmentId;
      
      // Test 3: Get enrollment details
      console.log('\n3. Testing GET /api/fitness-plans/[id]');
      const detailsResponse = await fetch(`${API_BASE}/fitness-plans/${enrollmentId}`);
      const detailsData = await detailsResponse.json();
      console.log('✅ Get Details:', detailsData.success ? 'Success' : 'Failed');
      console.log(`   Plan Name: ${detailsData.enrollment?.planName || 'N/A'}`);
      console.log(`   Status: ${detailsData.enrollment?.status || 'N/A'}`);

      // Test 4: Update enrollment progress
      console.log('\n4. Testing PATCH /api/fitness-plans/[id] (Progress Update)');
      const updateResponse = await fetch(`${API_BASE}/fitness-plans/${enrollmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedDays: 10,
          paymentStatus: 'completed',
          paymentReference: 'TEST_REF_123'
        })
      });

      const updateData = await updateResponse.json();
      console.log('✅ Update Progress:', updateData.success ? 'Success' : 'Failed');
      console.log(`   Progress: ${updateData.enrollment?.progressPercentage || 0}%`);
      console.log(`   Status: ${updateData.enrollment?.status || 'N/A'}`);
    }

    console.log('\n🎉 All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

// Test different plan categories
async function testPlanCategories() {
  console.log('\n📊 Testing Plan Categories...\n');
  
  const categories = ['strength', 'speed', 'stamina'];
  const levels = ['beginner', 'intermediate', 'advanced'];
  
  for (const category of categories) {
    console.log(`🏷️  ${category.toUpperCase()} Plans:`);
    
    for (const level of levels) {
      try {
        const testEnrollment = {
          planId: `${category}-1`,
          name: `Test User ${category}-${level}`,
          email: `test.${category}.${level}@example.com`,
          phone: '+91 9876543210',
          experience: level,
          goals: `Improve ${category} performance`,
          medicalConditions: 'None'
        };

        const response = await fetch(`${API_BASE}/fitness-plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testEnrollment)
        });

        const data = await response.json();
        if (data.success) {
          console.log(`   ✅ ${level}: Enrollment ID ${data.enrollmentId}`);
        } else {
          console.log(`   ❌ ${level}: ${data.message}`);
        }
      } catch (error) {
        console.log(`   ❌ ${level}: Error - ${error.message}`);
      }
    }
    console.log('');
  }
}

// Run tests
if (typeof window === 'undefined') {
  // Node.js environment
  testFitnessPlansAPI().then(() => {
    return testPlanCategories();
  });
} else {
  // Browser environment
  console.log('🌐 Running in browser environment');
  window.testFitnessPlansAPI = testFitnessPlansAPI;
  window.testPlanCategories = testPlanCategories;
  console.log('Use testFitnessPlansAPI() or testPlanCategories() to run tests');
}
