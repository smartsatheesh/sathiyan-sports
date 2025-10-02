import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAuth, JWT } from 'google-auth-library';

// Parse service account credentials safely
let serviceAccountCredentials;
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  }
} catch (error) {
  console.warn("⚠️ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:", error);
  serviceAccountCredentials = undefined;
}

// Initialize JWT client for service account authentication
const getJWTClient = () => {
  if (!serviceAccountCredentials) return null;
  
  return new JWT({
    email: serviceAccountCredentials.client_email,
    key: serviceAccountCredentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/generative-language'
    ],
  });
};

// Custom fetch function with OAuth2 authentication for Gemini 2.5 Pro
const callGemini25Pro = async (prompt: string) => {
  const jwtClient = getJWTClient();
  if (!jwtClient) {
    throw new Error("No service account credentials available");
  }
  
  // Get access token
  await jwtClient.authorize();
  const accessToken = jwtClient.credentials.access_token;
  
  if (!accessToken) {
    throw new Error("Failed to get access token");
  }
  
  console.log("🔑 Got access token for Gemini 2.5 Pro");
  
  // Use the AI Platform API endpoint for Gemini 2.5 Pro
  const projectId = serviceAccountCredentials.project_id;
  const location = 'us-central1'; // or 'europe-west1' if you prefer
  
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-pro:generateContent`;
  
  const requestBody = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.8,
      maxOutputTokens: 8192,
    }
  };
  
  console.log("🚀 Calling Gemini 2.5 Pro via AI Platform API...");
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Gemini 2.5 Pro API Error:", response.status, errorText);
    throw new Error(`Gemini 2.5 Pro API error: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log("✅ Gemini 2.5 Pro response received");
  
  // Extract text from the response
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
  return text;
};

