import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { weekStartISO } from "@/lib/challenge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/review")({
  component: ReviewPage,
  head: () => ({ meta: [{ title: "Weekly Review — 90-Day Life OS" }] }),
});

function ReviewPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const week = weekStartISO();

  const currentQ = useQuery({
    queryKey: ["review", uid, week],
    queryFn: async () => {
      const { data } = await supabase.from("weekly_reviews").select("*").eq("user_id", uid).eq("week_start", week).maybeSingle();
      return data;
    },
  });

  const historyQ = useQuery({
    queryKey: ["reviews", uid],
    queryFn: async () => {
      const { data } = await supabase.from("weekly_reviews").select("*").eq("user_id", uid).order("week_start", { ascending: false }).limit(12);
      return data ?? [];
    },
  });

  const [f, setF] = useState({
    wins: "", lessons: "", challenges: "", exercise_days: "", weight: "", energy_level: "",
    career_accomplishments: "", income_earned: "", savings_added: "", important_connections: "", next_week_priorities: "",
  });

  useEffect(() => {
    if (currentQ.data) {
      setF({
        wins: currentQ.data.wins ?? "", lessons: currentQ.data.lessons ?? "", challenges: currentQ.data.challenges ?? "",
        exercise_days: currentQ.data.exercise_days?.toString() ?? "", weight: currentQ.data.weight?.toString() ?? "",
        energy_level: currentQ.data.energy_level?.toString() ?? "", career_accomplishments: currentQ.data.career_accomplishments ?? "",
        income_earned: currentQ.data.income_earned?.toString() ?? "", savings_added: currentQ.data.savings_added?.toString() ?? "",
        important_connections: currentQ.data.important_connections ?? "", next_week_priorities: currentQ.data.next_week_priorities ?? "",
      });
    }
  }, [currentQ.data]);

  const save = async () => {
    const payload: any = { user_id: uid, week_start: week };
    for (const [k, v] of Object.entries(f)) {
      if (["exercise_days", "energy_level"].includes(k)) payload[k] = v ? Number(v) : null;
      else if (["weight", "income_earned", "savings_added"].includes(k)) payload[k] = v ? Number(v) : null;
      else payload[k] = v;
    }
    const { error } = await supabase.from("weekly_reviews").upsert(payload, { onConflict: "user_id,week_start" });
    if (error) return toast.error(error.message);
    toast.success("Review saved");
    qc.invalidateQueries({ queryKey: ["review", uid, week] });
    qc.invalidateQueries({ queryKey: ["reviews", uid] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl md:text-5xl">Weekly Review</h1>
        <p className="mt-2 text-muted-foreground">Week of {format(new Date(week), "MMM d, yyyy")}. The 30 minutes that change everything.</p>
      </div>

      <Card><CardContent className="p-6 space-y-5">
        <Section title="Wins"><Textarea rows={3} value={f.wins} onChange={(e) => setF({ ...f, wins: e.target.value })} placeholder="What went well?" /></Section>
        <Section title="Lessons"><Textarea rows={3} value={f.lessons} onChange={(e) => setF({ ...f, lessons: e.target.value })} placeholder="What did I learn?" /></Section>
        <Section title="Challenges"><Textarea rows={3} value={f.challenges} onChange={(e) => setF({ ...f, challenges: e.target.value })} placeholder="What slowed me down?" /></Section>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Exercise days"><Input type="number" value={f.exercise_days} onChange={(e) => setF({ ...f, exercise_days: e.target.value })} /></Field>
          <Field label="Weight"><Input type="number" step="0.1" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} /></Field>
          <Field label="Energy (1-10)"><Input type="number" min={1} max={10} value={f.energy_level} onChange={(e) => setF({ ...f, energy_level: e.target.value })} /></Field>
        </div>

        <Section title="Career — major accomplishments"><Textarea rows={2} value={f.career_accomplishments} onChange={(e) => setF({ ...f, career_accomplishments: e.target.value })} /></Section>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Income earned"><Input type="number" step="0.01" value={f.income_earned} onChange={(e) => setF({ ...f, income_earned: e.target.value })} /></Field>
          <Field label="Savings added"><Input type="number" step="0.01" value={f.savings_added} onChange={(e) => setF({ ...f, savings_added: e.target.value })} /></Field>
        </div>

        <Section title="Important connections"><Textarea rows={2} value={f.important_connections} onChange={(e) => setF({ ...f, important_connections: e.target.value })} /></Section>
        <Section title="Top 3 priorities next week"><Textarea rows={3} value={f.next_week_priorities} onChange={(e) => setF({ ...f, next_week_priorities: e.target.value })} placeholder="1.&#10;2.&#10;3." /></Section>

        <Button onClick={save}>Save weekly review</Button>
      </CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Review history</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(historyQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No past reviews yet.</p>}
          {(historyQ.data ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border bg-card/40 p-3">
              <div className="text-xs text-muted-foreground">Week of {format(new Date(r.week_start), "MMM d, yyyy")}</div>
              {r.wins && <div className="text-sm mt-1"><span className="text-success">Wins:</span> {r.wins.slice(0, 120)}</div>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div><Label className="font-display text-xl">{title}</Label><div className="mt-2">{children}</div></div>);
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><Label>{label}</Label><div className="mt-1.5">{children}</div></div>);
}
