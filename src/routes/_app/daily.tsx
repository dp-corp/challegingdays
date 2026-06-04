import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Flame } from "lucide-react";
import { toast } from "sonner";
import { todayISO, challengeDay } from "@/lib/challenge";
import { format, subDays } from "date-fns";
import { maybeAwardBadges } from "@/lib/badges";


export const Route = createFileRoute("/_app/daily")({
  component: DailyPage,
  head: () => ({ meta: [{ title: "Daily Tracker - 90-Day Life OS" }] }),
});

const DEFAULT_HABITS = [
  ["Wake up early", "morning"], ["Drink water", "morning"], ["Exercise", "morning"],
  ["Shower", "morning"], ["Dress well", "morning"], ["Healthy breakfast", "morning"], ["Review goals", "morning"],
  ["Deep work session", "work"], ["Complete key work task", "work"], ["Business development activity", "work"],
  ["Learning session", "work"], ["Follow-up tasks", "work"],
  ["Walking", "personal"], ["Reading", "personal"], ["Social connection", "personal"],
  ["Journal entry", "personal"], ["Sleep early", "personal"],
] as const;

const CATEGORY_LABEL: Record<string, string> = { morning: "Morning", work: "Work", personal: "Personal", custom: "Custom" };

function DailyPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const date = todayISO();

  const habitsQ = useQuery({
    queryKey: ["habits", uid],
    queryFn: async () => {
      const { data } = await supabase.from("habits").select("*").eq("user_id", uid).eq("active", true).order("category").order("sort_order");
      return data ?? [];
    },
  });

  const logsQ = useQuery({
    queryKey: ["habit_logs", uid, date],
    queryFn: async () => {
      const { data } = await supabase.from("habit_logs").select("*").eq("user_id", uid).eq("log_date", date);
      return data ?? [];
    },
  });

  // 30-day logs for consistency
  const allLogsQ = useQuery({
    queryKey: ["habit_logs_30", uid],
    queryFn: async () => {
      const from = format(subDays(new Date(), 29), "yyyy-MM-dd");
      const { data } = await supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", uid).gte("log_date", from);
      return data ?? [];
    },
  });

  // Seed defaults once
  useEffect(() => {
    (async () => {
      if (!habitsQ.data) return;
      if (habitsQ.data.length === 0) {
        const rows = DEFAULT_HABITS.map(([name, category], i) => ({ user_id: uid, name, category, sort_order: i }));
        await supabase.from("habits").insert(rows);
        qc.invalidateQueries({ queryKey: ["habits", uid] });
      }
    })();
  }, [habitsQ.data, uid, qc]);

  const toggle = async (habitId: string, completed: boolean) => {
    if (completed) {
      await supabase.from("habit_logs").upsert({ user_id: uid, habit_id: habitId, log_date: date, completed: true }, { onConflict: "habit_id,log_date" });
    } else {
      await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", date);
    }
    qc.invalidateQueries({ queryKey: ["habit_logs", uid, date] });
    qc.invalidateQueries({ queryKey: ["habit_logs_30", uid] });
    // recompute score
    const total = habitsQ.data?.length ?? 0;
    if (total > 0) {
      const { data: todayLogs } = await supabase.from("habit_logs").select("habit_id").eq("user_id", uid).eq("log_date", date);
      const done = todayLogs?.length ?? 0;
      const habitsScore = Math.round((done / total) * 100);
      await supabase.from("scores").upsert({ user_id: uid, score_date: date, habits_score: habitsScore, daily_score: habitsScore }, { onConflict: "user_id,score_date" });
      qc.invalidateQueries({ queryKey: ["scores-30", uid] });

      // Award badges
      const { data: allScores } = await supabase.from("scores").select("score_date, daily_score").eq("user_id", uid);
      const { data: profile } = await supabase.from("profiles").select("challenge_start_date").eq("id", uid).maybeSingle();
      const dayNum = profile?.challenge_start_date ? challengeDay(profile.challenge_start_date) : undefined;
      const awarded = await maybeAwardBadges(uid, (allScores ?? []).map((s) => ({ date: s.score_date, score: s.daily_score })), dayNum);
      if (awarded.length) {
        awarded.forEach((a) => toast.success(`🏆 Badge earned: ${a.title}`));
        qc.invalidateQueries({ queryKey: ["achievements", uid] });
      }
    }

  };

  const remove = async (id: string) => {
    await supabase.from("habits").update({ active: false }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["habits", uid] });
  };

  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("custom");
  const add = async () => {
    if (!newName) return;
    await supabase.from("habits").insert({ user_id: uid, name: newName, category: newCat });
    setNewName("");
    qc.invalidateQueries({ queryKey: ["habits", uid] });
  };

  const done = useMemo(() => new Set((logsQ.data ?? []).map((l) => l.habit_id)), [logsQ.data]);
  const grouped = useMemo(() => {
    const g: Record<string, typeof habitsQ.data> = {};
    for (const h of habitsQ.data ?? []) (g[h.category] ||= [] as any).push(h);
    return g;
  }, [habitsQ.data]);

  const total = habitsQ.data?.length ?? 0;
  const completed = done.size;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const consistency30 = useMemo(() => {
    if (!habitsQ.data || !allLogsQ.data || habitsQ.data.length === 0) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const l of allLogsQ.data) counts[l.habit_id] = (counts[l.habit_id] ?? 0) + 1;
    const out: Record<string, number> = {};
    for (const h of habitsQ.data) out[h.id] = Math.round(((counts[h.id] ?? 0) / 30) * 100);
    return out;
  }, [habitsQ.data, allLogsQ.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Daily Tracker</h1>
          <p className="mt-2 text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <Flame className="size-6 text-accent" />
          <div>
            <div className="text-xs text-muted-foreground">Today</div>
            <div className="font-display text-2xl">{completed}/{total} • {pct}%</div>
          </div>
        </CardContent></Card>
      </div>

      {(["morning", "work", "personal", "custom"] as const).map((cat) => (
        grouped[cat] && grouped[cat]!.length > 0 ? (
          <Card key={cat}>
            <CardHeader><CardTitle>{CATEGORY_LABEL[cat]} ritual</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {grouped[cat]!.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-lg border bg-card/40 px-3 py-2.5">
                  <Checkbox checked={done.has(h.id)} onCheckedChange={(v) => toggle(h.id, !!v)} />
                  <span className={`flex-1 text-sm ${done.has(h.id) ? "line-through text-muted-foreground" : ""}`}>{h.name}</span>
                  <span className="text-xs text-muted-foreground">{consistency30[h.id] ?? 0}% 30d</span>
                  <Button size="icon" variant="ghost" onClick={() => remove(h.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null
      ))}

      <Card>
        <CardHeader><CardTitle>Add habit</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]"><Input placeholder="Cold shower" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <Select value={newCat} onValueChange={setNewCat}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CATEGORY_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add}><Plus className="size-4 mr-1" />Add</Button>
        </CardContent>
      </Card>
    </div>
  );
}
