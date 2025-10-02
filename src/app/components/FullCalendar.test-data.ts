// Test data for FullCalendar component
export const mockPlanData = {
  athleteProfile: {
    name: "Test Athlete",
    age: 25,
    sport: "Football",
    skillLevel: "Intermediate"
  },
  coachingPlan: {
    months: {
      month1: {
        focus: "Building fundamental strength",
        weeks: {
          week1: {
            days: {
              monday: {
                workout: "Upper body strength training",
                duration: "60 minutes",
                intensity: "medium",
                equipment: ["dumbbells"],
                motivation: "Start strong!"
              }
            }
          }
        }
      }
    }
  },
  generatedAt: new Date().toISOString()
};

// Test data without athleteProfile (to test fallbacks)
export const mockPlanDataAlt = {
  name: "Test Athlete Alt",
  sport: "Cricket", 
  skillLevel: "Advanced",
  coachingPlan: {
    months: {
      month1: {
        focus: "Advanced technique training",
        weeks: {
          week1: {
            days: {
              tuesday: {
                workout: "Batting practice",
                duration: "90 minutes", 
                intensity: "high",
                motivation: "Perfect your technique!"
              }
            }
          }
        }
      }
    }
  },
  generatedAt: new Date().toISOString()
};