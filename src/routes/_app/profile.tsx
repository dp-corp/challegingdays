import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LogOut, Download, Bell, Moon } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile & Settings — 90-Day Life OS" }] }),
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
  const [avatar, setAvatar] = useState("");
  const [start, setStart] = useState("");
  const [bio, setBio] = useState("");
  const [dark, setDark] = useState(true);
  const [reminders, setReminders] = useState(true);

  useEffect(() => {
    if (q.data) {
      setName(q.data.display_name ?? "");
      setAvatar(q.data.avatar_url ?? "");
      setStart(q.data.challenge_start_date ?? "");
    }
  }, [q.data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme");
    const isDark = saved ? saved === "dark" : document.documentElement.classList.contains("dark");
    setDark(isDark);
    setReminders(localStorage.getItem("reminders") !== "off");
    setBio(localStorage.getItem("bio") ?? "");
  }, []);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      display_name: name, avatar_url: avatar || null, challenge_start_date: start, updated_at: new Date().toISOString(),
    }).eq("id", uid);
    if (error) return toast.error(error.message);
    localStorage.setItem("bio", bio);
    toast.success("Profile saved");
    q.refetch();
  };

  const toggleDark = (v: boolean) => {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    localStorage.setItem("theme", v ? "dark" : "light");
  };

  const toggleReminders = async (v: boolean) => {
    setReminders(v);
    localStorage.setItem("reminders", v ? "on" : "off");
    if (v && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const exportCsv = async () => {
    const [scores, habits, goals] = await Promise.all([
      supabase.from("scores").select("*").eq("user_id", uid),
      supabase.from("habit_logs").select("*").eq("user_id", uid),
      supabase.from("goals").select("*").eq("user_id", uid),
    ]);
    const csv = (rows: any[]) => {
      if (!rows.length) return "";
      const keys = Object.keys(rows[0]);
      return [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
    };
    const blob = new Blob([
      "# scores\n", csv(scores.data ?? []), "\n\n# habit_logs\n", csv(habits.data ?? []), "\n\n# goals\n", csv(goals.data ?? []),
    ], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `90-day-os-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl">Profile & Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account, preferences, and data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you show up in the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-gradient-to-br from-primary to-accent overflow-hidden flex items-center justify-center text-white text-xl font-semibold">
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{name || "Unnamed"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Avatar URL</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" /></div>
            <div><Label>Challenge start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          </div>
          <div><Label>Bio</Label><Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Why this 90 days matters to you." /></div>
          <Button onClick={save}>Save profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>App-wide settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <Row icon={<Moon className="size-4" />} title="Dark mode" desc="Use the dark theme.">
            <Switch checked={dark} onCheckedChange={toggleDark} />
          </Row>
          <Separator />
          <Row icon={<Bell className="size-4" />} title="Daily reminders" desc="Browser notifications for your evening reflection.">
            <Switch checked={reminders} onCheckedChange={toggleReminders} />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Export everything as CSV.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={exportCsv}><Download className="size-4 mr-2" />Export to CSV</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Badges earned</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(achievementsQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No badges yet. Complete day 1 to earn your first.</p>}
          {(achievementsQ.data ?? []).map((a) => (
            <div key={a.id} className="rounded-full border bg-accent/10 px-3 py-1 text-xs">🏆 {a.title}</div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => signOut()}><LogOut className="size-4 mr-2" />Sign out</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
