const IST_OFFSET_MINUTES = 330;
const DAY_MS = 24 * 60 * 60 * 1000;

function extractISTDateParts(input: string | Date): { year: number; month: number; day: number } {
  if (typeof input === 'string') {
    const dateOnlyMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      return {
        year: Number(dateOnlyMatch[1]),
        month: Number(dateOnlyMatch[2]) - 1,
        day: Number(dateOnlyMatch[3]),
      };
    }
  }

  const parsedDate = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date input');
  }

  // Shift to IST and then read UTC fields to avoid server-timezone dependence.
  const shiftedToIST = new Date(parsedDate.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

  return {
    year: shiftedToIST.getUTCFullYear(),
    month: shiftedToIST.getUTCMonth(),
    day: shiftedToIST.getUTCDate(),
  };
}

export function getISTDayRange(input: string | Date): { dayStart: Date; dayEnd: Date } {
  const { year, month, day } = extractISTDateParts(input);
  const istMidnightInUtcMs = Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;

  return {
    dayStart: new Date(istMidnightInUtcMs),
    dayEnd: new Date(istMidnightInUtcMs + DAY_MS - 1),
  };
}

export function getISTDayStart(input: string | Date): Date {
  return getISTDayRange(input).dayStart;
}

export function getISTTodayStart(): Date {
  return getISTDayStart(new Date());
}

export function addDaysFromISTDayStart(input: string | Date, days: number): Date {
  const start = getISTDayStart(input);
  return new Date(start.getTime() + days * DAY_MS);
}
