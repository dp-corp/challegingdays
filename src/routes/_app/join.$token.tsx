import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/join/$token")({
  component: JoinPage,
  head: () => ({ meta: [{ title: "Join project - 90-Day Life OS" }] }),
});

function JoinPage() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("Looking up invite…");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: invite, error } = await supabase
        .from("project_invites" as any)
        .select("project_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (error || !invite) { setStatus("Invite not found or expired."); return; }
      const inv = invite as any;
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) { setStatus("This invite has expired."); return; }
      const { error: mErr } = await supabase
        .from("project_members" as any)
        .upsert({ project_id: inv.project_id, user_id: user.id, role: "member" }, { onConflict: "project_id,user_id" });
      if (mErr) { setStatus(mErr.message); return; }
      toast.success("You joined the project");
      navigate({ to: "/projects/$projectId", params: { projectId: inv.project_id }, replace: true });
    })();
  }, [user, token, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-3">
          <Loader2 className="size-6 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </div>
  );
}
