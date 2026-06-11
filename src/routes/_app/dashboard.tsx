import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { challengeDay, challengeProgress, gradeFor, todayISO, weekStartISO, CHALLENGE_DAYS } from "@/lib/challenge";
import { maybeAwardBadges } from "@/lib/badges";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Target, TrendingUp, Trophy, Calendar, DollarSign, TrendingDown, Wallet } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { format, startOfMonth, subDays } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard - 90-Day Life OS" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const uid = user!.id;

  const profileQ = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
      return data;
    },
  });

  const foundationQ = useQuery({
    queryKey: ["foundation", uid],
    queryFn: async () => {
      const { data } = await supabase.from("foundation").select("*").eq("user_id", uid).maybeSingle();
      return data;
    },
  });

  const scoresQ = useQuery({
    queryKey: ["scores-30", uid],
    queryFn: async () => {
      const from = format(subDays(new Date(), 29), "yyyy-MM-dd");
      const { data } = await supabase.from("scores").select("*").eq("user_id", uid).gte("score_date", from).order("score_date");
      return data ?? [];
    },
  });

  const goalsQ = useQuery({
    queryKey: ["goals", uid],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*").eq("user_id", uid).order("created_at");
      return data ?? [];
    },
  });

  const tasksQ = useQuery({
    queryKey: ["tasks-upcoming", uid],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("user_id", uid).neq("status", "completed").order("due_date", { ascending: true, nullsFirst: false }).limit(5);
      return data ?? [];
    },
  });

  const achievementsQ = useQuery({
    queryKey: ["achievements", uid],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("*").eq("user_id", uid).order("earned_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const financeQ = useQuery({
    queryKey: ["finance-dash", uid],
    queryFn: async () => {
      const { data } = await supabase.from("finance_entries" as any).select("kind,amount,entry_date").eq("user_id", uid);
      return (data ?? []) as { kind: "income" | "expense"; amount: number; entry_date: string }[];
    },
  });

  const start = profileQ.data?.challenge_start_date ?? todayISO();
  const day = challengeDay(start);
  const progress = challengeProgress(start);

  const qc = useQueryClient();
  useEffect(() => {
    if (!profileQ.data || !scoresQ.data) return;
    (async () => {
      const awarded = await maybeAwardBadges(uid, scoresQ.data!.map((s) => ({ date: s.score_date, score: s.daily_score })), day);
      if (awarded.length) {
        awarded.forEach((a) => toast.success(`🏆 Badge earned: ${a.title}`));
        qc.invalidateQueries({ queryKey: ["achievements", uid] });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQ.data?.challenge_start_date, scoresQ.data?.length]);

  const today = scoresQ.data?.find((s) => s.score_date === todayISO());
  const weekStart = weekStartISO();
  const weekScores = (scoresQ.data ?? []).filter((s) => s.score_date >= weekStart);
  const weekAvg = weekScores.length ? Math.round(weekScores.reduce((a, b) => a + b.daily_score, 0) / weekScores.length) : 0;

  const { streak, longest } = computeStreaks((scoresQ.data ?? []).map((s) => ({ date: s.score_date, score: s.daily_score })));

  const dailyChart = (scoresQ.data ?? []).map((s) => ({
    date: format(new Date(s.score_date), "MMM d"),
    score: s.daily_score,
  }));

  const radial = [
    { name: "Health", value: today?.health_score ?? 0, fill: "var(--chart-1)" },
    { name: "Career", value: today?.goals_score ?? 0, fill: "var(--chart-2)" },
    { name: "Business", value: today?.projects_score ?? 0, fill: "var(--chart-3)" },
    { name: "Learning", value: today?.learning_score ?? 0, fill: "var(--chart-4)" },
    { name: "Habits", value: today?.habits_score ?? 0, fill: "var(--chart-5)" },
  ];

  const grade = gradeFor(today?.daily_score ?? 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Day {day} of {CHALLENGE_DAYS}</div>
          <h1 className="font-display text-4xl md:text-5xl mt-1">
            {greeting()}, <span className="gradient-text italic">{profileQ.data?.display_name?.split(" ")[0] ?? "friend"}.</span>
          </h1>
          {foundationQ.data?.one_word && (
            <p className="mt-2 text-muted-foreground">
              This is the season of <span className="font-medium text-accent">{foundationQ.data.one_word}</span>.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4" /> {format(new Date(), "EEEE, MMM d")}
        </div>
      </header>

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">90-day progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={<TrendingUp className="size-4" />} label="Today" value={`${today?.daily_score ?? 0}`} sub={<span className={grade.color}>Grade {grade.grade}</span>} />
        <Stat icon={<Flame className="size-4 text-accent" />} label="Current streak" value={`${streak}`} sub="days ≥ 70" />
        <Stat icon={<Trophy className="size-4 text-accent" />} label="Longest streak" value={`${longest}`} sub="days" />
        <Stat icon={<Target className="size-4 text-primary" />} label="Goals" value={`${(goalsQ.data ?? []).length}`} sub={`${Math.round(((goalsQ.data ?? []).reduce((a, g: any) => a + (g.progress || 0), 0)) / Math.max(1, (goalsQ.data ?? []).length))}% avg progress`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Daily score (30 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChart}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="score" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Life scores - today</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="30%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={6} background />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Goals progress</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(goalsQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No goals yet. Add them in the Goals tab.</p>}
            {(goalsQ.data ?? []).map((g) => (
              <div key={g.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Target className="size-3.5 text-primary" />{g.title}</span>
                  <span className="text-muted-foreground">{g.progress}%</span>
                </div>
                <Progress value={g.progress} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(tasksQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing upcoming. Plan your next move in Projects.</p>}
            {(tasksQ.data ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border bg-card/40 px-3 py-2 text-sm">
                <span>{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.due_date ? format(new Date(t.due_date), "MMM d") : t.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent achievements</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(achievementsQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Your first badge is waiting - complete day 1.</p>}
          {(achievementsQ.data ?? []).map((a) => (
            <div key={a.id} className="rounded-full border bg-accent/10 px-3 py-1 text-xs text-accent-foreground">
              🏆 {a.title}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>{label}</span>{icon}
        </div>
        <div className="font-display text-4xl mt-2">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function computeStreaks(rows: { date: string; score: number }[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0, longest = 0, run = 0;
  for (const r of sorted) {
    if (r.score >= 70) { run++; longest = Math.max(longest, run); } else { run = 0; }
  }
  // current streak from today backward
  const today = todayISO();
  let d = today;
  const map = new Map(sorted.map((r) => [r.date, r.score]));
  while (map.has(d) && (map.get(d) ?? 0) >= 70) {
    streak++;
    d = format(subDays(new Date(d), 1), "yyyy-MM-dd");
  }
  return { streak, longest };
}
