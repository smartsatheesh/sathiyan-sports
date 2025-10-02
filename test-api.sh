curl -X POST http://localhost:3000/api/coach/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "sex": "male",
    "dateOfBirth": "1995-01-01",
    "height": 175,
    "weight": 70,
    "sport": "football",
    "skillLevel": "intermediate",
    "objectives": ["fitness"],
    "dailyHours": 1,
    "weeklyHours": 5,
    "schedule": {
      "monday": true,
      "tuesday": true,
      "wednesday": true,
      "thursday": false,
      "friday": true,
      "saturday": false,
      "sunday": false
    },
    "preferredTime": "morning",
    "userEmail": "test@example.com",
    "motorSkillsScore": 75,
    "coordinationScore": 80,
    "strengthScore": 70,
    "enduranceScore": 85
  }'