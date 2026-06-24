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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Repeat, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/DatePicker";
import { SelectWithAdd, type SelectOption } from "@/components/SelectWithAdd";
import { differenceInCalendarDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/projects/")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects - 90-Day Life OS" }] }),
});

const DEFAULT_PRIORITIES: SelectOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

type ProjectForm = {
  name: string;
  description: string;
  priority: string;
  deadline: string | null;
  notes: string;
  is_recurring: boolean;
  target_days: number;
  project_type: string;
};

const BLANK: ProjectForm = {
  name: "",
  description: "",
  priority: "medium",
  deadline: null,
  notes: "",
  is_recurring: false,
  target_days: 90,
  project_type: "Personal or Passion",
};

function ProjectsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["projects", uid],
    queryFn: async () =>
      (await supabase.from("projects").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });

  const [priorities, setPriorities] = useState<SelectOption[]>(DEFAULT_PRIORITIES);
  useEffect(() => {
    const extra = localStorage.getItem("project_priorities");
    if (extra) {
      try {
        setPriorities([...DEFAULT_PRIORITIES, ...JSON.parse(extra)]);
      } catch {}
    }
  }, []);
  const addPriority = (o: SelectOption) => {
    setPriorities((prev) => [...prev, o]);
    const custom = [
      ...priorities.filter((c) => !DEFAULT_PRIORITIES.find((d) => d.value === c.value)),
      o,
    ];
    localStorage.setItem("project_priorities", JSON.stringify(custom));
  };

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(BLANK);

  const save = async () => {
    if (!form.name) return toast.error("Add a name");
    const payload = {
      name: form.name,
      description: form.description,
      priority: form.priority,
      deadline: form.deadline || null,
      notes: form.notes,
      is_recurring: form.is_recurring,
      target_days: form.target_days || 90,
      project_type: form.project_type,
    };
    if (editId) {
      const { error } = await supabase.from("projects").update(payload).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Project updated");
    } else {
      const { error } = await supabase.from("projects").insert({ user_id: uid, ...payload });
      if (error) return toast.error(error.message);
      toast.success(
        form.is_recurring
          ? "Daily project created - add habits to it"
          : "Project created - open it to add tasks",
      );
    }
    setOpen(false);
    setForm(BLANK);
    setEditId(null);
    qc.invalidateQueries({ queryKey: ["projects", uid] });
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      priority: p.priority,
      deadline: p.deadline,
      notes: p.notes ?? "",
      is_recurring: !!p.is_recurring,
      target_days: p.target_days ?? 90,
      project_type: p.project_type ?? "Personal or Passion",
    });
    setOpen(true);
  };

  const startCreate = () => {
    setEditId(null);
    setForm(BLANK);
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this project and all its tasks?")) return;
    await supabase.from("projects").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["projects", uid] });
    toast.success("Project deleted");
  };

  const tasksQ = useQuery({
    queryKey: ["tasks-all", uid],
    queryFn: async () =>
      (await supabase.from("tasks").select("*").eq("user_id", uid).neq("status", "completed")).data ?? [],
  });

  const projects = q.data ?? [];
  const passionProjects = projects.filter(p => p.project_type === "Personal or Passion" || !p.project_type);
  const salaryProjects = projects.filter(p => p.project_type === "Salary");
  const otherProjects = projects.filter(p => p.project_type === "Other Money Making");

  const renderSection = (title: string, projs: any[]) => (
    <div className="space-y-4">
      <h2 className="text-xl font-display text-primary">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projs.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            priorities={priorities}
            tasks={(tasksQ.data ?? []).filter((t: any) => t.project_id === p.id)}
            onEdit={() => startEdit(p)}
            onDelete={() => remove(p.id)}
          />
        ))}
        {projs.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">
            No projects in this category.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 text-center sm:text-left">
        <div className="w-full sm:w-auto">
          <h1 className="font-display text-3xl md:text-5xl bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
            Projects
          </h1>
          <p className="mt-2 text-muted-foreground">The work that actually moves the needle.</p>
        </div>
        <Button className="mx-auto sm:mx-0" onClick={startCreate}>
          <Plus className="size-4 mr-1" />
          New project
        </Button>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditId(null);
              setForm(BLANK);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit project" : "New project"}</DialogTitle>
              <DialogDescription>
                {form.is_recurring
                  ? "A daily project - track habits over time."
                  : "A focused initiative with tasks to ship."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg border p-3 flex items-center justify-between gap-3 bg-gradient-to-r from-accent/10 to-primary/10">
                <div className="flex items-center gap-2">
                  <Repeat className="size-4 text-accent" />
                  <div>
                    <Label className="cursor-pointer">Repeats daily</Label>
                    <p className="text-xs text-muted-foreground">
                      Tick habits each day toward a streak target.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.is_recurring}
                  onCheckedChange={(v) => setForm({ ...form, is_recurring: v })}
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Project Type</Label>
                <Select value={form.project_type} onValueChange={(v) => setForm({ ...form, project_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal or Passion">Personal or Passion</SelectItem>
                    <SelectItem value="Salary">Salary</SelectItem>
                    <SelectItem value="Other Money Making">Other Money Making</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <SelectWithAdd
                  value={form.priority}
                  onChange={(v) => setForm({ ...form, priority: v })}
                  options={priorities}
                  onAdd={addPriority}
                  addLabel="Add custom priority…"
                />
              </div>
              {form.is_recurring ? (
                <div>
                  <Label>Target days</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.target_days}
                    onChange={(e) =>
                      setForm({ ...form, target_days: Number(e.target.value) || 90 })
                    }
                  />
                </div>
              ) : (
                <div>
                  <Label>Deadline</Label>
                  <DatePicker
                    value={form.deadline}
                    onChange={(v) => setForm({ ...form, deadline: v })}
                  />
                </div>
              )}
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button onClick={save} className="w-full">
                {editId ? "Save changes" : "Create project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Mini label="Total" value={projects.length} />
        <Mini label="Active" value={projects.filter((p) => (p.progress ?? 0) < 100).length} />
        <Mini label="Done" value={projects.filter((p) => (p.progress ?? 0) >= 100).length} />
      </div>

      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {renderSection("Personal or Passion", passionProjects)}
          {renderSection("Salary", salaryProjects)}
          {renderSection("Other Money Making", otherProjects)}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p, priorities, tasks = [], onEdit, onDelete }: any) {
  const recurring = !!p.is_recurring;
  const daysLeft = p.deadline
    ? Math.max(0, differenceInCalendarDays(new Date(p.deadline), new Date()))
    : recurring
      ? Math.max(
          0,
          (p.target_days ?? 90) - Math.round(((p.progress ?? 0) / 100) * (p.target_days ?? 90)),
        )
      : null;
  const targetDays = p.target_days ?? 90;
  const daysDone = recurring ? Math.round(((p.progress ?? 0) / 100) * targetDays) : null;

  return (
    <Card className="group h-full relative overflow-hidden border-border/60 hover:border-primary/60 hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className="absolute -top-12 -right-12 size-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5 space-y-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-accent">
              {priorities.find((x: any) => x.value === p.priority)?.label ?? p.priority}
            </span>
            {recurring && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                <Repeat className="size-2.5" />
                Daily
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={(e) => {
                e.preventDefault();
                onEdit();
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        <Link
          to="/projects/$projectId"
          params={{ projectId: p.id }}
          preload="intent"
          className="block focus:outline-none"
        >
          <h3 className="font-display text-2xl group-hover:text-primary transition-colors flex items-center gap-2 flex-wrap">
            {p.name}
            {p.deadline && daysLeft !== null && (
              <span className="text-xs font-sans font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                {daysLeft}d left
              </span>
            )}
          </h3>
          {p.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
          )}
        </Link>

        {tasks.length > 0 && !recurring && (
          <div className="bg-card/40 border rounded-lg p-2 space-y-1.5 mt-2">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Upcoming Tasks</div>
            {tasks.slice(0, 3).map((t: any) => (
              <div key={t.id} className="text-xs truncate flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-primary/50" />
                {t.title}
              </div>
            ))}
            {tasks.length > 3 && (
              <div className="text-[10px] text-muted-foreground pl-3">
                +{tasks.length - 3} more
              </div>
            )}
          </div>
        )}

        <div className="relative h-2 rounded-full bg-secondary overflow-hidden mt-3">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite] transition-all"
            style={{ width: `${p.progress ?? 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs mt-3">
          {recurring ? (
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{daysDone}</span>/{targetDays} days done
              • <span className="text-accent">{daysLeft} left</span>
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="font-medium text-foreground">{p.progress ?? 0}%</span>
              {p.deadline && (
                <>
                  <CalendarIcon className="size-3 ml-1" /> {daysLeft} days left
                </>
              )}
            </span>
          )}
          <Link
            to="/projects/$projectId"
            params={{ projectId: p.id }}
            className="text-primary group-hover:underline"
          >
            Open →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <Card className="bg-gradient-to-br from-card to-muted/30">
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-3xl mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
