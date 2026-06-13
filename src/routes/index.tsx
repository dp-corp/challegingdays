import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Flame, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "90-Day Life OS - Your operating system for transformation" },
      {
        name: "description",
        content:
          "Set goals, build habits, run projects, and reflect daily. A simple 90-day system for ambitious people.",
      },
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
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto flex items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-accent" />
          <span className="font-display text-lg">90-Day Life OS</span>
        </Link>
        <Link to="/login">
          <Button size="sm">Sign in</Button>
        </Link>
      </header>

      <section className="container mx-auto flex-1 px-5 pt-10 pb-16 text-center max-w-2xl flex flex-col items-center justify-center">
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.05]">
          Transform your life
          <br />
          <span className="gradient-text italic">in 90 days.</span>
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-md">
          A simple, focused system for goals, habits, projects, and reflection - built for ambitious
          lives.
        </p>
        <Link to="/login" className="mt-8">
          <Button size="lg" className="h-12 px-7 text-base">
            Start your 90 days <ArrowRight className="ml-1 size-4" />
          </Button>
        </Link>

        <div className="mt-14 grid gap-3 sm:grid-cols-3 w-full">
          {[
            { Icon: Target, title: "Set goals" },
            { Icon: Flame, title: "Build streaks" },
            { Icon: TrendingUp, title: "Track progress" },
          ].map(({ Icon, title }) => (
            <div key={title} className="glass rounded-2xl p-5 flex flex-col items-center gap-2">
              <Icon className="size-5 text-primary" />
              <div className="font-display text-base">{title}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Built for the next 90 days of your life.
      </footer>
    </div>
  );
}
