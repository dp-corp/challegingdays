import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Flame, TrendingUp, Sparkles, CheckCircle2, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "90-Day Life OS — Your operating system for transformation" },
      { name: "description", content: "Set goals, build habits, run projects, and reflect daily. A 90-day system used by ambitious entrepreneurs, professionals, and students." },
      { property: "og:title", content: "90-Day Life OS" },
      { property: "og:description", content: "Your operating system for the next 90 days." },
    ],
  }),
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
          <span className="font-display text-xl">90-Day Life OS</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/login"><Button>Start free</Button></Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-accent" />
          The operating system for ambitious lives
        </div>
        <h1 className="font-display mt-6 text-6xl md:text-7xl leading-[1.05]">
          Transform your life in the<br />
          <span className="gradient-text italic">next 90 days.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Goals, habits, projects, weekly reviews, and an AI reflection coach — one focused system to ship the version of yourself you've been postponing.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg" className="h-12 px-6 text-base">
              Start your 90 days <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            { Icon: Target, title: "Set the goals that matter", body: "One word. One dream outcome. Six aligned goals across business, health, money, learning, and relationships." },
            { Icon: Flame, title: "Build unstoppable streaks", body: "Track morning, work, and personal habits. Watch your consistency compound day after day." },
            { Icon: TrendingUp, title: "Score every day", body: "Get a daily, weekly, and monthly grade across habits, goals, projects, health, and learning." },
            { Icon: CheckCircle2, title: "Ship real projects", body: "A clean kanban for the work that actually moves the needle. Backlog → Done." },
            { Icon: BarChart3, title: "Review every Sunday", body: "Structured weekly reviews. Wins, lessons, challenges, and next week's top 3 priorities." },
            { Icon: Sparkles, title: "Reflect with AI", body: "Evening prompts and AI summaries that turn raw thought into clarity and momentum." },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="glass rounded-2xl p-6 text-left">
              <Icon className="size-5 text-primary" />
              <h3 className="font-display mt-3 text-2xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        Built for the next 90 days of your life.
      </footer>
    </div>
  );
}
