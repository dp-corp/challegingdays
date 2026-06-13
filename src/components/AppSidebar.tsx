import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Compass,
  Target,
  ListChecks,
  Kanban,
  ClipboardCheck,
  Sparkles,
  BarChart3,
  User,
  LogOut,
  Menu,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/foundation", icon: Compass, label: "Foundation" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/daily", icon: ListChecks, label: "Daily" },
  { to: "/projects", icon: Kanban, label: "Projects" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/finances", icon: DollarSign, label: "Finances" },
  { to: "/review", icon: ClipboardCheck, label: "Review" },
  { to: "/reflections", icon: Sparkles, label: "Reflect" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

function NavLinks({ onClick }: { onClick?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {items.map(({ to, icon: Icon, label }) => {
        const active = path === to || path.startsWith(to + "/");
        return (
          <Link
            key={to}
            to={to}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  const { signOut } = useAuth();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar/60 backdrop-blur sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
        <div className="leading-tight">
          <div className="font-display text-base">90-Day Life OS</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Operating system
          </div>
        </div>
      </div>
      <NavLinks />
      <div className="border-t p-3">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => signOut()}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  const { signOut } = useAuth();
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 backdrop-blur px-4 py-3">
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-accent" />
        <span className="font-display text-base">90-Day Life OS</span>
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-5 border-b">
            <SheetTitle className="font-display text-lg text-left">Menu</SheetTitle>
          </SheetHeader>
          <NavLinks />
          <div className="border-t p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => signOut()}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const bottom = items.slice(0, 5);
  return (
    <nav className="md:hidden sticky bottom-0 z-30 grid grid-cols-5 border-t bg-card/90 backdrop-blur safe-bottom">
      {bottom.map(({ to, icon: Icon, label }) => {
        const active = path === to || path.startsWith(to + "/");
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className="size-5" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