interface CoachingRequest {
  name: string;
  sex: 'male' | 'female' | 'other';
  dateOfBirth: string;
  height: number; // in cm
  weight: number; // in kg
  sport: string;
  skillLevel: 'beginner' | 'intermediate' | 'expert';
  objectives: string[];
  dailyHours: number;
  weeklyHours: number;
  schedule: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  preferredTime: string;
  userEmail: string;
  // Assessment results
  motorSkillsScore: number; // 0-100
  coordinationScore: number; // 0-100
  strengthScore: number; // 0-100
  enduranceScore: number; // 0-100
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function calculateBMI(height: number, weight: number): { bmi: number; category: string } {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  
  let category = '';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  
  return { bmi: Math.round(bmi * 10) / 10, category };
}

function generatePrompt(data: CoachingRequest): string {
  const age = calculateAge(data.dateOfBirth);
  const { bmi, category } = calculateBMI(data.height, data.weight);
  
  const activeDays = Object.values(data.schedule).filter(Boolean).length;
  
  return `
You are "The Coach" - an expert AI sports and fitness coach. Create a comprehensive 3-month personalized training plan.

ATHLETE PROFILE:
- Name: ${data.name}
- Age: ${age} years old
- Sex: ${data.sex}
- Height: ${data.height}cm
- Weight: ${data.weight}kg
- BMI: ${bmi} (${category})
- Sport: ${data.sport}
- Skill Level: ${data.skillLevel}
- Objectives: ${data.objectives.join(', ')}

AVAILABILITY & SCHEDULE:
- Daily Training Time: ${data.dailyHours} hours
- Weekly Training Time: ${data.weeklyHours} hours
- Active Days: ${activeDays} days per week
- Training Days: ${Object.entries(data.schedule)
    .filter(([_, active]) => active)
    .map(([day, _]) => day)
    .join(', ')}
- Preferred Time: ${data.preferredTime}

ASSESSMENT SCORES (0-100):
- Motor Skills: ${data.motorSkillsScore}/100
- Coordination: ${data.coordinationScore}/100
- Strength: ${data.strengthScore}/100
- Endurance: ${data.enduranceScore}/100

REQUIREMENTS:
1. Create a detailed 3-month progressive training plan
2. Include daily workouts for their active days with SPECIFIC EXERCISES
3. For each exercise, provide: name, sets, reps/duration, rest periods, form tips
4. Focus on their sport-specific skills and general fitness
5. Address their objectives (fitness, weight loss, fun, strengthening)
6. Consider their BMI and physical condition
7. Progressive difficulty based on skill level
8. Include rest days and recovery periods
9. Provide motivational daily messages
10. Include nutrition guidance
11. Adapt to their available time constraints
12. For cardio days: specify exact exercises (running, cycling, etc.) with duration and intensity
13. For strength days: provide specific exercises with sets, reps, and equipment needed
14. For skill days: include sport-specific drills and techniques

RESPONSE FORMAT (STRICT JSON - NO MARKDOWN):
Return ONLY a valid JSON object with this exact structure:

{
  "coachingPlan": {
    "overview": "Brief 2-3 sentence plan summary",
    "duration": "3 months",
    "weeklySchedule": {
      "week1": {
        "focus": "Foundation Building",
        "days": {
          "monday": {
            "type": "Strength Training",
            "duration": "60 minutes",
            "intensity": "Medium",
            "exercises": [
              {
                "name": "Push-ups",
                "sets": 3,
                "reps": "10-15",
                "restBetweenSets": "60 seconds",
                "instructions": "Keep body straight, lower chest to ground, push up explosively",
                "equipment": "None",
                "targetMuscles": ["Chest", "Triceps", "Core"]
              }
            ],
            "warmup": "5-10 minutes light jogging or dynamic stretching",
            "cooldown": "5-10 minutes static stretching",
            "tips": "Focus on proper form over speed"
          }
        }
      }
    },
    "goals": ["goal1", "goal2", "goal3"],
    "nutritionGuidance": {
      "generalTips": ["tip1", "tip2"],
      "preWorkout": "Brief pre-workout nutrition advice",
      "postWorkout": "Brief post-workout nutrition advice"
    },
    "progressTracking": {
      "weeklyAssessments": ["assessment1", "assessment2"],
      "milestones": ["milestone1", "milestone2"]
    },
    "injuryPrevention": ["prevention tip1", "prevention tip2"],
    "motivationalQuotes": ["quote1", "quote2"]
  }
}

IMPORTANT FORMATTING RULES:
- Return ONLY the JSON object above
- No additional text before or after the JSON
- Keep all text fields concise (under 200 characters each)
- Ensure valid JSON formatting with proper quotes and commas
- No trailing commas allowed

Create a concise, personalized plan for ${data.name} to achieve their ${data.sport} goals.
`;
}

export async function POST(req: NextRequest) {
  try {
    const data: CoachingRequest = await req.json();

    // Validate required fields
    if (!data.name || !data.dateOfBirth || !data.height || !data.weight || !data.sport) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check authentication method
    const hasServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    const hasAPIKey = process.env.GEMINI_API_KEY;
    
    if (!hasServiceAccount && !hasAPIKey) {
      return NextResponse.json(
        { error: "Neither OAuth service account nor API key configured" },
        { status: 500 }
      );
    }

    console.log("🔑 Auth method:", hasServiceAccount ? "OAuth2 Service Account (Gemini 2.5 Pro)" : "API Key");
    console.log("🏃‍♂️ The Coach: Generating personalized plan for", data.name);

    // Generate prompt
    const prompt = generatePrompt(data);

    let text: string;
    
    if (hasServiceAccount) {
      try {
        console.log("🚀 Using Gemini 2.5 Pro with OAuth2...");
        text = await callGemini25Pro(prompt);
      } catch (authError) {
        console.warn("⚠️ Gemini 2.5 Pro failed, falling back to API key method:", authError);
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("Both OAuth2 and API key methods failed");
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
        });
        const response = await result.response;
        text = response.text();
      }
    } else {
      console.log("🤖 Using API key method with Gemini 1.5 Pro");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 8192,
        },
      });
      const response = await result.response;
      text = response.text();
    }

    // Try to parse JSON response with improved error handling
    let coachingPlan;
    try {
      console.log("📄 Raw response length:", text.length);
      console.log("📄 First 500 chars:", text.substring(0, 500));
      console.log("📄 Last 500 chars:", text.substring(Math.max(0, text.length - 500)));
      
      // Clean the response text
      let cleanText = text.trim();
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      
      // Find the JSON object boundaries more carefully
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonString = cleanText.substring(jsonStart, jsonEnd + 1);
        console.log("🔍 Extracted JSON length:", jsonString.length);
        
        // Try to fix common JSON issues
        let fixedJson = jsonString
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/[\u0000-\u0019]+/g, '') // Remove control characters
          .replace(/\n/g, '\\n') // Escape newlines in strings
          .replace(/\r/g, '\\r') // Escape carriage returns
          .replace(/\t/g, '\\t'); // Escape tabs
        
        coachingPlan = JSON.parse(fixedJson);
        console.log("✅ Successfully parsed JSON response");
      } else {
        throw new Error("No valid JSON structure found in response");
      }
    } catch (parseError) {
      console.error("❌ Failed to parse Gemini response as JSON:", parseError);
      console.error("📄 Error position:", parseError.message);
      
      // Create a fallback structured response
      coachingPlan = {
        coachingPlan: {
          overview: text.substring(0, 1000) + (text.length > 1000 ? "..." : ""),
          duration: "3 months",
          goals: ["Improve fitness", "Enhance performance", "Build strength"],
          parseError: parseError.message,
          rawResponseLength: text.length
        }
      };
      console.log("🔄 Created fallback coaching plan structure");
    }

    // Calculate athlete stats
    const age = calculateAge(data.dateOfBirth);
    const { bmi, category } = calculateBMI(data.height, data.weight);

    const response_data = {
      success: true,
      athleteProfile: {
        name: data.name,
        age,
        bmi,
        bmiCategory: category,
        sport: data.sport,
        skillLevel: data.skillLevel,
        objectives: data.objectives
      },
      assessmentScores: {
        motorSkills: data.motorSkillsScore,
        coordination: data.coordinationScore,
        strength: data.strengthScore,
        endurance: data.enduranceScore,
        overall: Math.round((data.motorSkillsScore + data.coordinationScore + data.strengthScore + data.enduranceScore) / 4)
      },
      coachingPlan,
      generatedAt: new Date().toISOString(),
      planId: `coach_${data.userEmail}_${Date.now()}`
    };

    console.log("✅ The Coach: Plan generated successfully for", data.name);

    return NextResponse.json(response_data);

  } catch (error) {
    console.error("❌ The Coach API error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to generate coaching plan",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}