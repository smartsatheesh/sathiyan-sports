// AI coach: the questions we ask and the plan shape we get back. Shared by page and API.

export const COACH_QUESTIONS = {
  goal: {
    label: "What's your main goal?",
    options: [
      { value: "fitness", label: "Get fitter", emoji: "💪" },
      { value: "weight_loss", label: "Lose weight", emoji: "🔥" },
      { value: "strength", label: "Get stronger", emoji: "🏋️" },
      { value: "sport", label: "Play my sport better", emoji: "🏆" },
      { value: "kids", label: "Kids' skills & fun", emoji: "🧒" },
    ],
  },
  sport: {
    label: "Which sport?",
    options: [
      { value: "Badminton", label: "Badminton", emoji: "🏸" },
      { value: "Football", label: "Football", emoji: "⚽" },
      { value: "Cricket", label: "Cricket", emoji: "🏏" },
      { value: "General", label: "General fitness", emoji: "🏃" },
    ],
  },
  age: {
    label: "Age group?",
    options: [
      { value: "6-12", label: "6–12 yrs", emoji: "🧒" },
      { value: "13-17", label: "13–17 yrs", emoji: "🧑" },
      { value: "18-39", label: "18–39 yrs", emoji: "🙂" },
      { value: "40-59", label: "40–59 yrs", emoji: "🧔" },
      { value: "60+", label: "60+ yrs", emoji: "👴" },
    ],
  },
  level: {
    label: "How active are you now?",
    options: [
      { value: "beginner", label: "Just starting", emoji: "🌱" },
      { value: "intermediate", label: "Play/train sometimes", emoji: "🌿" },
      { value: "advanced", label: "Train regularly", emoji: "🌳" },
    ],
  },
  days: {
    label: "Days per week you can train?",
    options: [2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: `${d} days`, emoji: "📅" })),
  },
  minutes: {
    label: "Time per session?",
    options: [30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} min`, emoji: "⏱️" })),
  },
  equipment: {
    label: "What equipment do you have?",
    options: [
      { value: "none", label: "Nothing — bodyweight", emoji: "🤸" },
      { value: "basic", label: "Basic (bands, dumbbells, ball)", emoji: "🎒" },
      { value: "academy", label: "Academy courts & gym", emoji: "🏟️" },
    ],
  },
  language: {
    label: "Plan language?",
    options: [
      { value: "English", label: "English", emoji: "🇬🇧" },
      { value: "Tamil", label: "தமிழ் (Tamil)", emoji: "🇮🇳" },
    ],
  },
} as const;

export type CoachQuestionKey = keyof typeof COACH_QUESTIONS;
export const COACH_STEPS: CoachQuestionKey[] = ["goal", "sport", "age", "level", "days", "minutes", "equipment", "language"];

export interface CoachInputs {
  goal: string;
  sport: string;
  age: string;
  level: string;
  days: string;
  minutes: string;
  equipment: string;
  language: string;
  notes?: string; // injuries, preferences
}

export interface CoachExercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  rest?: string;
  tip: string;
}

export interface CoachDay {
  day: string;
  focus: string;
  durationMinutes: number;
  warmup: string[];
  exercises: CoachExercise[];
  cooldown: string[];
}

export interface CoachPlanContent {
  title: string;
  summary: string;
  days: CoachDay[];
  progression: string[]; // one line per week, weeks 1-4
  nutrition: string[];
  safety: string[];
}

export interface ChatMessage {
  role: "user" | "coach";
  text: string;
  at?: string;
}

/** Stable key for a checked-off exercise: week-dayIndex-exerciseIndex */
export const progressKey = (week: number, day: number, exercise: number) => `${week}-${day}-${exercise}`;

/** Free "how to do it" link — a YouTube search, no API key needed */
export const howToUrl = (exercise: string, sport: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to do ${exercise} ${sport === "General" ? "exercise" : sport + " training"} proper form`)}`;
