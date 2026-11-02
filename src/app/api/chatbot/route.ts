import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type Content, type Part, type Tool } from '@google/generative-ai';
import { POST as createBookingRoute } from '../bookings/simple-create/route';
import { getSiteSettings } from '@/app/lib/settings.server';
import { calculateBookingPrice, courtPriceLabel, type SiteSettings } from '@/app/lib/pricing';

// Sports the chatbot can book directly (Functions & Events uses session-based durations
// and tournament registration has its own flow, so both are kept out of scope here).
const BOOKABLE_SPORTS = ['Cricket', 'Football', 'Shuttle Badminton', 'Body Zorb'] as const;
type BookableSport = (typeof BOOKABLE_SPORTS)[number];

const BADMINTON_COURTS = ['S1', 'S2', 'S3'];
const MAX_SLOTS_PER_BOOKING = 12; // 6 hours, mirrors a sane self-service upper bound

function getISTNow(): { dateStr: string; timeStr: string; weekday: string } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const timeStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(now);
  return { dateStr, timeStr, weekday };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// Builds the "HH:mm - HH:mm" 30-minute slot labels the Booking model expects (matches
// the generateTimeSlots() format used by src/app/bookslot/page.tsx).
function buildTimeSlots(startTime: string, endTime: string): { slots: string[]; error?: string } {
  const timeRe = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  const startMatch = startTime?.match(timeRe);
  const endMatch = endTime?.match(timeRe);
  if (!startMatch || !endMatch) {
    return { slots: [], error: 'Times must be in 24-hour HH:mm format, e.g. "19:00".' };
  }

  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);

  if (startMinutes % 30 !== 0 || endMinutes % 30 !== 0) {
    return { slots: [], error: 'Times must fall on the hour or half-hour, e.g. 19:00 or 19:30.' };
  }
  if (endMinutes <= startMinutes) {
    return { slots: [], error: 'End time must be after start time (same-day bookings only).' };
  }

  const slotCount = (endMinutes - startMinutes) / 30;
  if (slotCount > MAX_SLOTS_PER_BOOKING) {
    return { slots: [], error: `That's too long for one booking (max ${MAX_SLOTS_PER_BOOKING / 2} hours). Please book a shorter range.` };
  }

  const slots: string[] = [];
  for (let m = startMinutes; m < endMinutes; m += 30) {
    const sh = Math.floor(m / 60), sm = m % 60;
    const eh = Math.floor((m + 30) / 60), em = (m + 30) % 60;
    slots.push(`${pad2(sh)}:${pad2(sm)} - ${pad2(eh)}:${pad2(em)}`);
  }
  return { slots };
}

