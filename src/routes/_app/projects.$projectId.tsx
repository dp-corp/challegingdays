import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Repeat, Flame, Link as LinkIcon, Share2, Users, UsersRound } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/DatePicker";
import { toast } from "sonner";
import { todayISO } from "@/lib/challenge";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: ProjectDetail,
});

const COLS = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "completed", label: "Completed" },
] as const;

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const today = todayISO();

  const projectQ = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await supabase.from("projects").select("*").eq("id", projectId).single()).data,
  });

  const tasksQ = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("project_id", projectId).order("created_at")).data ?? [],
  });

  const habitsQ = useQuery({
    queryKey: ["project_habits", projectId],
    queryFn: async () => (await supabase.from("habits").select("*").eq("project_id", projectId).eq("active", true).order("created_at")).data ?? [],
  });

  const habitIds = (habitsQ.data ?? []).map((h) => h.id);
  const habitLogsQ = useQuery({
    queryKey: ["project_habit_logs", projectId, habitIds.join(",")],
    queryFn: async () => {
      if (habitIds.length === 0) return [] as { habit_id: string; log_date: string; user_id: string }[];
      const from = format(subDays(new Date(), 89), "yyyy-MM-dd");
      const { data } = await supabase.from("habit_logs").select("habit_id, log_date, user_id").in("habit_id", habitIds).gte("log_date", from);
      return (data ?? []) as { habit_id: string; log_date: string; user_id: string }[];
    },
    enabled: habitIds.length > 0,
  });

  const membersQ = useQuery({
    queryKey: ["project_members_full", projectId, projectQ.data?.user_id],
    queryFn: async () => {
      const { data: members } = await supabase.from("project_members" as any).select("user_id").eq("project_id", projectId);
      const ids = [projectQ.data?.user_id, ...((members ?? []) as any).map((m: any) => m.user_id)].filter(Boolean);
      const unique = Array.from(new Set(ids));
      if (unique.length === 0) return [] as { id: string; display_name: string | null }[];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", unique);
      return (profiles ?? []).map((p: any) => ({ id: p.id, display_name: p.display_name }));
    },
    enabled: !!projectQ.data,
  });

  const isRecurring = !!projectQ.data?.is_recurring;
  const targetDays = projectQ.data?.target_days ?? 90;

  const recomputeFromTasks = async (overrides: { id: string; status: string }[] = []) => {
    const base = tasksQ.data ?? [];
    const merged = base.map((t) => {
      const o = overrides.find((x) => x.id === t.id);
      return o ? { ...t, status: o.status } : t;
    });
    const total = merged.length;
    if (!total) return;
    const done = merged.filter((t) => t.status === "completed").length;
    const progress = Math.round((done / total) * 100);
    await supabase.from("projects").update({ progress }).eq("id", projectId);
    qc.invalidateQueries({ queryKey: ["project", projectId] });
    qc.invalidateQueries({ queryKey: ["projects", uid] });
  };

  const recomputeFromHabits = async () => {
    if (habitIds.length === 0) return;
    const { data: logs } = await supabase.from("habit_logs").select("log_date").in("habit_id", habitIds);
    const days = new Set((logs ?? []).map((l) => l.log_date)).size;
    const pct = Math.min(100, Math.round((days / targetDays) * 100));
    await supabase.from("projects").update({ progress: pct }).eq("id", projectId);
    qc.invalidateQueries({ queryKey: ["project", projectId] });
    qc.invalidateQueries({ queryKey: ["projects", uid] });
  };

  // ---------- Tasks (one-off) ----------
  const [open, setOpen] = useState(false);
  const blank = { title: "", description: "", due_date: null as string | null };
  const [form, setForm] = useState(blank);

  const addTask = async () => {
    if (!form.title) return;
    await supabase.from("tasks").insert({ user_id: uid, project_id: projectId, title: form.title, description: form.description, due_date: form.due_date || null, status: "backlog" });
    setForm(blank); setOpen(false);
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    toast.success("Task added");
  };

  const move = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    await recomputeFromTasks([{ id, status }]);
  };

  const toggleDone = async (t: any) => move(t.id, t.status === "completed" ? "todo" : "completed");
  const removeTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    setTimeout(() => recomputeFromTasks(), 200);
  };

  // ---------- Habits (recurring) ----------
  const [habitName, setHabitName] = useState("");
  const addHabit = async () => {
    if (!habitName.trim()) return;
    await supabase.from("habits").insert({ user_id: uid, name: habitName.trim(), category: "project", project_id: projectId });
    setHabitName("");
    qc.invalidateQueries({ queryKey: ["project_habits", projectId] });
    qc.invalidateQueries({ queryKey: ["habits", uid] });
    toast.success("Daily item added - it now shows on your Daily Tracker too");
  };

  const removeHabit = async (id: string) => {
    await supabase.from("habits").update({ active: false }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["project_habits", projectId] });
    qc.invalidateQueries({ queryKey: ["habits", uid] });
    setTimeout(recomputeFromHabits, 200);
  };

  const toggleHabitToday = async (habitId: string, completed: boolean) => {
    if (completed) {
      await supabase.from("habit_logs").upsert({ user_id: uid, habit_id: habitId, log_date: today, completed: true }, { onConflict: "habit_id,log_date" });
    } else {
      await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", today);
    }
    qc.invalidateQueries({ queryKey: ["project_habit_logs", projectId, habitIds.join(",")] });
    qc.invalidateQueries({ queryKey: ["habit_logs", uid, today] });
    setTimeout(recomputeFromHabits, 200);
  };

  // ---------- Compute display values ----------
  const tasks = tasksQ.data ?? [];
  const habits = habitsQ.data ?? [];
  const logs = habitLogsQ.data ?? [];
  const members = membersQ.data ?? [];
  const sharedMode = !!projectQ.data?.shared_completion;
  const isOwner = projectQ.data?.user_id === uid;

  const todayLogs = useMemo(() => logs.filter((l) => l.log_date === today), [logs, today]);
  const completedToday = useMemo(() => {
    if (sharedMode) return new Set(todayLogs.map((l) => l.habit_id));
    return new Set(todayLogs.filter((l) => l.user_id === uid).map((l) => l.habit_id));
  }, [todayLogs, sharedMode, uid]);
  const todayDoneBy = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const l of todayLogs) (m[l.habit_id] ||= new Set()).add(l.user_id);
    return m;
  }, [todayLogs]);
  const per30 = useMemo(() => {
    const m: Record<string, number> = {};
    const from = subDays(new Date(), 29);
    for (const l of logs) if (new Date(l.log_date) >= from) m[l.habit_id] = (m[l.habit_id] ?? 0) + 1;
    return m;
  }, [logs]);

  // weekly report: per-member completions in last 7 days
  const weekly = useMemo(() => {
    const since = subDays(new Date(), 6);
    const counts: Record<string, number> = {};
    for (const l of logs) if (new Date(l.log_date) >= since) counts[l.user_id] = (counts[l.user_id] ?? 0) + 1;
    return members.map((m) => ({ id: m.id, name: m.display_name || (m.id === projectQ.data?.user_id ? "Owner" : "Member"), count: counts[m.id] ?? 0, isOwner: m.id === projectQ.data?.user_id }))
      .sort((a, b) => b.count - a.count);
  }, [logs, members, projectQ.data?.user_id]);

  const daysDone = useMemo(() => new Set(logs.map((l) => l.log_date)).size, [logs]);
  const daysLeft = Math.max(0, targetDays - daysDone);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const progress = isRecurring
    ? Math.min(100, Math.round((daysDone / targetDays) * 100))
    : tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const toggleSharedMode = async (v: boolean) => {
    await supabase.from("projects").update({ shared_completion: v } as any).eq("id", projectId);
    qc.invalidateQueries({ queryKey: ["project", projectId] });
    toast.success(v ? "Shared mode: anyone ticking counts for the team" : "Personal mode: each member tracks their own");
  };

  if (projectQ.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 mr-1" />All projects</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl md:text-5xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">{projectQ.data?.name}</h1>
              {isRecurring && <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-full"><Repeat className="size-3" />Daily</span>}
              <InviteButton projectId={projectId} ownerId={projectQ.data?.user_id} currentUid={uid} />
            </div>
            {projectQ.data?.description && <p className="mt-2 text-muted-foreground max-w-2xl">{projectQ.data.description}</p>}
          </div>
          {isRecurring ? (
            <div className="flex gap-2">
              <Input placeholder="New daily item…" value={habitName} onChange={(e) => setHabitName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHabit()} className="w-56" />
              <Button onClick={addHabit}><Plus className="size-4 mr-1" />Add</Button>
            </div>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />Add task</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New task</DialogTitle>
                  <DialogDescription>Break the work down. Tick it off when done.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div><Label>Due date</Label><DatePicker value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} /></div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setForm(blank); setOpen(false); }}>Cancel</Button>
                    <Button onClick={addTask} className="flex-1">Add task</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            {isRecurring ? (
              <span className="text-muted-foreground"><span className="font-medium text-foreground">{daysDone}</span>/{targetDays} days done • <span className="text-accent">{daysLeft} left</span></span>
            ) : (
              <span className="text-muted-foreground">{completedTasks}/{tasks.length} tasks done</span>
            )}
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {members.length > 1 && isOwner && (
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-card">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium flex items-center gap-2"><UsersRound className="size-4 text-accent" />Shared completion</div>
              <p className="text-xs text-muted-foreground">{sharedMode ? "On — any member ticking an item counts for the whole team." : "Off — each member tracks their own check-ins."}</p>
            </div>
            <Switch checked={sharedMode} onCheckedChange={toggleSharedMode} />
          </CardContent>
        </Card>
      )}

      {isRecurring ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="size-5 text-accent" />Today's items{sharedMode && <span className="text-xs font-normal text-accent">(team)</span>}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {habits.length === 0 && <p className="text-sm text-muted-foreground">No daily items yet. Add one above - it'll show on your Daily Tracker too.</p>}
            {habits.map((h) => {
              const isDone = completedToday.has(h.id);
              const doneBy = todayDoneBy[h.id];
              return (
                <div key={h.id} className="flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-2.5 hover:border-primary/40 transition">
                  <Checkbox checked={isDone} onCheckedChange={(v) => toggleHabitToday(h.id, !!v)} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>{h.name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                      <LinkIcon className="size-2.5" />Synced with Daily Tracker
                      {members.length > 1 && doneBy && doneBy.size > 0 && (
                        <span className="ml-1 text-accent">• {Array.from(doneBy).map((id) => members.find((m) => m.id === id)?.display_name?.split(" ")[0] || "member").join(", ")} done</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{per30[h.id] ?? 0}/30d</span>
                  {isOwner && <Button size="icon" variant="ghost" onClick={() => removeHabit(h.id)}><Trash2 className="size-3.5" /></Button>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet. Add one above.</p>}
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border bg-card/40 px-3 py-2.5">
                  <Checkbox checked={t.status === "completed"} onCheckedChange={() => toggleDone(t)} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                    {t.due_date && <div className="text-[10px] text-muted-foreground">Due {t.due_date}</div>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {COLS.map((c) => (
              <div key={c.id} className="flex flex-col gap-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground px-1">{c.label}</div>
                <div className="space-y-2 rounded-xl border bg-card/30 p-2 min-h-32">
                  {tasks.filter((t) => t.status === c.id).map((t) => (
                    <Card key={t.id}><CardContent className="p-3">
                      <div className="text-sm">{t.title}</div>
                      {t.due_date && <div className="text-[10px] text-muted-foreground mt-1">Due {t.due_date}</div>}
                    </CardContent></Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function InviteButton({ projectId, ownerId, currentUid }: { projectId: string; ownerId?: string; currentUid: string }) {
  const membersQ = useQuery({
    queryKey: ["project_members", projectId],
    queryFn: async () => (await supabase.from("project_members" as any).select("user_id,role")).data ?? [],
  });
  const isOwner = ownerId === currentUid;
  const memberCount = (membersQ.data?.length ?? 0) + 1;

  const createInvite = async () => {
    const token = (crypto as any).randomUUID().replace(/-/g, "");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("project_invites" as any).insert({ project_id: projectId, token, created_by: currentUid, expires_at: expires });
    if (error) return toast.error(error.message);
    const url = `${window.location.origin}/join/${token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Invite link copied — valid 7 days"); }
    catch { toast.success("Invite created", { description: url }); }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" />{memberCount}</span>
      {isOwner && (
        <Button size="sm" variant="outline" onClick={createInvite}><Share2 className="size-3.5 mr-1" />Invite</Button>
      )}
    </span>
  );
}
