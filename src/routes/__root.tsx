import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";

const THEMES: Record<string, { primary: string; accent: string }> = {
  Indigo: { primary: "oklch(0.7 0.18 265)", accent: "oklch(0.78 0.16 65)" },
  Emerald: { primary: "oklch(0.72 0.17 150)", accent: "oklch(0.82 0.16 75)" },
  Rose: { primary: "oklch(0.7 0.2 350)", accent: "oklch(0.78 0.16 65)" },
  Cyan: { primary: "oklch(0.75 0.15 200)", accent: "oklch(0.78 0.16 65)" },
  Amber: { primary: "oklch(0.78 0.16 75)", accent: "oklch(0.72 0.17 150)" },
  Violet: { primary: "oklch(0.68 0.22 305)", accent: "oklch(0.75 0.15 200)" },
};


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "90-Day Life OS — Transform your next 90 days" },
      { name: "description", content: "Goals, habits, projects, weekly reviews, and AI-powered reflections. Your operating system for the next 90 days." },
      { property: "og:title", content: "90-Day Life OS — Transform your next 90 days" },
      { name: "twitter:title", content: "90-Day Life OS — Transform your next 90 days" },
      { property: "og:description", content: "Goals, habits, projects, weekly reviews, and AI-powered reflections. Your operating system for the next 90 days." },
      { name: "twitter:description", content: "Goals, habits, projects, weekly reviews, and AI-powered reflections. Your operating system for the next 90 days." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b7a5b546-2d8d-4f26-90d0-11e1239a8f41" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b7a5b546-2d8d-4f26-90d0-11e1239a8f41" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) document.documentElement.classList.toggle("dark", saved === "dark");
    const accent = localStorage.getItem("theme_accent");
    const t = accent && THEMES[accent];
    if (t) {
      const r = document.documentElement;
      r.style.setProperty("--primary", t.primary);
      r.style.setProperty("--accent", t.accent);
      r.style.setProperty("--ring", t.primary);
      r.style.setProperty("--chart-1", t.primary);
      r.style.setProperty("--chart-2", t.accent);
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
