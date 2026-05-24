import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — 90-Day Life OS" }] }),
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const uid = user!.id;
  const q = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
      return data;
    },
  });
  const achievementsQ = useQuery({
    queryKey: ["achievements", uid],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("*").eq("user_id", uid).order("earned_at", { ascending: false });
      return data ?? [];
    },
  });

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  useEffect(() => {
    if (q.data) { setName(q.data.display_name ?? ""); setStart(q.data.challenge_start_date ?? ""); }
  }, [q.data]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({ display_name: name, challenge_start_date: start, updated_at: new Date().toISOString() }).eq("id", uid);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    q.refetch();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-4xl md:text-5xl">Profile</h1>

      <Card><CardContent className="p-6 space-y-4">
        <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Challenge start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div className="flex gap-2">
          <Button onClick={save}>Save</Button>
          <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
        </div>
      </CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Badges</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(achievementsQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No badges yet. Complete day 1 to earn your first.</p>}
          {(achievementsQ.data ?? []).map((a) => (
            <div key={a.id} className="rounded-full border bg-accent/10 px-3 py-1 text-xs">🏆 {a.title}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
