# The Coach - AI-Powered Sports & Fitness Assistant

## 🤖 Overview

"The Coach" is an advanced AI-powered personal training system that uses Google's Gemini 2.5 to create personalized 3-month training plans for athletes and fitness enthusiasts. The system includes comprehensive assessments, BMI calculations, skill evaluations, and daily WhatsApp notifications.

## 🚀 Features

### Core Functionality
- **AI-Powered Plan Generation** using Gemini 2.5
- **Comprehensive Skill Assessment** with motor skills, coordination, strength, and endurance testing
- **BMI Calculation & Health Analysis**
- **Personalized 3-Month Training Programs**
- **Interactive Calendar View** with daily workouts
- **WhatsApp Daily Notifications** with motivation messages
- **Progress Tracking & Milestone Setting**

### Smart Assessment System
- **Sport-Specific Questions** tailored to chosen sport
- **Motor Skills Evaluation** (ball control, accuracy, technique execution)
- **Coordination Testing** (balance, reaction time, multi-limb coordination)
- **Strength Assessment** (power, push-up capacity, explosive movements)
- **Endurance Evaluation** (stamina, recovery time, running capacity)

### Personalization Factors
- Age, height, weight, BMI analysis
- Sport selection (Badminton, Football, Tennis, Basketball, etc.)
- Skill level (Beginner, Intermediate, Expert)
- Training objectives (Weight Loss, Muscle Building, Endurance, etc.)
- Available time (daily/weekly hours)
- Schedule preferences and training days
- Preferred training time (morning, afternoon, evening)

## 📁 File Structure

```
src/app/
├── coach/
│   ├── page.tsx                    # Main Coach interface
│   └── calendar/
│       └── page.tsx               # Calendar view with daily workouts
├── api/
│   └── coach/
│       ├── generate-plan/
│       │   └── route.ts          # Gemini AI plan generation
│       └── notifications/
│           └── route.ts          # WhatsApp notifications
└── components/
    └── SkillAssessment.tsx       # Interactive skill assessment

public/
└── coach-test.html               # Testing interface
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install @google/generative-ai
```

### 2. Environment Configuration

Add to your `.env.local`:

```env
# Gemini AI Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Cron Job Security (for scheduled notifications)
CRON_SECRET_KEY=your_secret_cron_key_here

# WhatsApp Configuration (already configured)
WHATSAPP_METHOD=simple
NEXT_PUBLIC_WHATSAPP_PAYMENT_NUMBER=919787020525
```

### 3. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env.local` file
4. Restart your development server

## 🧪 Testing

### 1. Quick Test Interface

Visit: `http://localhost:3000/coach-test.html`

Features:
- **AI Plan Generation Test** with sample data
- **WhatsApp Notification Test** 
- **Configuration Status Check**
- **Direct links to Coach pages**

### 2. Full Coach Experience

Visit: `http://localhost:3000/coach`

Complete flow:
1. **Basic Information** (name, age, sex, email)
2. **Physical Details** (height, weight, sport, skill level)
3. **Skill Assessment** (interactive questionnaire)
4. **Schedule & Goals** (objectives, time, preferred schedule)
5. **AI Plan Generation** (personalized 3-month plan)

### 3. Calendar View

Visit: `http://localhost:3000/coach/calendar`

Features:
- **Monthly Calendar** with workout indicators
- **Daily Workout Details** with intensity levels
- **Progress Tracking** with completion markers
- **Motivational Messages** for each day
- **WhatsApp Notification Sending**

## 🤖 AI Prompt Engineering

The system uses a sophisticated prompt structure for Gemini 2.5:

### Input Data Processing
```javascript
// Calculate derived metrics
const age = calculateAge(dateOfBirth);
const { bmi, category } = calculateBMI(height, weight);
const activeDays = Object.values(schedule).filter(Boolean).length;
```

### Prompt Structure
- **Athlete Profile**: Demographics, physical stats, sport details
- **Assessment Scores**: Motor skills, coordination, strength, endurance
- **Availability**: Training time, schedule, preferences
- **Requirements**: Detailed specifications for plan structure
- **Response Format**: JSON structure for consistent parsing

### AI Response Format
```json
{
  "coachingPlan": {
    "overview": "Plan summary",
    "duration": "3 months",
    "goals": ["goal1", "goal2"],
    "months": {
      "month1": {
        "focus": "Month focus",
        "weeks": {
          "week1": {
            "days": {
              "monday": {
                "workout": "Detailed plan",
                "duration": "45 minutes",
                "intensity": "medium",
                "equipment": ["dumbbells"],
                "motivation": "Daily motivation"
              }
            }
          }
        }
      }
    },
    "nutritionGuidance": {},
    "progressTracking": {},
    "motivationalQuotes": []
  }
}
```

## 📱 WhatsApp Integration

### Daily Notifications

The system sends three types of WhatsApp notifications:

1. **Daily Workout Notifications**
```javascript
const message = `🏃‍♂️ Good Morning ${athleteName}!

🗓️ Today's Training - ${date}
💪 Workout: ${workout.name}
⏱️ Duration: ${workout.duration}
🔥 Intensity: ${workout.intensity}

🌟 Daily Motivation:
${workout.motivation}

