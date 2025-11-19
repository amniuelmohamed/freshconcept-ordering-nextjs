import { addDays, set } from "date-fns";

export const DAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

type DeliveryOptions = {
  deliveryDays: string[];
  cutoffTime: string;
  cutoffDayOffset: number;
  now?: Date;
};

function parseCutoff(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid cutoff time format: "${time}"`);
  }

  return { hours, minutes };
}

function normalizeDayName(day: string) {
  return day.trim().toLowerCase();
}

function getDaysUntil(targetDay: number, currentDay: number) {
  // Calculate days until the target day in the current week
  // If target is today or in the past this week, move to next week
  const diff = (targetDay - currentDay + 7) % 7;
  // If it's the same day (diff === 0), we want next week's occurrence
  // If diff > 0, target is later this week
  return diff === 0 ? 7 : diff;
}

export function getNextDeliveryDate({
  deliveryDays,
  cutoffTime,
  cutoffDayOffset,
  now = new Date(),
}: DeliveryOptions): Date {
  if (!deliveryDays.length) {
    throw new Error("At least one delivery day is required.");
  }

  const { hours, minutes } = parseCutoff(cutoffTime);
  const todayIndex = now.getDay();
  
  // Normalize and convert day names to indices
  const normalizedDays = deliveryDays
    .map(normalizeDayName)
    .map((day) => {
      const index = DAY_TO_INDEX[day];
      if (typeof index !== "number") {
        throw new Error(`Unsupported delivery day: "${day}". Valid days: ${Object.keys(DAY_TO_INDEX).join(", ")}`);
      }
      return index;
    });

  // Collect all potential delivery dates in chronological order
  const potentialDates: Array<{ date: Date; cutoff: Date }> = [];

  // Try each week (up to 6 weeks ahead)
  for (let weekOffset = 0; weekOffset < 6; weekOffset += 1) {
    // Check each delivery day
    for (const deliveryIndex of normalizedDays) {
      // Calculate days until this delivery day
      const daysUntilThisWeek = getDaysUntil(deliveryIndex, todayIndex);
      const totalDaysUntil = weekOffset * 7 + daysUntilThisWeek;
      
      // Calculate the delivery date (at start of day)
      const deliveryDate = set(addDays(now, totalDaysUntil), {
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
      
      // Calculate the cutoff date/time (cutoffDayOffset days before delivery)
      const cutoffDate = addDays(deliveryDate, -cutoffDayOffset);
      const cutoffDateTime = set(cutoffDate, {
        hours,
        minutes,
        seconds: 0,
        milliseconds: 0,
      });

      potentialDates.push({ date: deliveryDate, cutoff: cutoffDateTime });
    }
  }

  // Sort by delivery date (chronological order)
  potentialDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Find the first delivery date where cutoff hasn't passed
  for (const { date, cutoff } of potentialDates) {
    // If current time is strictly before cutoff, this delivery date is valid
    // We use < instead of <= to ensure we're before the cutoff, not at the exact moment
    if (now.getTime() < cutoff.getTime()) {
      return date;
    }
  }

  throw new Error("Unable to calculate next delivery date within six weeks.");
}
