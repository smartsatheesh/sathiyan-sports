import { GoogleGenerativeAI, type Content, type ResponseSchema } from "@google/generative-ai";

// One place to call Gemini. Uses the free-tier friendly Flash model by default;
// override with GEMINI_MODEL. Responses are forced to JSON matching `schema`.

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

export class AIUnavailableError extends Error {}

export async function generateJson<T>(opts: {
  system: string;
  contents: Content[];
  schema: ResponseSchema;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AIUnavailableError("AI coach is not configured");

  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: MODEL,
    systemInstruction: opts.system,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: opts.schema,
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
    },
  });

  let text: string;
  try {
    const result = await model.generateContent({ contents: opts.contents });
    text = result.response.text();
  } catch (err: any) {
    // Invalid/revoked key or a project without Gemini access: tell the admin, not "try again"
    const status = err?.status ?? err?.response?.status;
    if (status === 401 || status === 403 || /API key not valid|PERMISSION_DENIED|API_KEY/i.test(String(err?.message))) {
      console.error("Gemini credentials rejected — set a valid GEMINI_API_KEY from aistudio.google.com");
      throw new AIUnavailableError("The AI coach isn't set up yet. Please let the academy know.");
    }
    throw err;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The coach returned an unreadable answer. Please try again.");
  }
}
