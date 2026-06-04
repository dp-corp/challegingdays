import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/foundation")({
  component: FoundationPage,
  head: () => ({ meta: [{ title: "Foundation - 90-Day Life OS" }] }),
});

function FoundationPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const q = useQuery({
    queryKey: ["foundation", uid],
    queryFn: async () => {
      const { data } = await supabase.from("foundation").select("*").eq("user_id", uid).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({ one_word: "", dream_outcome: "", why_matters: "", success_headline: "" });
  useEffect(() => {
    if (q.data) setForm({
      one_word: q.data.one_word ?? "",
      dream_outcome: q.data.dream_outcome ?? "",
      why_matters: q.data.why_matters ?? "",
      success_headline: q.data.success_headline ?? "",
    });
  }, [q.data]);

  const save = async () => {
    const { error } = await supabase.from("foundation").upsert({ user_id: uid, ...form, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Foundation saved");
    q.refetch();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-4xl md:text-5xl">Foundation</h1>
        <p className="mt-2 text-muted-foreground">The bedrock of your 90 days. Come back here when you forget why you started.</p>
      </div>

      <Card><CardContent className="p-6 space-y-5">
        <Field label="One word for the 90 days" hint="A single word to organize every decision.">
          <Input value={form.one_word} onChange={(e) => setForm({ ...form, one_word: e.target.value })} placeholder="Discipline" />
        </Field>
        <Field label="Dream outcome" hint="What does the finish line look like in vivid detail?">
          <Textarea rows={3} value={form.dream_outcome} onChange={(e) => setForm({ ...form, dream_outcome: e.target.value })} />
        </Field>
        <Field label="Why this matters" hint="The deeper reason. The thing that gets you up at 5am.">
          <Textarea rows={3} value={form.why_matters} onChange={(e) => setForm({ ...form, why_matters: e.target.value })} />
        </Field>
        <Field label="Success headline" hint="If a newspaper covered your day 90, what would the headline say?">
          <Input value={form.success_headline} onChange={(e) => setForm({ ...form, success_headline: e.target.value })} />
        </Field>
        <Button onClick={save}>Save foundation</Button>
      </CardContent></Card>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-display text-xl">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="pt-1">{children}</div>
    </div>
  );
}
