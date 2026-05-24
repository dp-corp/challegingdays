import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Compass, Target, ListChecks, Kanban, ClipboardCheck, Sparkles, BarChart3, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/foundation", icon: Compass, label: "Foundation" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/daily", icon: ListChecks, label: "Daily" },
  { to: "/projects", icon: Kanban, label: "Projects" },
  { to: "/review", icon: ClipboardCheck, label: "Weekly Review" },
  { to: "/reflections", icon: Sparkles, label: "Reflections" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
] as const;

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-sidebar/60 backdrop-blur">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
        <div className="leading-tight">
          <div className="font-display text-lg">90-Day Life OS</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Operating system</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ to, icon: Icon, label }) => {
          const active = path === to || path.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="size-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 space-y-1">
        <Link to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent/50">
          <User className="size-4" />
          <span className="truncate">{user?.email ?? "Profile"}</span>
        </Link>
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => signOut()}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden sticky bottom-0 z-30 grid grid-cols-5 border-t bg-card/80 backdrop-blur">
      {items.slice(0, 5).map(({ to, icon: Icon, label }) => {
        const active = path === to;
        return (
          <Link key={to} to={to} className={`flex flex-col items-center gap-1 py-2 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className="size-5" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
