import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { LogOut, Download, Bell, Moon, Upload, Palette, Check, KeyRound } from "lucide-react";
import { DatePicker } from "@/components/DatePicker";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile & Settings - 90-Day Life OS" }] }),
});

const THEMES: { name: string; primary: string; accent: string }[] = [
  { name: "Indigo", primary: "oklch(0.7 0.18 265)", accent: "oklch(0.78 0.16 65)" },
  { name: "Emerald", primary: "oklch(0.72 0.17 150)", accent: "oklch(0.82 0.16 75)" },
  { name: "Rose", primary: "oklch(0.7 0.2 350)", accent: "oklch(0.78 0.16 65)" },
  { name: "Cyan", primary: "oklch(0.75 0.15 200)", accent: "oklch(0.78 0.16 65)" },
  { name: "Amber", primary: "oklch(0.78 0.16 75)", accent: "oklch(0.72 0.17 150)" },
  { name: "Violet", primary: "oklch(0.68 0.22 305)", accent: "oklch(0.75 0.15 200)" },
];

export function applyTheme(name: string) {
  const t = THEMES.find((x) => x.name === name) ?? THEMES[0];
  const root = document.documentElement;
  root.style.setProperty("--primary", t.primary);
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--ring", t.primary);
  root.style.setProperty("--chart-1", t.primary);
  root.style.setProperty("--chart-2", t.accent);
  localStorage.setItem("theme_accent", name);
}

function ProfilePage() {
  const { user, signOut } = useAuth();
  const uid = user!.id;
  const q = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", uid).single()).data,
  });
  const achievementsQ = useQuery({
    queryKey: ["achievements", uid],
    queryFn: async () => (await supabase.from("achievements").select("*").eq("user_id", uid).order("earned_at", { ascending: false })).data ?? [],
  });

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [start, setStart] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [dark, setDark] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [theme, setTheme] = useState("Indigo");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.data) {
      setName(q.data.display_name ?? "");
      setAvatar(q.data.avatar_url ?? "");
      setStart(q.data.challenge_start_date ?? null);
    }
  }, [q.data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme");
    setDark(saved ? saved === "dark" : document.documentElement.classList.contains("dark"));
    setReminders(localStorage.getItem("reminders") !== "off");
    setBio(localStorage.getItem("bio") ?? "");
    setTheme(localStorage.getItem("theme_accent") ?? "Indigo");
  }, []);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      display_name: name, avatar_url: avatar || null,
      challenge_start_date: start ?? undefined, updated_at: new Date().toISOString(),
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

  const pickTheme = (n: string) => { setTheme(n); applyTheme(n); toast.success(`${n} theme applied`); };

  const onUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatar(data.publicUrl);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() }).eq("id", uid);
    setUploading(false);
    toast.success("Avatar uploaded");
    q.refetch();
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
    const blob = new Blob(["# scores\n", csv(scores.data ?? []), "\n\n# habit_logs\n", csv(habits.data ?? []), "\n\n# goals\n", csv(goals.data ?? [])], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `90-day-os-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="font-display text-3xl md:text-4xl">Profile & Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account, look, and data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you show up in the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative">
              <div className="size-20 rounded-full bg-gradient-to-br from-primary to-accent overflow-hidden flex items-center justify-center text-white text-2xl font-semibold">
                {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
              </div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition">
                <Upload className="size-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="text-sm font-medium truncate">{name || "Unnamed"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              {uploading && <div className="text-xs text-primary mt-1">Uploading…</div>}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Avatar URL</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://… or upload" /></div>
            <div><Label>Challenge start date</Label><DatePicker value={start} onChange={setStart} /></div>
            <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          </div>
          <div><Label>Bio</Label><Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Why this 90 days matters to you." /></div>
          <Button onClick={save}>Save profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="size-4" />Color theme</CardTitle>
          <CardDescription>Personalize your accent color.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {THEMES.map((t) => (
              <button key={t.name} type="button" onClick={() => pickTheme(t.name)}
                className={`group relative aspect-square rounded-xl border-2 transition ${theme === t.name ? "border-foreground" : "border-transparent hover:border-border"}`}
                style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}>
                {theme === t.name && <Check className="absolute inset-0 m-auto size-5 text-white drop-shadow" />}
                <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-muted-foreground">{t.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preferences</CardTitle><CardDescription>App-wide settings.</CardDescription></CardHeader>
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
        <CardHeader><CardTitle>Data</CardTitle><CardDescription>Export everything as CSV.</CardDescription></CardHeader>
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
        <CardHeader><CardTitle>Account</CardTitle><CardDescription>Reset your password or sign out.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => {
            if (!user?.email) return;
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
              redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) return toast.error(error.message);
            toast.success("Password reset link sent to your email.");
          }}><KeyRound className="size-4 mr-2" />Reset password</Button>
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
