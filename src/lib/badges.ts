import { supabase } from "@/integrations/supabase/client";

type Score = { date: string; score: number };

const BADGES: Record<string, { title: string; description: string }> = {
  day_1: { title: "Day 1 — Started", description: "You showed up. The hardest part is done." },
  streak_3: { title: "3-Day Streak", description: "Three days at 70+ in a row." },
  streak_7: { title: "1-Week Streak", description: "Seven days at 70+ in a row." },
  streak_14: { title: "2-Week Streak", description: "Two solid weeks." },
  streak_30: { title: "30-Day Streak", description: "Habit installed." },
  perfect_day: { title: "Perfect Day", description: "Hit 100 in a single day." },
  ten_days: { title: "10 Logged Days", description: "Ten days of tracking." },
  halfway: { title: "Halfway There", description: "Day 45 of 90." },
  finisher: { title: "Finisher", description: "Completed all 90 days." },
};

function currentStreak(scores: Score[]) {
  const map = new Map(scores.map((s) => [s.date, s.score]));
  let d = new Date();
  let run = 0;
  // walk back day by day from today
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if ((map.get(key) ?? 0) >= 70) {
      run++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return run;
}

export async function maybeAwardBadges(uid: string, scores: Score[], dayNumber?: number) {
  const codes = new Set<string>();
  if (scores.length >= 1) codes.add("day_1");
  if (scores.length >= 10) codes.add("ten_days");
  if (scores.some((s) => s.score >= 100)) codes.add("perfect_day");
  const streak = currentStreak(scores);
  if (streak >= 3) codes.add("streak_3");
  if (streak >= 7) codes.add("streak_7");
  if (streak >= 14) codes.add("streak_14");
  if (streak >= 30) codes.add("streak_30");
  if (dayNumber && dayNumber >= 45) codes.add("halfway");
  if (dayNumber && dayNumber >= 90) codes.add("finisher");

  const rows = [...codes].map((code) => ({
    user_id: uid,
    code,
    title: BADGES[code].title,
    description: BADGES[code].description,
  }));
  if (!rows.length) return [];
  // Upsert ignoring duplicates via unique (user_id, code)
  const { data } = await supabase
    .from("achievements")
    .upsert(rows, { onConflict: "user_id,code", ignoreDuplicates: true })
    .select();
  return data ?? [];
}