async function callCreateBooking(payload: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: any }> {
  const req = new NextRequest('http://internal.local/api/bookings/simple-create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const res = await createBookingRoute(req);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

interface BookSlotArgs {
  sport: string;
  date: string;
  startTime: string;
  endTime: string;
  court?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

async function handleBookSlot(args: BookSlotArgs): Promise<Record<string, unknown>> {
  const sport = args.sport as BookableSport;
  if (!BOOKABLE_SPORTS.includes(sport)) {
    return { success: false, message: `I can only book Cricket, Football, Shuttle Badminton or Body Zorb here. For "${args.sport}", please use /bookslot or call +91 9342090194.` };
  }
  if (!args.customerName || !args.customerEmail || !args.customerPhone) {
    return { success: false, message: 'Missing customer name, email or phone.' };
  }
  if (!/^\S+@\S+\.\S+$/.test(args.customerEmail)) {
    return { success: false, message: 'That email address looks invalid, please ask the user for a valid one.' };
  }
  if (!/^\+?\d{10,13}$/.test(args.customerPhone.replace(/[\s-]/g, ''))) {
    return { success: false, message: 'That phone number looks invalid, please ask the user for a valid 10-digit number.' };
  }

  const { slots, error } = buildTimeSlots(args.startTime, args.endTime);
  if (error) {
    return { success: false, message: error };
  }

  // simple-create recalculates the price server-side; this is only for the reply text
  const settings = await getSiteSettings();
  const totalPrice = calculateBookingPrice(settings, { sport, date: args.date, slots })?.total ?? 0;

  const basePayload = {
    sport,
    date: args.date,
    timeSlots: slots,
    customerInfo: {
      name: args.customerName,
      email: args.customerEmail,
      phone: args.customerPhone,
    },
    totalPrice,
  };

  if (sport === 'Shuttle Badminton') {
    const courtsToTry = args.court && BADMINTON_COURTS.includes(args.court) ? [args.court] : BADMINTON_COURTS;
    let lastFailure: any = null;
    for (const court of courtsToTry) {
      const { ok, data } = await callCreateBooking({ ...basePayload, court });
      if (ok && data.success) {
        return { success: true, ...data.booking, message: data.message, court };
      }
      lastFailure = data;
    }
    return { success: false, message: lastFailure?.message || 'All 3 badminton courts are busy for that time slot.' };
  }

  const { ok, data } = await callCreateBooking(basePayload);
  if (ok && data.success) {
    return { success: true, ...data.booking, message: data.message };
  }
  return { success: false, message: data?.message || 'Could not create the booking, that slot may already be taken.' };
}

const SPORT_DESCRIPTIONS: Record<string, string> = {
  Cricket: 'full-size pitch, changing rooms',
  Football: 'FIFA-standard turf with floodlights',
  'Shuttle Badminton': '3 indoor wooden courts (S1, S2, S3), professional nets, rackets available',
  'Cricket Nets': 'batting and bowling practice nets (book at /bookslot and choose the number of players)',
  'Functions and Events': 'hall for 500+ guests, A/V, catering, parking. Sessions: Morning (6am-12pm), Afternoon (12pm-6pm), Evening (6pm-12am), Full day, or custom (min 3 hours)',
  'Body Zorb': 'bubble football with waterproof suits, safety gear and supervision',
};

function priceLines(settings: SiteSettings): string {
  const extras = settings.extras.map((e) => `${e.name} rental optional, ₹${e.price} each`).join('; ');
  const lines = settings.courts
    .filter((c) => c.active)
    .map((c) => {
      const price = c.weekday === c.weekend
        ? `${courtPriceLabel(c, 'weekday')}, same price every day`
        : `Weekdays ${courtPriceLabel(c, 'weekday')}; weekends and holidays ${courtPriceLabel(c, 'weekend')}`;
      const extra = ['Cricket', 'Football'].includes(c.sport) && extras ? ` ${extras}.` : '';
      return `- ${c.sport}: ${SPORT_DESCRIPTIONS[c.sport] || ''}. ${price}.${extra}`;
    });
  const upcoming = settings.holidays
    .filter((h) => h.date >= getISTNow().dateStr)
    .slice(0, 6)
    .map((h) => `${h.name} (${h.date})`)
    .join(', ');
  lines.push(`- Courts are booked in 30-minute slots; a slot costs half the hourly price.`);
  lines.push(`- Weekday cricket/football turf is sold in 2-hour blocks (pay for 1 hour, get 1 hour free), so weekday turf bookings must be 2, 4 or 6 hours. Weekend and holiday turf can be booked by the hour.`);
  if (upcoming) lines.push(`- Upcoming holidays charged at the weekend price: ${upcoming}.`);
  lines.push(`- Monthly coaching (separate from court booking prices), per person: ${settings.membership.programs
    .map((p) => (p.adultMonthly ?? p.monthly) === p.monthly
      ? `${p.name} ₹${p.monthly}/month (all ages)`
      : `${p.name} ₹${p.monthly}/month for kids, ₹${p.adultMonthly}/month for adults and veterans`)
    .join('; ')}. Coaching focuses on both physical and mental health.`);
  return lines.join('\n');
}

function buildFacilityContext(settings: SiteSettings): string {
  const { dateStr, timeStr, weekday } = getISTNow();
  return `
You are "Sathiyan Assistant", the friendly virtual help-desk for Sathiyan Sports (Sathiyan Multi Sport Club),
a multi-sport training and event venue located at Perungudi, Madurai, Tamil Nadu.

Right now it is ${weekday}, ${dateStr} (India time, ${timeStr}). Use this to resolve relative dates like
"today"/"tomorrow" into exact YYYY-MM-DD dates when calling tools.

Contact details:
- Phone / WhatsApp: +91 9342090194
- Email: info@sathiyansports.com
- WhatsApp community: https://chat.whatsapp.com/LosEvhkOJui4hrMUh4mUFV

Sports & facilities offered, with pricing (all prices in INR, "weekend" = ${settings.weekendDays.map((d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join('/')} plus public/local holidays):
${priceLines(settings)}

Other things the venue offers:
- Tournaments (badminton/table tennis brackets, league play): /tournaments
- Free AI Coach: personalised 4-week training plans (English or Tamil) for members at /coach
- Player/team registration for tournaments: /register
- Monthly membership for regular players (kids and adults): join at /register; members pay fees by UPI from /profile
- General info & contact form: /about and /contact

YOU CAN BOOK SLOTS DIRECTLY using the book_slot tool, for Cricket, Football, Shuttle Badminton and Body Zorb only.
- Cricket Nets, Functions & Events and tournament registration are NOT bookable via chat — direct users to /bookslot, /tournaments/register or a call/WhatsApp instead.
- Before calling book_slot you MUST have: sport, date, start time, end time, and the customer's name, email and phone number.
  If any of these are missing, ask the user for them first — do not call the tool until you have all of them.
- Time ranges must be on the hour or half hour (e.g. 19:00, 19:30) and same-day only (no crossing midnight).
- If the user gives a time without AM/PM (e.g. "7 to 9"), assume evening (PM) since that's the most common booking
  time, but always state the interpreted time back to them (e.g. "7:00 PM to 9:00 PM") so they can correct you.
- For Shuttle Badminton, if the user doesn't request a specific court (S1/S2/S3), just call the tool without a court —
  the system will automatically find and assign an available court.
- Once you have everything, call book_slot right away — don't ask for extra confirmation first.
- After the tool returns, tell the user clearly whether the booking succeeded (include the booking reference and
  total amount) or failed (explain why, e.g. slot already booked, and suggest trying another time). Mention that
  payment can be completed after the booking via UPI/cash/WhatsApp — it's pay now or pay later, flexible.

General behaviour:
- Be concise, warm and helpful. Prefer short answers (2-5 sentences) with bullet points for lists.
- Only answer questions about Sathiyan Sports — booking, pricing, sports/facilities, tournaments, coaching, contact info, and general venue FAQs.
- If asked something unrelated to the venue (e.g. general trivia, coding help, etc.), politely say you can only help with Sathiyan Sports bookings and info.
- Never invent prices, offers or policies that aren't listed above.
`.trim();
}

const BOOK_SLOT_TOOL: Tool = {
  functionDeclarations: [
    {
      name: 'book_slot',
      description: 'Creates a real, immediate booking at Sathiyan Sports for the given sport, date and time range.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          sport: { type: SchemaType.STRING, format: 'enum', enum: [...BOOKABLE_SPORTS], description: 'One of the bookable sports.' },
          date: { type: SchemaType.STRING, description: 'Booking date in YYYY-MM-DD format.' },
          startTime: { type: SchemaType.STRING, description: '24-hour start time, e.g. "19:00".' },
          endTime: { type: SchemaType.STRING, description: '24-hour end time, e.g. "21:00".' },
          court: { type: SchemaType.STRING, format: 'enum', enum: BADMINTON_COURTS, description: 'Optional court for Shuttle Badminton (S1/S2/S3); omit to auto-assign.' },
          customerName: { type: SchemaType.STRING },
          customerEmail: { type: SchemaType.STRING },
          customerPhone: { type: SchemaType.STRING },
        },
        required: ['sport', 'date', 'startTime', 'endTime', 'customerName', 'customerEmail', 'customerPhone'],
      },
    },
  ],
};

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

const MAX_HISTORY_TURNS = 12;
const MAX_TOOL_ROUNDS = 3;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Chat assistant is not configured. Please try WhatsApp/call instead.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const message: string = typeof body.message === 'string' ? body.message.trim() : '';
    const history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ success: false, error: 'Message is too long' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: buildFacilityContext(await getSiteSettings()),
      tools: [BOOK_SLOT_TOOL],
    });

    const trimmedHistory = history
      .filter((turn) => turn && (turn.role === 'user' || turn.role === 'model') && typeof turn.text === 'string')
      .slice(-MAX_HISTORY_TURNS);

    const chat = model.startChat({
      history: trimmedHistory.map((turn): Content => ({ role: turn.role, parts: [{ text: turn.text }] })),
      generationConfig: { temperature: 0.5, maxOutputTokens: 500 },
    });

    let result = await chat.sendMessage(message);
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      const responseParts: Part[] = [];
      for (const call of calls) {
        let toolResult: Record<string, unknown>;
        if (call.name === 'book_slot') {
          toolResult = await handleBookSlot(call.args as unknown as BookSlotArgs);
        } else {
          toolResult = { success: false, message: 'Unknown tool.' };
        }
        responseParts.push({ functionResponse: { name: call.name, response: toolResult } });
      }

      result = await chat.sendMessage(responseParts);
      rounds++;
    }

    const reply = result.response.text().trim();

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    return NextResponse.json(
      { success: false, error: 'Sorry, the assistant is having trouble right now. Please try again or WhatsApp us at +91 9342090194.' },
      { status: 500 }
    );
  }
}
