import { SchemaType, type Content, type ResponseSchema } from "@google/generative-ai";
import { connectToMongoose } from "@/app/server/mongodb";
import CoachPlan from "@/app/models/CoachPlan";
import { generateJson } from "@/app/lib/gemini.server";
import { COACH_QUESTIONS, CoachInputs, CoachPlanContent, ChatMessage, COACH_STEPS } from "@/app/lib/coach";

// Free-tier friendly limits per member per day
export const PLANS_PER_DAY = 3;
export const CHATS_PER_DAY = 25;

export class CoachLimitError extends Error {}

const S = SchemaType;
const stringList: ResponseSchema = { type: S.ARRAY, items: { type: S.STRING } };

export const PLAN_SCHEMA: ResponseSchema = {
  type: S.OBJECT,
  properties: {
    title: { type: S.STRING },
    summary: { type: S.STRING },
    days: {
      type: S.ARRAY,
      items: {
        type: S.OBJECT,
        properties: {
          day: { type: S.STRING },
          focus: { type: S.STRING },
          durationMinutes: { type: S.INTEGER },
          warmup: stringList,
          exercises: {
            type: S.ARRAY,
            items: {
              type: S.OBJECT,
              properties: {
                name: { type: S.STRING },
                sets: { type: S.INTEGER },
                reps: { type: S.STRING },
                duration: { type: S.STRING },
                rest: { type: S.STRING },
                tip: { type: S.STRING },
              },
              required: ["name", "tip"],
            },
          },
          cooldown: stringList,
        },
        required: ["day", "focus", "durationMinutes", "warmup", "exercises", "cooldown"],
      },
    },
    progression: stringList,
    nutrition: stringList,
    safety: stringList,
  },
  required: ["title", "summary", "days", "progression", "nutrition", "safety"],
};

export const CHAT_SCHEMA: ResponseSchema = {
  type: S.OBJECT,
  properties: {
    reply: { type: S.STRING },
    updatedPlan: PLAN_SCHEMA,
  },
  required: ["reply"],
};

export const COACH_PERSONA = `You are "Coach Sathiyan", the friendly, expert AI coach of Sathiyan Multisport Club (Madurai, India),
which offers badminton (3 indoor courts), football turf and a cricket pitch.
You design safe, practical, progressive training for kids and adults. Be warm, encouraging and specific.
Rules:
- Safety first. Age-appropriate work only: no heavy loads or max lifts for under-16s; joint-friendly options for 40+ and 60+.
- Respect injuries/limitations in the member's notes: avoid aggravating movements and offer alternatives.
- Prefer sport-specific drills (footwork, smashes, sprints, catching, batting/bowling drills) when a sport is chosen.
- Keep each session within the time available, including warm-up and cool-down.
- Use simple words. Exercise names may stay in English, everything else follows the requested language.
- Nutrition tips must be Indian-diet friendly and general (no supplements, no medical claims).
- You are not a doctor: for pain, illness or medical conditions, advise seeing a professional.`;

function label(key: keyof typeof COACH_QUESTIONS, value: string) {
  return (COACH_QUESTIONS[key].options as readonly { value: string; label: string }[]).find((o) => o.value === value)?.label || value;
}

/** Validates wizard answers against the allowed options. */
export function parseInputs(body: any): CoachInputs | null {
  const out: any = {};
  for (const key of COACH_STEPS) {
    const value = String(body?.[key] ?? "");
    const allowed = (COACH_QUESTIONS[key].options as readonly { value: string }[]).some((o) => o.value === value);
    if (!allowed) return null;
    out[key] = value;
  }
  out.notes = String(body?.notes || "").slice(0, 400);
  return out as CoachInputs;
}

function describe(inputs: CoachInputs) {
  return [
    `Goal: ${label("goal", inputs.goal)}`,
    `Sport: ${label("sport", inputs.sport)}`,
    `Age group: ${label("age", inputs.age)}`,
    `Current level: ${label("level", inputs.level)}`,
    `Training days per week: ${inputs.days}`,
    `Minutes per session: ${inputs.minutes}`,
    `Equipment: ${label("equipment", inputs.equipment)}`,
    `Language for the plan: ${inputs.language}`,
    `Injuries / notes from the member: ${inputs.notes?.trim() || "none"}`,
  ].join("\n");
}

