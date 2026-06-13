-- Add payment_method column to finance_entries
ALTER TABLE public.finance_entries ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';

-- Update projects update policy to allow members to update projects (e.g. toggling shared completion)
DROP POLICY IF EXISTS own_update_projects ON public.projects;
DROP POLICY IF EXISTS member_or_owner_update_projects ON public.projects;
CREATE POLICY member_or_owner_update_projects ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_project_member(id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_project_member(id, auth.uid()));
