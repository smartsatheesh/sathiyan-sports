// Test script for Gemini 2.5 Pro OAuth2 authentication
const https = require('https');

const testData = {
  name: "Test Athlete",
  sex: "male",
  dateOfBirth: "1995-06-15",
  height: 175,
  weight: 70,
  sport: "football",
  skillLevel: "intermediate",
  objectives: ["fitness", "strengthening"],
  dailyHours: 2,
  weeklyHours: 10,
  schedule: {
    monday: true,
    tuesday: false,
    wednesday: true,
    thursday: false,
    friday: true,
    saturday: true,
    sunday: false
  },
  preferredTime: "morning",
  userEmail: "test@example.com",
  motorSkillsScore: 75,
  coordinationScore: 80,
  strengthScore: 70,
  enduranceScore: 85
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/coach/generate-plan',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing Gemini 2.5 Pro OAuth2 authentication...');
console.log('📊 Sending test data to Coach API...');

const req = https.request(options, (res) => {
  console.log(`📈 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('✅ Success! Gemini 2.5 Pro is working!');
        console.log('🏃‍♂️ Athlete Profile:', response.athleteProfile);
        console.log('📊 Assessment Scores:', response.assessmentScores);
        console.log('🎯 Coaching Plan Generated:', response.coachingPlan ? 'Yes' : 'No');
        console.log('⏰ Generated At:', response.generatedAt);
        console.log('🆔 Plan ID:', response.planId);
      } else {
        console.log('❌ Error:', response.error);
        console.log('📝 Details:', response.details);
      }
    } catch (error) {
      console.log('❌ Failed to parse response:', error.message);
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();