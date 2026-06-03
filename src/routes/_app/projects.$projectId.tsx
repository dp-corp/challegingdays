import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { DatePicker } from "@/components/DatePicker";
import { toast } from "sonner";

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

  const projectQ = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await supabase.from("projects").select("*").eq("id", projectId).single()).data,
  });

  const tasksQ = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("project_id", projectId).order("created_at")).data ?? [],
  });

  const recomputeProgress = async (overrides: { id: string; status: string }[] = []) => {
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
    await recomputeProgress([{ id, status }]);
  };

  const toggleDone = async (t: any) => {
    const status = t.status === "completed" ? "todo" : "completed";
    await move(t.id, status);
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    setTimeout(() => recomputeProgress(), 200);
  };

  const tasks = tasksQ.data ?? [];
  const completed = tasks.filter((t) => t.status === "completed").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 mr-1" />All projects</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-5xl">{projectQ.data?.name}</h1>
            {projectQ.data?.description && <p className="mt-2 text-muted-foreground max-w-2xl">{projectQ.data.description}</p>}
          </div>
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
        </div>
      </div>

      <Card><CardContent className="p-4 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{completed}/{tasks.length} tasks done</span><span className="font-medium">{progress}%</span></div>
        <Progress value={progress} className="h-2" />
      </CardContent></Card>

      {/* Quick checklist */}
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
              <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="size-3.5" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Kanban board */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {COLS.map((c) => (
          <div key={c.id} className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground px-1">{c.label}</div>
            <div className="space-y-2 rounded-xl border bg-card/30 p-2 min-h-32">
              {tasks.filter((t) => t.status === c.id).map((t) => (
                <Card key={t.id}><CardContent className="p-3 space-y-2">
                  <div className="text-sm">{t.title}</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {COLS.filter((x) => x.id !== c.id).map((x) => (
                      <button key={x.id} onClick={() => move(t.id, x.id)} className="text-[10px] rounded-full border px-2 py-0.5 hover:bg-accent/20">{x.label}</button>
                    ))}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
