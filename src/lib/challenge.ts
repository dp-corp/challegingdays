import { differenceInCalendarDays, startOfWeek, format } from "date-fns";

export const CHALLENGE_DAYS = 90;

export function challengeDay(startDate: string | Date) {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const d = differenceInCalendarDays(new Date(), start) + 1;
  return Math.max(1, Math.min(CHALLENGE_DAYS, d));
}

export function challengeProgress(startDate: string | Date) {
  return Math.round((challengeDay(startDate) / CHALLENGE_DAYS) * 100);
}

export function gradeFor(score: number) {
  if (score >= 90) return { grade: "A", color: "text-success" };
  if (score >= 80) return { grade: "B", color: "text-primary" };
  if (score >= 70) return { grade: "C", color: "text-accent" };
  return { grade: "D", color: "text-destructive" };
}

export function weekStartISO(d = new Date()) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}