🚀 Ready to crush today's goals?`;
```

2. **Motivation Messages**
```javascript
const motivationalQuotes = [
  "Success isn't given. It's earned! 💪",
  "Your only limit is your mind! 🧠💥",
  "Champions are made in training! 🏆"
];
```

3. **Training Reminders**
```javascript
const message = `⏰ Training Reminder
Don't forget your session today! 💪`;
```

### API Endpoints

#### Send Notification
```bash
POST /api/coach/notifications
{
  "phoneNumber": "9876543210",
  "athleteName": "John Doe",
  "type": "daily|motivation|reminder",
  "workout": {
    "name": "Cardio + Skills",
    "duration": "45 minutes",
    "intensity": "medium",
    "motivation": "Keep pushing!"
  }
}
```

#### Scheduled Notifications (Cron)
```bash
GET /api/coach/notifications?key=your_secret_key
```

## 🎯 User Journey

### Step-by-Step Flow

1. **Authentication Required**
   - User must be logged in
   - Profile data auto-populated from session

2. **Basic Information Collection**
   - Name (from session)
   - Age calculation from date of birth
   - Gender selection
   - Email confirmation

3. **Physical Assessment**
   - Height and weight input
   - Real-time BMI calculation
   - Sport selection from predefined list
   - Self-assessed skill level

4. **Comprehensive Skill Assessment**
   - 12 sport-specific questions
   - 4 categories: Motor Skills, Coordination, Strength, Endurance
   - Scoring system: 0-100 for each category
   - Progress indicator and completion tracking

5. **Goals and Schedule Setup**
   - Multiple objective selection
   - Daily/weekly time availability
   - Preferred training time
   - 7-day schedule configuration

6. **AI Plan Generation**
   - Data sent to Gemini 2.5
   - Comprehensive prompt engineering
   - JSON response parsing
   - Error handling and fallbacks

7. **Plan Presentation**
   - Overview with athlete profile
   - Assessment score visualization
   - Plan preview and download options
   - Calendar view access

8. **Calendar Integration**
   - 3-month view with navigation
   - Daily workout details
   - Progress tracking
   - WhatsApp notification triggers

## 📊 Assessment Scoring System

### Question Categories

**Motor Skills (25% weight)**
- Equipment/ball control
- Shot/hit accuracy
- Advanced technique execution

**Coordination (25% weight)**
- Balance during movement
- Reaction to fast objects
- Multi-limb coordination

**Strength (25% weight)**
- Overall physical strength
- Power in sport movements
- Push-up capacity

**Endurance (25% weight)**
- Sport-specific stamina
- Recovery between efforts
- Running capacity

### Scoring Scale
- **0-25**: Beginner level
- **26-50**: Developing level
- **51-75**: Intermediate level
- **76-100**: Advanced/Expert level

### Overall Score Calculation
```javascript
const overallScore = Math.round(
  (motorSkills + coordination + strength + endurance) / 4
);
```

## 🔄 Integration Points

### Existing System Integration

1. **Authentication System**
   - Uses NextAuth for user sessions
   - Pre-populates user data
   - Requires login for access

2. **WhatsApp Notifications**
   - Integrates with existing UnifiedWhatsAppService
   - Supports all configured methods (Twilio, Cloud API, URL, Simple)
   - Fallback to console logging

3. **Database Integration**
   - Can be extended to save plans in MongoDB
   - User preference storage
   - Progress tracking data

4. **Booking System**
   - Potential integration with court bookings
   - Training session scheduling
   - Payment integration for coaching services

## 🚀 Production Deployment

### GCP Cloud Run Configuration

1. **Environment Variables**
```yaml
env:
  - name: GEMINI_API_KEY
    value: "your_production_api_key"
  - name: WHATSAPP_METHOD
    value: "twilio"  # or "cloud" for production
  - name: CRON_SECRET_KEY
    value: "your_secure_cron_key"
```

2. **Resource Allocation**
```yaml
resources:
  limits:
    cpu: "2"
    memory: "2Gi"
  requests:
    cpu: "1"
    memory: "1Gi"
```

3. **Scheduled Notifications**
```yaml
# Cloud Scheduler job
schedule: "0 7 * * *"  # Daily at 7 AM
url: "https://your-app.run.app/api/coach/notifications?key=SECRET"
method: "GET"
```

### Security Considerations

1. **API Key Protection**
   - Store Gemini API key in Cloud Secret Manager
   - Use IAM roles for access control
   - Regular key rotation

2. **Rate Limiting**
   - Implement request limits for AI generation
   - Monitor Gemini API usage and costs
   - User-specific plan generation limits

3. **Data Privacy**
   - Secure storage of assessment data
   - User consent for data processing
   - GDPR compliance for EU users

## 📈 Monitoring & Analytics

### Key Metrics to Track

1. **Usage Metrics**
   - Number of plans generated per day
   - Assessment completion rates
   - Calendar view engagement

2. **AI Performance**
   - Gemini API response times
   - Success/failure rates
   - Cost per plan generation

3. **Notification Metrics**
   - WhatsApp delivery rates
   - User engagement with notifications
   - Notification open rates

### Error Handling

1. **Gemini API Failures**
   - Retry mechanisms
   - Fallback to simplified plans
   - User-friendly error messages

2. **WhatsApp Failures**
   - Method fallback (Twilio → URL → Simple)
   - Notification queuing
   - Delivery confirmation

## 🎉 Success Criteria

### User Experience Goals
- ✅ Complete assessment in under 10 minutes
- ✅ Generate personalized plan in under 30 seconds
- ✅ 90%+ user satisfaction with plan quality
- ✅ Daily notification engagement > 60%

### Technical Goals
- ✅ 99.9% uptime for plan generation
- ✅ Sub-5-second response times
- ✅ Successful deployment on GCP Cloud Run
- ✅ Scalable to 1000+ concurrent users

### Business Goals
- 🚀 Increase user engagement by 40%
- 🚀 Add premium coaching service revenue stream
- 🚀 Differentiate from competitors
- 🚀 Build AI-first sports platform

---

**The Coach** represents the future of personalized sports training, combining advanced AI with practical daily guidance to help athletes achieve their goals! 🏆