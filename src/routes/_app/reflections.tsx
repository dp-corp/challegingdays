import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { todayISO } from "@/lib/challenge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reflections")({
  component: ReflectionsPage,
  head: () => ({ meta: [{ title: "Reflections - 90-Day Life OS" }] }),
});

const PROMPTS = [
  ["biggest_win", "What was your biggest win today?"],
  ["challenge", "What challenge did you face?"],
  ["gratitude", "What are you grateful for?"],
  ["tomorrow_focus", "What is your main focus tomorrow?"],
] as const;

function ReflectionsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const date = todayISO();

  const todayQ = useQuery({
    queryKey: ["reflection", uid, date],
    queryFn: async () => {
      const { data } = await supabase
        .from("reflections")
        .select("*")
        .eq("user_id", uid)
        .eq("reflection_date", date)
        .maybeSingle();
      return data;
    },
  });

  const historyQ = useQuery({
    queryKey: ["reflections", uid],
    queryFn: async () => {
      const { data } = await supabase
        .from("reflections")
        .select("*")
        .eq("user_id", uid)
        .order("reflection_date", { ascending: false })
        .limit(14);
      return data ?? [];
    },
  });

  const [f, setF] = useState({ biggest_win: "", challenge: "", gratitude: "", tomorrow_focus: "" });
  useEffect(() => {
    if (todayQ.data)
      setF({
        biggest_win: todayQ.data.biggest_win ?? "",
        challenge: todayQ.data.challenge ?? "",
        gratitude: todayQ.data.gratitude ?? "",
        tomorrow_focus: todayQ.data.tomorrow_focus ?? "",
      });
  }, [todayQ.data]);

  const save = async () => {
    const summary = [
      f.biggest_win && `Won by ${f.biggest_win.toLowerCase()}.`,
      f.challenge && `Faced ${f.challenge.toLowerCase()}.`,
      f.gratitude && `Grateful for ${f.gratitude.toLowerCase()}.`,
      f.tomorrow_focus && `Tomorrow: ${f.tomorrow_focus}.`,
    ]
      .filter(Boolean)
      .join(" ");
    const { error } = await supabase
      .from("reflections")
      .upsert(
        { user_id: uid, reflection_date: date, ...f, ai_summary: summary },
        { onConflict: "user_id,reflection_date" },
      );
    if (error) return toast.error(error.message);
    toast.success("Reflection saved");
    qc.invalidateQueries({ queryKey: ["reflection", uid, date] });
    qc.invalidateQueries({ queryKey: ["reflections", uid] });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-4xl md:text-5xl">Evening Reflection</h1>
        <p className="mt-2 text-muted-foreground">
          Four questions. Five minutes. A clearer tomorrow.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {PROMPTS.map(([k, q]) => (
            <div key={k} className="space-y-1.5">
              <Label className="font-display text-xl">{q}</Label>
              <Textarea
                rows={3}
                value={(f as any)[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
              />
            </div>
          ))}
          <Button onClick={save}>Save reflection</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reflection history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(historyQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No reflections yet.</p>
          )}
          {(historyQ.data ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border bg-card/40 p-3">
              <div className="text-xs text-muted-foreground">
                {format(new Date(r.reflection_date), "EEE, MMM d")}
              </div>
              {r.ai_summary && <div className="text-sm mt-1 italic">{r.ai_summary}</div>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
