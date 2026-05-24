import { createFileRoute } from "@tanstack/react-router";
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
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/goals")({
  component: GoalsPage,
  head: () => ({ meta: [{ title: "Goals — 90-Day Life OS" }] }),
});

const CATEGORIES = [
  { v: "number_one", l: "Number One Goal" },
  { v: "business", l: "Business / Career" },
  { v: "health", l: "Health" },
  { v: "financial", l: "Financial" },
  { v: "learning", l: "Learning" },
  { v: "relationship", l: "Relationship" },
];

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

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "number_one", title: "", description: "", target_date: "" });

  const create = async () => {
    if (!form.title) return toast.error("Add a title");
    const { error } = await supabase.from("goals").insert({ user_id: uid, ...form, target_date: form.target_date || null });
    if (error) return toast.error(error.message);
    setOpen(false); setForm({ category: "number_one", title: "", description: "", target_date: "" });
    qc.invalidateQueries({ queryKey: ["goals", uid] });
  };

  const updateProgress = async (id: string, progress: number) => {
    await supabase.from("goals").update({ progress, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["goals", uid] });
  };
  const remove = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["goals", uid] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Goals</h1>
          <p className="mt-2 text-muted-foreground">Six aligned goals. One north star.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Target date</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Create goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(goalsQ.data ?? []).map((g) => (
          <Card key={g.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-accent">{CATEGORIES.find((c) => c.v === g.category)?.l ?? g.category}</div>
                  <h3 className="font-display text-2xl mt-1">{g.title}</h3>
                  {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="size-4" /></Button>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{g.progress}%</span></div>
                <Progress value={g.progress} className="mt-1 h-2" />
                <Slider className="mt-3" value={[g.progress]} max={100} step={5} onValueChange={(v) => updateProgress(g.id, v[0])} />
              </div>
              {g.target_date && <div className="text-xs text-muted-foreground">🎯 Target {g.target_date}</div>}
            </CardContent>
          </Card>
        ))}
        {(goalsQ.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No goals yet. Create your Number One Goal first.</p>
        )}
      </div>
    </div>
  );
}
