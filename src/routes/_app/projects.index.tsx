import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/DatePicker";
import { SelectWithAdd, type SelectOption } from "@/components/SelectWithAdd";

export const Route = createFileRoute("/_app/projects/")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects - 90-Day Life OS" }] }),
});

const DEFAULT_PRIORITIES: SelectOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

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

  const [priorities, setPriorities] = useState<SelectOption[]>(DEFAULT_PRIORITIES);
  useEffect(() => {
    const extra = localStorage.getItem("project_priorities");
    if (extra) { try { setPriorities([...DEFAULT_PRIORITIES, ...JSON.parse(extra)]); } catch {} }
  }, []);
  const addPriority = (o: SelectOption) => {
    setPriorities((prev) => [...prev, o]);
    const custom = [...priorities.filter((c) => !DEFAULT_PRIORITIES.find((d) => d.value === c.value)), o];
    localStorage.setItem("project_priorities", JSON.stringify(custom));
  };

  const [open, setOpen] = useState(false);
  const blank = { name: "", description: "", priority: "medium", deadline: null as string | null, notes: "" };
  const [form, setForm] = useState(blank);

  const create = async () => {
    if (!form.name) return toast.error("Add a name");
    const { error } = await supabase.from("projects").insert({
      user_id: uid, name: form.name, description: form.description, priority: form.priority,
      deadline: form.deadline || null, notes: form.notes,
    });
    if (error) return toast.error(error.message);
    setOpen(false); setForm(blank);
    qc.invalidateQueries({ queryKey: ["projects", uid] });
    toast.success("Project created - open it to add tasks");
  };

  const projects = q.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 text-center sm:text-left">
        <div className="w-full sm:w-auto">
          <h1 className="font-display text-3xl md:text-5xl">Projects</h1>
          <p className="mt-2 text-muted-foreground">The work that actually moves the needle.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="mx-auto sm:mx-0"><Plus className="size-4 mr-1" />New project</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>You'll add tasks once it's created.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <SelectWithAdd value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
                  options={priorities} onAdd={addPriority} addLabel="Add custom priority…" />
              </div>
              <div><Label>Deadline</Label><DatePicker value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Create project</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Mini label="Total" value={projects.length} />
        <Mini label="Active" value={projects.filter((p) => (p.progress ?? 0) < 100).length} />
        <Mini label="Done" value={projects.filter((p) => (p.progress ?? 0) >= 100).length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            to="/projects/$projectId"
            params={{ projectId: p.id }}
            preload="intent"
            className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            <Card className="h-full group-hover:border-primary/50 group-hover:shadow-lg transition cursor-pointer">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-accent">{priorities.find((x) => x.value === p.priority)?.label ?? p.priority}</div>
                  {p.deadline && <div className="text-[10px] text-muted-foreground">Due {p.deadline}</div>}
                </div>
                <h3 className="font-display text-2xl">{p.name}</h3>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${p.progress ?? 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{p.progress ?? 0}% complete</span>
                  <span className="text-primary group-hover:underline">Open project →</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {projects.length === 0 && <p className="text-sm text-muted-foreground text-center md:col-span-2 lg:col-span-3">No projects yet. Add one to start shipping.</p>}
      </div>

    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="font-display text-3xl mt-1">{value}</div></CardContent></Card>;
}
