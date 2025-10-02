import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
2. Include daily workouts for their active days
3. Focus on their sport-specific skills and general fitness
4. Address their objectives (fitness, weight loss, fun, strengthening)
5. Consider their BMI and physical condition
6. Progressive difficulty based on skill level
7. Include rest days and recovery periods
8. Provide motivational daily messages
9. Include nutrition guidance
10. Adapt to their available time constraints

RESPONSE FORMAT (JSON):
{
  "coachingPlan": {
    "overview": "Brief plan summary",
    "duration": "3 months",
    "goals": ["goal1", "goal2", "goal3"],
    "months": {
      "month1": {
        "focus": "Month 1 focus area",
        "weeks": {
          "week1": {
            "days": {
              "monday": {
                "workout": "Detailed workout plan",
                "duration": "X minutes",
                "intensity": "low/medium/high",
                "equipment": ["equipment needed"],
                "motivation": "Daily motivation message"
              }
              // ... continue for all active days
            }
          }
          // ... continue for 4 weeks
        }
      },
      "month2": { /* similar structure */ },
      "month3": { /* similar structure */ }
    },
    "nutritionGuidance": {
      "generalTips": ["tip1", "tip2"],
      "preWorkout": "Pre-workout nutrition advice",
      "postWorkout": "Post-workout nutrition advice",
      "hydration": "Hydration guidelines"
    },
    "progressTracking": {
      "weeklyAssessments": ["assessment1", "assessment2"],
      "milestones": ["milestone1", "milestone2"],
      "adjustments": "How to adjust plan based on progress"
    },
    "injuryPrevention": ["prevention tip1", "prevention tip2"],
    "motivationalQuotes": ["quote1", "quote2", "quote3"]
  }
}

Create a detailed, personalized, and engaging plan that will help ${data.name} achieve their ${data.sport} goals while considering their current fitness level and constraints.
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

    // Check Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    console.log("🏃‍♂️ The Coach: Generating personalized plan for", data.name);

    // Generate prompt
    const prompt = generatePrompt(data);

    // Call Gemini API
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
    const text = response.text();

    // Try to parse JSON response
    let coachingPlan;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        coachingPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      // Return the raw text if JSON parsing fails
      coachingPlan = {
        overview: text,
        error: "Failed to parse structured response"
      };
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