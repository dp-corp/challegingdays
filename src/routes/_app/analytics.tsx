import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell,
} from "recharts";
import { format, subDays } from "date-fns";
import { TrendingUp, Flame, Target, Calendar } from "lucide-react";
import { todayISO } from "@/lib/challenge";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics - 90-Day Life OS" }] }),
});

function AnalyticsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const from = format(subDays(new Date(), 89), "yyyy-MM-dd");

  const scoresQ = useQuery({
    queryKey: ["scores-90", uid],
    queryFn: async () => {
      const { data } = await supabase.from("scores").select("*").eq("user_id", uid).gte("score_date", from).order("score_date");
      return data ?? [];
    },
  });
  const reviewsQ = useQuery({
    queryKey: ["reviews-analytics", uid],
    queryFn: async () => {
      const { data } = await supabase.from("weekly_reviews").select("*").eq("user_id", uid).order("week_start");
      return data ?? [];
    },
  });
  const habitsQ = useQuery({
    queryKey: ["habits", uid],
    queryFn: async () => (await supabase.from("habits").select("*").eq("user_id", uid).eq("active", true)).data ?? [],
  });
  const habitLogsQ = useQuery({
    queryKey: ["habit-logs-90", uid],
    queryFn: async () => (await supabase.from("habit_logs").select("*").eq("user_id", uid).gte("log_date", from)).data ?? [],
  });
  const goalsQ = useQuery({
    queryKey: ["goals", uid],
    queryFn: async () => (await supabase.from("goals").select("*").eq("user_id", uid)).data ?? [],
  });
  const tasksQ = useQuery({
    queryKey: ["tasks-all", uid],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("user_id", uid)).data ?? [],
  });

  const scores = scoresQ.data ?? [];
  const scoreData = scores.map((s) => ({
    date: format(new Date(s.score_date), "MMM d"),
    score: s.daily_score, habits: s.habits_score, health: s.health_score, goals: s.goals_score,
  }));
  const reviewData = (reviewsQ.data ?? []).map((r) => ({
    week: format(new Date(r.week_start), "MMM d"),
    income: Number(r.income_earned ?? 0), savings: Number(r.savings_added ?? 0),
    energy: r.energy_level ?? 0, exercise: r.exercise_days ?? 0,
  }));

  const today = scores.find((s) => s.score_date === todayISO());
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b.daily_score, 0) / scores.length) : 0;
  const best = scores.reduce((a, b) => (b.daily_score > (a?.daily_score ?? 0) ? b : a), null as any);
  const totalLogs = (habitLogsQ.data ?? []).length;
  const completedTasks = (tasksQ.data ?? []).filter((t) => t.status === "completed").length;
  const totalTasks = (tasksQ.data ?? []).length;

  // streaks
  let cur = 0, longest = 0, run = 0;
  const sorted = [...scores].sort((a, b) => a.score_date.localeCompare(b.score_date));
  for (const s of sorted) { if (s.daily_score >= 70) { run++; longest = Math.max(longest, run); } else run = 0; }
  let d = todayISO();
  const map = new Map(sorted.map((s) => [s.score_date, s.daily_score]));
  while (map.has(d) && (map.get(d) ?? 0) >= 70) {
    cur++;
    d = format(subDays(new Date(d), 1), "yyyy-MM-dd");
  }

  // life balance radar
  const radarData = [
    { area: "Habits", value: today?.habits_score ?? 0 },
    { area: "Goals", value: today?.goals_score ?? 0 },
    { area: "Projects", value: today?.projects_score ?? 0 },
    { area: "Health", value: today?.health_score ?? 0 },
    { area: "Learning", value: today?.learning_score ?? 0 },
  ];

  // weekday breakdown
  const byDay: Record<string, { sum: number; n: number }> = {};
  for (const s of scores) {
    const dn = format(new Date(s.score_date), "EEE");
    byDay[dn] = byDay[dn] ?? { sum: 0, n: 0 };
    byDay[dn].sum += s.daily_score; byDay[dn].n++;
  }
  const weekdayData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dn) => ({
    day: dn, avg: byDay[dn] ? Math.round(byDay[dn].sum / byDay[dn].n) : 0,
  }));

  // habit consistency leaderboard
  const counts: Record<string, number> = {};
  for (const l of habitLogsQ.data ?? []) counts[l.habit_id] = (counts[l.habit_id] ?? 0) + 1;
  const leaders = (habitsQ.data ?? []).map((h) => ({ name: h.name, count: counts[h.id] ?? 0 }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  // task status pie
  const statuses = ["backlog", "todo", "in_progress", "review", "completed"];
  const pieData = statuses.map((s) => ({ name: s, value: (tasksQ.data ?? []).filter((t) => t.status === s).length }))
    .filter((d) => d.value > 0);
  const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  // goal progress
  const goalChart = (goalsQ.data ?? []).map((g) => ({ name: g.title.slice(0, 18), progress: g.progress }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl">Analytics</h1>
        <p className="mt-2 text-muted-foreground">The story your data tells.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<TrendingUp className="size-4" />} label="Habit completions" value={`${totalLogs}`} sub="last 90 days" />
        <Stat icon={<Flame className="size-4 text-accent" />} label="Best streak" value={`${longest}d`} />
        <Stat icon={<Calendar className="size-4" />} label="Best day" value={best ? `${best.daily_score}` : "-"} sub={best ? format(new Date(best.score_date), "MMM d") : undefined} />
        <Stat icon={<Target className="size-4 text-primary" />} label="Tasks done" value={`${completedTasks}/${totalTasks}`} />
      </div>
      <div className="text-[10px] text-muted-foreground -mt-3">Avg score (90d): {avg}</div>

      <Card>
        <CardHeader><CardTitle>Daily score trend</CardTitle><CardDescription>Last 90 days</CardDescription></CardHeader>
        <CardContent className="h-72 sm:h-80 px-2 sm:px-6">
          <ResponsiveContainer><AreaChart data={scoreData}>
            <defs>
              <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Area type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={2} fill="url(#a1)" />
          </AreaChart></ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Life balance</CardTitle><CardDescription>Today across areas</CardDescription></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="area" stroke="var(--muted-foreground)" fontSize={11} />
              <PolarRadiusAxis stroke="var(--muted-foreground)" fontSize={10} angle={90} domain={[0, 100]} />
              <Radar dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.35} />
            </RadarChart></ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Weekday averages</CardTitle><CardDescription>When are you sharpest?</CardDescription></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><BarChart data={weekdayData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="avg" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top habit consistency</CardTitle><CardDescription>Last 90 days, completions</CardDescription></CardHeader>
          <CardContent className="h-64">
            {leaders.length === 0 ? <p className="text-sm text-muted-foreground">Log a habit to see this.</p> : (
              <ResponsiveContainer><BarChart data={leaders} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={110} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
              </BarChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Task status</CardTitle><CardDescription>All projects combined</CardDescription></CardHeader>
          <CardContent className="h-64">
            {pieData.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : (
              <ResponsiveContainer><PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
              </PieChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Goals progress</CardTitle></CardHeader>
        <CardContent className="h-64">
          {goalChart.length === 0 ? <p className="text-sm text-muted-foreground">No goals yet.</p> : (
            <ResponsiveContainer><BarChart data={goalChart}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="progress" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Financial growth</CardTitle><CardDescription>Weekly income & savings</CardDescription></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><BarChart data={reviewData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="income" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="savings" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Energy & exercise</CardTitle><CardDescription>Weekly self-report</CardDescription></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><LineChart data={reviewData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="energy" stroke="var(--chart-4)" strokeWidth={2} />
              <Line type="monotone" dataKey="exercise" stroke="var(--chart-3)" strokeWidth={2} />
            </LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          {totalLogs} habit completions logged · {scores.length} days scored · {(goalsQ.data ?? []).length} active goals
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>{label}</span>{icon}
        </div>
        <div className="font-display text-2xl mt-1.5">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
