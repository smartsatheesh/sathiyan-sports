import { GoogleGenerativeAI } from '@google/generative-ai';
import { FitnessPromptParams, IGeneratedFitnessPlan, WeeklyPlan, DailyWorkout } from '@/app/models/GeneratedFitnessPlan';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Generate a comprehensive fitness plan using Gemini AI
 */
export async function generateFitnessPlan(params: FitnessPromptParams): Promise<string> {
  const {
    fitnessGoal,
    fitnessLevel,
    daysPerWeek,
    timePerSession,
    equipmentAvailable = [],
    medicalConditions,
    specificFocus,
    planDuration = 8
  } = params;

  // Construct detailed prompt for Gemini
  const prompt = `
You are a certified fitness trainer and sports scientist. Generate a comprehensive, personalized ${planDuration}-week fitness workout plan with the following specifications:

**User Profile:**
- Fitness Goal: ${fitnessGoal}
- Experience Level: ${fitnessLevel}
- Training Days: ${daysPerWeek} days per week
- Session Duration: ${timePerSession} minutes per session
- Available Equipment: ${equipmentAvailable.length > 0 ? equipmentAvailable.join(', ') : 'Bodyweight only'}
- Medical Conditions: ${medicalConditions || 'None specified'}
- Specific Focus: ${specificFocus || 'General improvement'}

**Requirements:**
1. Create a realistic, evidence-based plan following proper rest and muscle group rotation
2. Each training day must include:
   - Warm-up routine (5-10 minutes): Dynamic stretches, light cardio
   - Main workout (${timePerSession - 15} minutes): 5-6 exercises with sets/reps/rest
   - Cool-down (5-10 minutes): Stretches, mobility work
   - 1-2 practical notes for hydration, nutrition, or recovery

3. Adjust difficulty based on fitness level:
   - Beginner: Focus on form, basic movements, longer rest periods
   - Intermediate: Moderate intensity, compound movements, varied training
   - Advanced: High intensity, complex movements, shorter rest periods

4. Plan progression: Gradually increase intensity/volume over the ${planDuration} weeks
5. Include 1-2 rest days with optional light activity (walking, yoga)

**Output Format (STRICT JSON):**
Return ONLY a valid JSON object with this exact structure:

{
  "planDescription": "Brief overview of the plan and expected outcomes",
  "totalWeeks": ${planDuration},
  "weeklyPlans": [
    {
      "weekNumber": 1,
      "weekFocus": "Foundation Building / Strength Focus / Endurance Phase (descriptive)",
      "days": [
        {
          "dayNumber": 1,
          "dayName": "Monday",
          "workoutFocus": "Push Day / Legs / Cardio / etc",
          "estimatedDuration": ${timePerSession},
          "restDay": false,
          "warmup": [
            {
              "name": "Exercise Name",
              "duration": "5-10 minutes",
              "description": "Detailed instructions",
              "difficulty": "Easy"
            }
          ],
          "mainWorkout": [
            {
              "name": "Exercise Name",
              "sets": 3,
              "reps": "8-12",
              "restTime": "60-90 seconds",
              "description": "Proper form and execution details",
              "targetMuscles": ["Chest", "Triceps"],
              "difficulty": "Moderate",
              "tips": ["Keep core engaged", "Control the negative"]
            }
          ],
          "cooldown": [
            {
              "name": "Stretch Name",
              "duration": "30 seconds",
              "description": "How to perform the stretch",
              "difficulty": "Easy"
            }
          ],
          "notes": [
            "Stay hydrated throughout the workout",
            "Focus on form over weight"
          ]
        }
      ]
    }
  ],
  "nutritionNotes": "General nutrition guidelines for the fitness goal",
  "safetyGuidelines": "Important safety considerations and injury prevention tips"
}

**Critical Instructions:**
- Return ONLY valid JSON, no markdown formatting or code blocks
- Include all ${daysPerWeek} training days per week
- Ensure muscle group rotation and adequate recovery
- Make exercises appropriate for equipment available
- Progress difficulty from week 1 to week ${planDuration}
- For ${fitnessGoal}, prioritize relevant training methods
- Consider ${fitnessLevel} limitations and capabilities
`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to ensure it's valid JSON
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return cleanedText;
  } catch (error) {
    console.error('Error generating fitness plan with Gemini:', error);
    throw new Error('Failed to generate fitness plan');
  }
}

/**
 * Parse and validate the generated fitness plan
 */
export function parseFitnessPlan(jsonString: string): any {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Basic validation
    if (!parsed.weeklyPlans || !Array.isArray(parsed.weeklyPlans)) {
      throw new Error('Invalid plan structure: missing weeklyPlans array');
    }
    
    if (!parsed.planDescription || !parsed.totalWeeks) {
      throw new Error('Invalid plan structure: missing required fields');
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing fitness plan JSON:', error);
    throw new Error('Failed to parse generated fitness plan');
  }
}

/**
 * Generate a fallback fitness plan if Gemini fails
 */
export function generateFallbackPlan(params: FitnessPromptParams): any {
  const { fitnessGoal, fitnessLevel, daysPerWeek, timePerSession, planDuration = 8 } = params;
  
  return {
    planDescription: `A ${planDuration}-week ${fitnessLevel.toLowerCase()} ${fitnessGoal.toLowerCase()} program designed for ${daysPerWeek} days per week.`,
    totalWeeks: planDuration,
    weeklyPlans: [
      {
        weekNumber: 1,
        weekFocus: "Foundation Week - Building Basic Movements",
        days: [
          {
            dayNumber: 1,
            dayName: "Monday",
            workoutFocus: "Full Body Strength",
            estimatedDuration: timePerSession,
            restDay: false,
            warmup: [
              {
                name: "Light Cardio",
                duration: "5 minutes",
                description: "Walking in place or light jogging",
                difficulty: "Easy"
              }
            ],
            mainWorkout: [
              {
                name: "Bodyweight Squats",
                sets: 3,
                reps: "10-15",
                restTime: "60 seconds",
                description: "Keep chest up, knees behind toes",
                targetMuscles: ["Legs", "Glutes"],
                difficulty: "Moderate",
                tips: ["Start slow", "Focus on form"]
              }
            ],
            cooldown: [
              {
                name: "Leg Stretches",
                duration: "5 minutes",
                description: "Hold each stretch for 30 seconds",
                difficulty: "Easy"
              }
            ],
            notes: [
              "Stay hydrated throughout",
              "Listen to your body"
            ]
          }
        ]
      }
    ],
    nutritionNotes: "Focus on balanced meals with adequate protein for your fitness goals.",
    safetyGuidelines: "Always warm up before exercising and cool down afterwards. Stop if you feel pain."
  };
}