function sanitizePlan(plan: CoachPlanContent): CoachPlanContent {
  const list = (x: unknown, n: number) => (Array.isArray(x) ? x.map(String).slice(0, n) : []);
  return {
    title: String(plan.title || "Your training plan").slice(0, 120),
    summary: String(plan.summary || "").slice(0, 800),
    days: (Array.isArray(plan.days) ? plan.days : []).slice(0, 7).map((d) => ({
      day: String(d.day || ""),
      focus: String(d.focus || ""),
      durationMinutes: Number(d.durationMinutes) || 0,
      warmup: list(d.warmup, 8),
      cooldown: list(d.cooldown, 8),
      exercises: (Array.isArray(d.exercises) ? d.exercises : []).slice(0, 12).map((e) => ({
        name: String(e.name || "").slice(0, 80),
        sets: e.sets ? Number(e.sets) : undefined,
        reps: e.reps ? String(e.reps).slice(0, 40) : undefined,
        duration: e.duration ? String(e.duration).slice(0, 40) : undefined,
        rest: e.rest ? String(e.rest).slice(0, 40) : undefined,
        tip: String(e.tip || "").slice(0, 300),
      })),
    })),
    progression: list(plan.progression, 4),
    nutrition: list(plan.nutrition, 8),
    safety: list(plan.safety, 8),
  };
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function createPlan(user: { id: string; name?: string | null; role?: string }, inputs: CoachInputs) {
  await connectToMongoose();
  const isStaff = user.role === "admin" || user.role === "coach";
  const madeToday = await (CoachPlan.countDocuments as any)({ userId: user.id, createdAt: { $gte: startOfToday() } });
  if (!isStaff && madeToday >= PLANS_PER_DAY) {
    throw new CoachLimitError(`You can create ${PLANS_PER_DAY} plans a day. Ask the coach to adjust your current plan instead!`);
  }

  const plan = await generateJson<CoachPlanContent>({
    system: COACH_PERSONA,
    schema: PLAN_SCHEMA,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Create a 4-week training plan for this member.\n${describe(inputs)}\n\n` +
              `Return exactly ${inputs.days} training days in "days" (the same week repeats for 4 weeks), ` +
              `named like "Day 1", "Day 2"... each with a clear focus, 4–8 main exercises with sets/reps or duration, rest and one coaching tip each. ` +
              `"progression" must have 4 short lines, one per week, saying how to progress. Keep the title under 8 words.`,
          },
        ],
      },
    ],
  });

  return (CoachPlan.create as any)({ userId: user.id, userName: user.name, inputs, plan: sanitizePlan(plan) });
}

/** One chat turn. The coach may return an updated plan, which replaces the stored one. */
export async function chatWithCoach(planDoc: any, message: string) {
  const today = new Date().toDateString();
  const count = planDoc.chatDay === today ? planDoc.chatCount : 0;
  if (count >= CHATS_PER_DAY) {
    throw new CoachLimitError(`That's ${CHATS_PER_DAY} questions today — great curiosity! Come back tomorrow, or talk to our coaches at the academy.`);
  }

  const history: Content[] = (planDoc.chat as ChatMessage[]).slice(-12).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

  const result = await generateJson<{ reply: string; updatedPlan?: CoachPlanContent }>({
    system:
      COACH_PERSONA +
      `\n\nThe member's details:\n${describe(planDoc.inputs)}\n\nTheir current plan (JSON):\n${JSON.stringify(planDoc.plan)}\n\n` +
      `Answer the member's question briefly (under 120 words) in ${planDoc.inputs.language}. ` +
      `Only include "updatedPlan" when they ask to change the plan (easier/harder, swap an exercise, different days, an injury); ` +
      `it must be the complete revised plan in the same structure.`,
    schema: CHAT_SCHEMA,
    contents: [...history, { role: "user", parts: [{ text: message }] }],
    temperature: 0.6,
  });

  planDoc.chat.push({ role: "user", text: message }, { role: "coach", text: String(result.reply || "").slice(0, 2000) });
  if (planDoc.chat.length > 40) planDoc.chat = planDoc.chat.slice(-40);
  planDoc.chatDay = today;
  planDoc.chatCount = count + 1;

  const planChanged = Boolean(result.updatedPlan?.days?.length);
  if (planChanged) {
    planDoc.plan = sanitizePlan(result.updatedPlan!);
    planDoc.progress = new Map(); // exercises moved, so start ticks afresh
    planDoc.markModified("plan");
  }
  await planDoc.save();
  return { reply: result.reply, planChanged };
}
