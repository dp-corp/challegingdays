import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics — 90-Day Life OS" }] }),
});

function AnalyticsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const from = format(subDays(new Date(), 89), "yyyy-MM-dd");

  const scoresQ = useQuery({
    queryKey: ["scores-90", uid],
    queryFn: async () => {
      const { data } = await supabase.from("scores").select("*").eq("user_id", uid).gte("score_date", from).order("score_date");
      return data ?? [];
    },
  });
  const reviewsQ = useQuery({
    queryKey: ["reviews-analytics", uid],
    queryFn: async () => {
      const { data } = await supabase.from("weekly_reviews").select("*").eq("user_id", uid).order("week_start");
      return data ?? [];
    },
  });

  const scoreData = (scoresQ.data ?? []).map((s) => ({ date: format(new Date(s.score_date), "MMM d"), score: s.daily_score, habits: s.habits_score, health: s.health_score }));
  const reviewData = (reviewsQ.data ?? []).map((r) => ({ week: format(new Date(r.week_start), "MMM d"), income: r.income_earned ?? 0, savings: r.savings_added ?? 0, energy: r.energy_level ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl md:text-5xl">Analytics</h1>
        <p className="mt-2 text-muted-foreground">The story your data tells.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily score trend</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer><LineChart data={scoreData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="habits" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
          </LineChart></ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Financial growth (weekly)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><BarChart data={reviewData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Energy trend (weekly)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><LineChart data={reviewData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="energy" stroke="var(--chart-4)" strokeWidth={2} />
            </LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
