import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects — 90-Day Life OS" }] }),
});

const PRIORITIES = ["low", "medium", "high"];

function ProjectsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["projects", uid],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("user_id", uid).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", priority: "medium", deadline: "" });

  const create = async () => {
    if (!form.name) return toast.error("Add a name");
    const { error } = await supabase.from("projects").insert({ user_id: uid, ...form, deadline: form.deadline || null });
    if (error) return toast.error(error.message);
    setOpen(false); setForm({ name: "", description: "", priority: "medium", deadline: "" });
    qc.invalidateQueries({ queryKey: ["projects", uid] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Projects</h1>
          <p className="mt-2 text-muted-foreground">The work that actually moves the needle.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New project</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(q.data ?? []).map((p) => (
          <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }} className="block">
            <Card className="h-full hover:border-primary/40 transition">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-accent">{p.priority}</div>
                  {p.deadline && <div className="text-[10px] text-muted-foreground">Due {p.deadline}</div>}
                </div>
                <h3 className="font-display text-2xl">{p.name}</h3>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <Progress value={p.progress} className="h-1.5" />
                <div className="text-xs text-muted-foreground">{p.progress}% complete</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(q.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No projects yet. Add one to start shipping.</p>}
      </div>
    </div>
  );
}
