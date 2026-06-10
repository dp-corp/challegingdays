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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Flame, Pencil, Check, X, ChevronDown, Link as LinkIcon } from "lucide-react";
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

const CATEGORY_LABEL: Record<string, string> = { morning: "Morning", work: "Work", personal: "Personal", custom: "Custom", project: "Projects" };
const CATEGORY_ACCENT: Record<string, string> = {
  morning: "from-amber-400/30 to-orange-400/10",
  work: "from-primary/30 to-primary/5",
  personal: "from-emerald-400/30 to-teal-400/5",
  custom: "from-fuchsia-400/30 to-purple-400/5",
  project: "from-accent/40 to-accent/5",
};

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

  const projectsQ = useQuery({
    queryKey: ["projects", uid],
    queryFn: async () => (await supabase.from("projects").select("id,name,is_recurring").eq("user_id", uid)).data ?? [],
  });

  const logsQ = useQuery({
    queryKey: ["habit_logs", uid, date],
    queryFn: async () => (await supabase.from("habit_logs").select("*").eq("user_id", uid).eq("log_date", date)).data ?? [],
  });

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
    // optimistic
    qc.setQueryData(["habit_logs", uid, date], (prev: any) => {
      const arr = prev ?? [];
      if (completed) return [...arr.filter((l: any) => l.habit_id !== habitId), { habit_id: habitId, log_date: date, completed: true }];
      return arr.filter((l: any) => l.habit_id !== habitId);
    });
    if (completed) {
      await supabase.from("habit_logs").upsert({ user_id: uid, habit_id: habitId, log_date: date, completed: true }, { onConflict: "habit_id,log_date" });
    } else {
      await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", date);
    }
    qc.invalidateQueries({ queryKey: ["habit_logs", uid, date] });
    qc.invalidateQueries({ queryKey: ["habit_logs_30", uid] });

    const total = habitsQ.data?.length ?? 0;
    if (total > 0) {
      const { data: todayLogs } = await supabase.from("habit_logs").select("habit_id").eq("user_id", uid).eq("log_date", date);
      const done = todayLogs?.length ?? 0;
      const habitsScore = Math.round((done / total) * 100);
      await supabase.from("scores").upsert({ user_id: uid, score_date: date, habits_score: habitsScore, daily_score: habitsScore }, { onConflict: "user_id,score_date" });
      qc.invalidateQueries({ queryKey: ["scores-30", uid] });

      const { data: allScores } = await supabase.from("scores").select("score_date, daily_score").eq("user_id", uid);
      const { data: profile } = await supabase.from("profiles").select("challenge_start_date").eq("id", uid).maybeSingle();
      const dayNum = profile?.challenge_start_date ? challengeDay(profile.challenge_start_date) : undefined;
      const awarded = await maybeAwardBadges(uid, (allScores ?? []).map((s) => ({ date: s.score_date, score: s.daily_score })), dayNum);
      if (awarded.length) {
        awarded.forEach((a) => toast.success(`🏆 Badge earned: ${a.title}`));
        qc.invalidateQueries({ queryKey: ["achievements", uid] });
      }
    }
    // recompute project progress for any linked recurring project
    const habit = habitsQ.data?.find((h) => h.id === habitId);
    if (habit?.project_id) recomputeProjectProgress(habit.project_id);
  };

  const recomputeProjectProgress = async (projectId: string) => {
    const { data: project } = await supabase.from("projects").select("id,is_recurring,target_days,created_at").eq("id", projectId).maybeSingle();
    if (!project) return;
    if (project.is_recurring) {
      const { data: habits } = await supabase.from("habits").select("id").eq("project_id", projectId).eq("active", true);
      const ids = (habits ?? []).map((h) => h.id);
      if (ids.length === 0) return;
      const { data: logs } = await supabase.from("habit_logs").select("log_date").in("habit_id", ids);
      const days = new Set((logs ?? []).map((l) => l.log_date)).size;
      const pct = Math.min(100, Math.round((days / (project.target_days || 90)) * 100));
      await supabase.from("projects").update({ progress: pct }).eq("id", projectId);
      qc.invalidateQueries({ queryKey: ["projects", uid] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    }
  };

  const remove = async (id: string) => {
    await supabase.from("habits").update({ active: false }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["habits", uid] });
  };

  const rename = async (id: string, name: string) => {
    if (!name.trim()) return;
    await supabase.from("habits").update({ name: name.trim() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["habits", uid] });
    toast.success("Updated");
  };

  const linkProject = async (id: string, projectId: string | null) => {
    await supabase.from("habits").update({ project_id: projectId, category: projectId ? "project" : "custom" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["habits", uid] });
    if (projectId) recomputeProjectProgress(projectId);
  };

  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("custom");
  const [newProject, setNewProject] = useState<string>("none");
  const add = async () => {
    if (!newName) return;
    const projectId = newProject === "none" ? null : newProject;
    const category = projectId ? "project" : newCat;
    await supabase.from("habits").insert({ user_id: uid, name: newName, category, project_id: projectId });
    setNewName(""); setNewProject("none");
    qc.invalidateQueries({ queryKey: ["habits", uid] });
    if (projectId) recomputeProjectProgress(projectId);
    toast.success("Habit added");
  };

  const done = useMemo(() => new Set((logsQ.data ?? []).map((l) => l.habit_id)), [logsQ.data]);
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const h of habitsQ.data ?? []) {
      const key = h.project_id ? "project" : h.category;
      (g[key] ||= []).push(h);
    }
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

  const projectName = (id: string | null) => projectsQ.data?.find((p) => p.id === id)?.name;

  if (habitsQ.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl md:text-5xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">Daily Tracker</h1>
          <p className="mt-2 text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5">
          <CardContent className="p-4 flex items-center gap-4">
            <Flame className="size-6 text-accent animate-pulse" />
            <div>
              <div className="text-xs text-muted-foreground">Today</div>
              <div className="font-display text-2xl">{completed}/{total} • {pct}%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(["morning", "work", "personal", "project", "custom"] as const).map((cat) => (
        grouped[cat] && grouped[cat]!.length > 0 ? (
          <CategoryCard
            key={cat}
            cat={cat}
            items={grouped[cat]!}
            done={done}
            onToggle={toggle}
            onRemove={remove}
            onRename={rename}
            onLink={linkProject}
            projects={projectsQ.data ?? []}
            projectName={projectName}
            consistency30={consistency30}
          />
        ) : null
      ))}

      <Card className="border-dashed">
        <CardHeader><CardTitle className="text-base">Add habit</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]"><Input placeholder="Cold shower" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} /></div>
          <Select value={newCat} onValueChange={setNewCat}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["morning", "work", "personal", "custom"].map((v) => <SelectItem key={v} value={v}>{CATEGORY_LABEL[v]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newProject} onValueChange={setNewProject}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Link project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projectsQ.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={add}><Plus className="size-4 mr-1" />Add</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryCard({ cat, items, done, onToggle, onRemove, onRename, onLink, projects, projectName, consistency30 }: any) {
  const [open, setOpen] = useState(false);
  const completed = items.filter((h: any) => done.has(h.id)).length;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={`overflow-hidden border-l-4 bg-gradient-to-br ${CATEGORY_ACCENT[cat]}`} style={{ borderLeftColor: "var(--primary)" }}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base flex items-center gap-2">
                {CATEGORY_LABEL[cat]} ritual
                <span className="text-xs font-normal text-muted-foreground">({completed}/{items.length})</span>
              </CardTitle>
              <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 pt-0">
            {items.map((h: any) => (
              <HabitRow key={h.id} habit={h} done={done.has(h.id)} onToggle={onToggle} onRemove={onRemove} onRename={onRename} onLink={onLink} projects={projects} projectName={projectName} consistency={consistency30[h.id] ?? 0} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function HabitRow({ habit, done, onToggle, onRemove, onRename, onLink, projects, projectName, consistency }: any) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(habit.name);
  const [linking, setLinking] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card/70 px-3 py-2.5 hover:border-primary/40 hover:shadow-sm transition">
      <Checkbox checked={done} onCheckedChange={(v) => onToggle(habit.id, !!v)} />
      {editing ? (
        <>
          <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(habit.id, draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            className="h-8 flex-1" />
          <Button size="icon" variant="ghost" onClick={() => { onRename(habit.id, draft); setEditing(false); }}><Check className="size-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setDraft(habit.name); setEditing(false); }}><X className="size-4" /></Button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className={`text-sm truncate ${done ? "line-through text-muted-foreground" : ""}`}>{habit.name}</div>
            {habit.project_id && <div className="text-[10px] text-accent truncate">↳ {projectName(habit.project_id) ?? "Project"}</div>}
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{consistency}% 30d</span>
          {linking ? (
            <Select value={habit.project_id ?? "none"} onValueChange={(v) => { onLink(habit.id, v === "none" ? null : v); setLinking(false); }}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Button size="icon" variant="ghost" onClick={() => setLinking(true)} title="Link project"><LinkIcon className="size-3.5" /></Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}><Pencil className="size-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={() => onRemove(habit.id)}><Trash2 className="size-3.5" /></Button>
        </>
      )}
    </div>
  );
}
