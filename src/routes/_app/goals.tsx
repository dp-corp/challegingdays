import { createFileRoute } from "@tanstack/react-router";
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
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, ChevronUp, Target } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/DatePicker";
import { SelectWithAdd, type SelectOption } from "@/components/SelectWithAdd";

export const Route = createFileRoute("/_app/goals")({
  component: GoalsPage,
  head: () => ({ meta: [{ title: "Goals — 90-Day Life OS" }] }),
});

const DEFAULT_CATEGORIES: SelectOption[] = [
  { value: "number_one", label: "Number One Goal" },
  { value: "business", label: "Business / Career" },
  { value: "health", label: "Health" },
  { value: "financial", label: "Financial" },
  { value: "learning", label: "Learning" },
  { value: "relationship", label: "Relationship" },
];

type Milestone = { id: string; title: string; done: boolean };

function GoalsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();

  const goalsQ = useQuery({
    queryKey: ["goals", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").eq("user_id", uid).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [categories, setCategories] = useState<SelectOption[]>(DEFAULT_CATEGORIES);
  useEffect(() => {
    const extra = localStorage.getItem("goal_categories");
    if (extra) {
      try { const parsed = JSON.parse(extra); setCategories([...DEFAULT_CATEGORIES, ...parsed]); } catch {}
    }
  }, []);
  const addCategory = (o: SelectOption) => {
    setCategories((prev) => [...prev, o]);
    const custom = [...categories.filter((c) => !DEFAULT_CATEGORIES.find((d) => d.value === c.value)), o];
    localStorage.setItem("goal_categories", JSON.stringify(custom));
  };

  const [open, setOpen] = useState(false);
  const blank = { category: "number_one", title: "", description: "", target_date: "" as string | null, notes: "" };
  const [form, setForm] = useState(blank);

  const create = async () => {
    if (!form.title) return toast.error("Add a title");
    const { error } = await supabase.from("goals").insert({
      user_id: uid, category: form.category, title: form.title, description: form.description,
      target_date: form.target_date || null, notes: form.notes,
    });
    if (error) return toast.error(error.message);
    setOpen(false); setForm(blank);
    qc.invalidateQueries({ queryKey: ["goals", uid] });
    toast.success("Goal created");
  };

  const updateProgress = async (id: string, progress: number) => {
    await supabase.from("goals").update({ progress, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["goals", uid] });
  };
  const remove = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["goals", uid] });
  };

  const goals = goalsQ.data ?? [];
  const avgProgress = goals.length ? Math.round(goals.reduce((a, g) => a + (g.progress ?? 0), 0) / goals.length) : 0;
  const done = goals.filter((g) => (g.progress ?? 0) >= 100).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 text-center sm:text-left">
        <div className="w-full sm:w-auto">
          <h1 className="font-display text-3xl md:text-5xl">Goals</h1>
          <p className="mt-2 text-muted-foreground">Six aligned goals. One north star.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="mx-auto sm:mx-0"><Plus className="size-4 mr-1" />New goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New goal</DialogTitle>
              <DialogDescription>Set a clear, measurable outcome.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Category</Label>
                <SelectWithAdd value={form.category} onChange={(v) => setForm({ ...form, category: v })}
                  options={categories} onAdd={addCategory} addLabel="Add custom category…" />
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Run a half marathon" /></div>
              <div><Label>Why it matters</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Target date</Label><DatePicker value={form.target_date} onChange={(v) => setForm({ ...form, target_date: v })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="How will you make it happen?" /></div>
              <Button onClick={create} className="w-full">Create goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <CounterCard label="Total" value={goals.length} />
        <CounterCard label="Completed" value={done} />
        <CounterCard label="Avg progress" value={`${avgProgress}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} categories={categories} onProgress={(p) => updateProgress(g.id, p)} onRemove={() => remove(g.id)} onChanged={() => qc.invalidateQueries({ queryKey: ["goals", uid] })} />
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center md:col-span-2">No goals yet. Create your Number One Goal first.</p>
        )}
      </div>
    </div>
  );
}

function CounterCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-3xl mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function GoalCard({ goal, categories, onProgress, onRemove, onChanged }: any) {
  const [openDetail, setOpenDetail] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>(Array.isArray(goal.milestones) ? goal.milestones : []);
  const [notes, setNotes] = useState<string>(goal.notes ?? "");
  const [target, setTarget] = useState<string | null>(goal.target_date ?? null);
  const [newMilestone, setNewMilestone] = useState("");

  useEffect(() => { setMilestones(Array.isArray(goal.milestones) ? goal.milestones : []); }, [goal.milestones]);

  const persistMilestones = async (next: Milestone[]) => {
    setMilestones(next);
    const totalM = next.length;
    const doneM = next.filter((m) => m.done).length;
    const patch: any = { milestones: next, updated_at: new Date().toISOString() };
    if (totalM > 0) patch.progress = Math.round((doneM / totalM) * 100);
    await supabase.from("goals").update(patch).eq("id", goal.id);
    onChanged();
  };

  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    const m: Milestone = { id: crypto.randomUUID(), title: newMilestone.trim(), done: false };
    persistMilestones([...milestones, m]);
    setNewMilestone("");
  };
  const toggleM = (id: string) => persistMilestones(milestones.map((m) => m.id === id ? { ...m, done: !m.done } : m));
  const removeM = (id: string) => persistMilestones(milestones.filter((m) => m.id !== id));

  const saveMeta = async () => {
    await supabase.from("goals").update({ notes, target_date: target || null, updated_at: new Date().toISOString() }).eq("id", goal.id);
    toast.success("Saved");
    onChanged();
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-accent">{categories.find((c: any) => c.value === goal.category)?.label ?? goal.category}</div>
            <h3 className="font-display text-2xl mt-1 break-words">{goal.title}</h3>
            {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
          </div>
          <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="size-4" /></Button>
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{goal.progress}%</span></div>
          <Progress value={goal.progress} className="mt-1 h-2" />
          <Slider className="mt-3" value={[goal.progress]} max={100} step={5} onValueChange={(v) => onProgress(v[0])} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{target ? `🎯 ${target}` : "No target date"}</span>
          <span className="text-muted-foreground">{milestones.filter((m) => m.done).length}/{milestones.length} milestones</span>
        </div>

        <Collapsible open={openDetail} onOpenChange={setOpenDetail}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              {openDetail ? "Hide details" : "Edit details & milestones"}
              {openDetail ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div>
              <Label className="text-xs">Target date</Label>
              <DatePicker value={target} onChange={setTarget} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button size="sm" onClick={saveMeta}>Save details</Button>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Target className="size-3" />Milestones</Label>
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5">
                  <Checkbox checked={m.done} onCheckedChange={() => toggleM(m.id)} />
                  <span className={`flex-1 text-sm ${m.done ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeM(m.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Add milestone…" value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMilestone(); } }} />
                <Button size="icon" onClick={addMilestone}><Plus className="size-4" /></Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
