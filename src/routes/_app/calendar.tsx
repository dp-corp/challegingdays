import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isSameDay } from "date-fns";
import { CalendarDays, Target, ListChecks, DollarSign, Kanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar - 90-Day Life OS" }] }),
});

type Item = { date: string; type: "task" | "goal" | "habit" | "finance" | "project"; title: string; meta?: string; to?: string };

function CalendarPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const [selected, setSelected] = useState<Date>(new Date());

  const q = useQuery({
    queryKey: ["calendar-items", uid],
    queryFn: async () => {
      const [tasks, goals, habitLogs, finance, projects] = await Promise.all([
        supabase.from("tasks").select("id,title,due_date,status").eq("user_id", uid).not("due_date", "is", null),
        supabase.from("goals").select("id,title,target_date,category").eq("user_id", uid).not("target_date", "is", null),
        supabase.from("habit_logs").select("id,log_date,habit_id,habits(name)").eq("user_id", uid).gte("log_date", format(new Date(Date.now() - 1000 * 60 * 60 * 24 * 120), "yyyy-MM-dd")),
        supabase.from("finance_entries" as any).select("id,entry_date,kind,amount,note,category").eq("user_id", uid),
        supabase.from("projects").select("id,name,deadline").eq("user_id", uid).not("deadline", "is", null),
      ]);
      const items: Item[] = [];
      (tasks.data ?? []).forEach((t: any) => items.push({ date: t.due_date, type: "task", title: t.title, meta: t.status, to: "/projects" }));
      (goals.data ?? []).forEach((g: any) => items.push({ date: g.target_date, type: "goal", title: g.title, meta: g.category, to: "/goals" }));
      (habitLogs.data ?? []).forEach((h: any) => items.push({ date: h.log_date, type: "habit", title: h.habits?.name ?? "Habit", to: "/daily" }));
      (finance.data ?? []).forEach((f: any) => items.push({ date: f.entry_date, type: "finance", title: f.note || f.category, meta: `${f.kind === "income" ? "+" : "-"}$${Number(f.amount).toFixed(2)}`, to: "/finances" }));
      (projects.data ?? []).forEach((p: any) => items.push({ date: p.deadline, type: "project", title: p.name, meta: "deadline", to: "/projects" }));
      return items;
    },
  });

  const items = q.data ?? [];
  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) {
      const k = it.date;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [items]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const todays = byDay.get(selectedKey) ?? [];

  const modifiers = {
    hasItems: (d: Date) => byDay.has(format(d, "yyyy-MM-dd")),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl flex items-center gap-2"><CalendarDays className="size-7" /> Calendar</h1>
        <p className="text-muted-foreground text-sm">Tasks, goals, habits, projects and finance in one view.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="p-2">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              modifiers={modifiers}
              modifiersClassNames={{ hasItems: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary" }}
              className="p-2 pointer-events-auto"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{format(selected, "EEEE, MMM d")}</CardTitle></CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : todays.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nothing scheduled.</div>
            ) : (
              <ul className="space-y-2">
                {todays.map((it, i) => <ItemRow key={i} item={it} />)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <ul className="space-y-2">
              {items
                .filter((i) => parseISO(i.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 15)
                .map((it, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{format(parseISO(it.date), "MMM d")}</span>
                    <ItemRow item={it} compact />
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const typeIcon = {
  task: ListChecks, goal: Target, habit: ListChecks, finance: DollarSign, project: Kanban,
} as const;
const typeColor = {
  task: "bg-blue-500/15 text-blue-500",
  goal: "bg-violet-500/15 text-violet-500",
  habit: "bg-emerald-500/15 text-emerald-500",
  finance: "bg-amber-500/15 text-amber-500",
  project: "bg-pink-500/15 text-pink-500",
} as const;

function ItemRow({ item, compact }: { item: Item; compact?: boolean }) {
  const Icon = typeIcon[item.type];
  const body = (
    <div className={`flex items-center gap-2 rounded-md ${compact ? "" : "border p-2.5"} flex-1 min-w-0`}>
      <span className={`size-6 rounded-md inline-flex items-center justify-center ${typeColor[item.type]}`}><Icon className="size-3.5" /></span>
      <span className="text-sm truncate flex-1">{item.title}</span>
      {item.meta && <Badge variant="secondary" className="text-[10px]">{item.meta}</Badge>}
    </div>
  );
  return item.to ? <Link to={item.to} className="contents">{body}</Link> : body;
}
