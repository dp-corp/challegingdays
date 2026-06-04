import { useEffect } from "react";

// Schedules a browser notification at the configured hour every day while the tab is open.
// Falls back gracefully if Notifications aren't supported / permitted.
const REMINDER_HOUR = 20; // 8pm
const REMINDER_MIN = 0;

function msUntilNext(hour: number, min: number) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, min, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

const QUOTES = [
  "Small daily improvements are the key to staggering long-term results.",
  "Discipline is choosing what you want most over what you want now.",
  "Show up. Even on the days you don't feel like it.",
  "You don't rise to the level of your goals; you fall to the level of your systems.",
  "The body achieves what the mind believes.",
];

export function useDailyReminder() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (localStorage.getItem("reminders") === "off") return;

    let timer: number | undefined;
    let interval: number | undefined;

    const fire = () => {
      if (Notification.permission !== "granted") return;
      const last = localStorage.getItem("reminder_last");
      const today = new Date().toISOString().slice(0, 10);
      if (last === today) return;
      const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      new Notification("90-Day Life OS - Evening reflection", { body: quote, icon: "/favicon.ico" });
      localStorage.setItem("reminder_last", today);
    };

    const schedule = () => {
      timer = window.setTimeout(() => {
        fire();
        schedule();
      }, msUntilNext(REMINDER_HOUR, REMINDER_MIN));
    };

    schedule();
    // Backup heartbeat in case tab suspends and resumes
    interval = window.setInterval(() => {
      const h = new Date().getHours();
      if (h >= REMINDER_HOUR) fire();
    }, 5 * 60_000);

    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, []);
}
