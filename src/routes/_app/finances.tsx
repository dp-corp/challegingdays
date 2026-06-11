import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/DatePicker";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/finances")({
  component: Finances,
  head: () => ({ meta: [{ title: "Finances - 90-Day Life OS" }] }),
});

type Entry = {
  id: string;
  kind: "income" | "expense";
  amount: number;
  category: string;
  note: string | null;
  entry_date: string;
};

function Finances() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();

  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<string | null>(format(new Date(), "yyyy-MM-dd"));
  const [openingDraft, setOpeningDraft] = useState<string>("");

  const profileQ = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("opening_balance").eq("id", uid).maybeSingle();
      return (data as any) ?? { opening_balance: 0 };
    },
  });
  const opening = Number(profileQ.data?.opening_balance ?? 0);

  const entriesQ = useQuery({
    queryKey: ["finance", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_entries" as any)
        .select("*")
        .eq("user_id", uid)
        .order("entry_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
  });

  const saveOpening = useMutation({
    mutationFn: async () => {
      const v = parseFloat(openingDraft);
      if (Number.isNaN(v)) throw new Error("Enter a number");
      const { error } = await supabase.from("profiles").update({ opening_balance: v } as any).eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => { setOpeningDraft(""); qc.invalidateQueries({ queryKey: ["profile", uid] }); toast.success("Opening balance saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const add = useMutation({
    mutationFn: async () => {
      const a = parseFloat(amount);
      if (!a || a <= 0) throw new Error("Enter an amount");
      const { error } = await supabase.from("finance_entries" as any).insert({
        user_id: uid,
        kind,
        amount: a,
        category: category || "general",
        note: note || null,
        entry_date: date || format(new Date(), "yyyy-MM-dd"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAmount(""); setNote("");
      qc.invalidateQueries({ queryKey: ["finance", uid] });
      toast.success("Entry added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_entries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", uid] }),
  });

  const entries = entriesQ.data ?? [];
  const totals = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    let income = 0, expense = 0, mIncome = 0, mExpense = 0;
    for (const e of entries) {
      const v = Number(e.amount);
      if (e.kind === "income") income += v; else expense += v;
      if (new Date(e.entry_date) >= monthStart) {
        if (e.kind === "income") mIncome += v; else mExpense += v;
      }
    }
    return { income, expense, balance: opening + income - expense, mIncome, mExpense, mBalance: mIncome - mExpense };
  }, [entries]);

  const chartData = useMemo(() => {
    const buckets: Record<string, { month: string; income: number; expense: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(startOfMonth(new Date()), i);
      const key = format(d, "yyyy-MM");
      buckets[key] = { month: format(d, "MMM"), income: 0, expense: 0 };
    }
    for (const e of entries) {
      const key = e.entry_date.slice(0, 7);
      if (buckets[key]) {
        if (e.kind === "income") buckets[key].income += Number(e.amount);
        else buckets[key].expense += Number(e.amount);
      }
    }
    return Object.values(buckets);
  }, [entries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Finances</h1>
        <p className="text-muted-foreground text-sm">Track income, expenses and monthly flow.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Balance" value={totals.balance} icon={<Wallet className="size-4" />} tone="default" />
        <StatCard label="Income (all-time)" value={totals.income} icon={<TrendingUp className="size-4" />} tone="up" />
        <StatCard label="Expense (all-time)" value={totals.expense} icon={<TrendingDown className="size-4" />} tone="down" />
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="size-4 text-primary" />Starting balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Set the balance you're starting from. Income and expenses below add and subtract from this.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Current balance</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input type="number" step="0.01" placeholder={opening.toFixed(2)} value={openingDraft} onChange={(e) => setOpeningDraft(e.target.value)} className="pl-7 h-11" />
              </div>
            </div>
            <Button onClick={() => saveOpening.mutate()} disabled={saveOpening.isPending || openingDraft === ""} className="h-11">Save balance</Button>
          </div>
          <div className="text-xs text-muted-foreground">Saved: <span className="font-mono font-medium text-foreground">${opening.toFixed(2)}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">This month</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div><div className="text-muted-foreground">Income</div><div className="font-display text-2xl text-emerald-500">${totals.mIncome.toFixed(2)}</div></div>
          <div><div className="text-muted-foreground">Expense</div><div className="font-display text-2xl text-rose-500">${totals.mExpense.toFixed(2)}</div></div>
          <div><div className="text-muted-foreground">Net</div><div className="font-display text-2xl">${totals.mBalance.toFixed(2)}</div></div>
        </CardContent>
      </Card>

      <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Plus className="size-4 text-accent" />Add entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <div className="mt-1"><DatePicker value={date} onChange={setDate} /></div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setKind("expense")} className={`h-11 rounded-md border text-sm font-medium transition flex items-center justify-center gap-2 ${kind === "expense" ? "bg-rose-500/10 border-rose-500/50 text-rose-500" : "hover:bg-muted/40"}`}>
                <TrendingDown className="size-4" />Expense
              </button>
              <button type="button" onClick={() => setKind("income")} className={`h-11 rounded-md border text-sm font-medium transition flex items-center justify-center gap-2 ${kind === "income" ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" : "hover:bg-muted/40"}`}>
                <TrendingUp className="size-4" />Income
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="food, rent, salary…" className="mt-1 h-11" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="pl-7 h-11" />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Note</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional details — supports multiple lines" className="mt-1 resize-none" />
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending} className="w-full h-11">
            <Plus className="size-4 mr-1" /> Add entry
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Last 6 months</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent entries</CardTitle></CardHeader>
        <CardContent>
          {entriesQ.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No entries yet.</div>
          ) : (
            <ul className="divide-y">
              {entries.slice(0, 50).map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <div className={`size-2 rounded-full ${e.kind === "income" ? "bg-emerald-500" : "bg-rose-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{e.note || e.category}</div>
                    <div className="text-xs text-muted-foreground">{e.category} • {format(new Date(e.entry_date), "MMM d, yyyy")}</div>
                  </div>
                  <div className={`font-mono text-sm ${e.kind === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                    {e.kind === "income" ? "+" : "-"}${Number(e.amount).toFixed(2)}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "up" | "down" | "default" }) {
  const color = tone === "up" ? "text-emerald-500" : tone === "down" ? "text-rose-500" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className={`font-display text-2xl mt-1 ${color}`}>${value.toFixed(2)}</div>
      </CardContent>
    </Card>
  );
}
