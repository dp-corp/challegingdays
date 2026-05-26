import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppSidebar, MobileNav, MobileTopBar } from "@/components/AppSidebar";
import { useDailyReminder } from "@/lib/use-daily-reminder";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useDailyReminder();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1 w-full mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-5 md:py-8">
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
