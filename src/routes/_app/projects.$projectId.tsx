import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId).single();
      return data;
    },
  });

  const tasksQ = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("project_id", projectId).order("created_at");
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const addTask = async () => {
    if (!title) return;
    await supabase.from("tasks").insert({ user_id: uid, project_id: projectId, title, status: "backlog" });
    setTitle(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
  };

  const move = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    // update project progress
    const tasks = tasksQ.data ?? [];
    const updated = tasks.map((t) => (t.id === id ? { ...t, status } : t));
    const total = updated.length;
    const done = updated.filter((t) => t.status === "completed").length;
    if (total > 0) {
      const progress = Math.round((done / total) * 100);
      await supabase.from("projects").update({ progress }).eq("id", projectId);
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects", uid] });
    }
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 mr-1" />All projects</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl md:text-5xl">{projectQ.data?.name}</h1>
            {projectQ.data?.description && <p className="mt-2 text-muted-foreground max-w-2xl">{projectQ.data.description}</p>}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />Add task</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
              <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Button onClick={addTask}>Add</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {COLS.map((c) => (
          <div key={c.id} className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground px-1">{c.label}</div>
            <div className="space-y-2 rounded-xl border bg-card/30 p-2 min-h-32">
              {(tasksQ.data ?? []).filter((t) => t.status === c.id).map((t) => (
                <Card key={t.id}><CardContent className="p-3 space-y-2">
                  <div className="text-sm">{t.title}</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {COLS.filter((x) => x.id !== c.id).map((x) => (
                      <button key={x.id} onClick={() => move(t.id, x.id)} className="text-[10px] rounded-full border px-2 py-0.5 hover:bg-accent/20">{x.label}</button>
                    ))}
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="size-3" /></Button>
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
