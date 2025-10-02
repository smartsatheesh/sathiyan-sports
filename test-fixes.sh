#!/bin/bash

echo "🧪 Testing Gemini 2.5 Pro JSON parsing and MongoDB connection fixes..."
echo "📊 Sending test request to Coach API..."

RESPONSE=$(curl -s -X POST http://localhost:3000/api/coach/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Test",
    "sex": "male",
    "dateOfBirth": "1990-01-01",
    "height": 180,
    "weight": 75,
    "sport": "football",
    "skillLevel": "intermediate", 
    "objectives": ["fitness"],
    "dailyHours": 1,
    "weeklyHours": 5,
    "schedule": {
      "monday": true,
      "tuesday": false,
      "wednesday": true,
      "thursday": false,
      "friday": true,
      "saturday": false,
      "sunday": false
    },
    "preferredTime": "morning",
    "userEmail": "john@test.com",
    "motorSkillsScore": 70,
    "coordinationScore": 75,
    "strengthScore": 80,
    "enduranceScore": 65
  }')

echo "📄 Response received:"
echo "$RESPONSE" | head -20

# Check if response contains success field
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ API request successful!"
else
  echo "❌ API request failed"
  echo "📝 Full response:"
  echo "$RESPONSE"
fi