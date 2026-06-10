
-- 1) opening_balance on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

-- 2) project_members
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Security-definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m WHERE m.project_id = _project_id AND m.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.user_id = _user_id);
$$;

CREATE POLICY pm_select ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY pm_insert ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.is_project_owner(project_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY pm_delete ON public.project_members FOR DELETE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()) OR user_id = auth.uid());

-- 3) project_invites
CREATE TABLE IF NOT EXISTS public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.project_invites TO authenticated;
GRANT ALL ON public.project_invites TO service_role;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can look up an invite by token (to accept). They learn only project_id.
CREATE POLICY pi_select ON public.project_invites FOR SELECT TO authenticated USING (true);
CREATE POLICY pi_insert ON public.project_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_project_owner(project_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY pi_delete ON public.project_invites FOR DELETE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()));

-- 4) Update projects policies so members can view; only owner can edit/delete (insert unchanged)
DROP POLICY IF EXISTS own_select_projects ON public.projects;
CREATE POLICY member_or_owner_select_projects ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_project_member(id, auth.uid()));
