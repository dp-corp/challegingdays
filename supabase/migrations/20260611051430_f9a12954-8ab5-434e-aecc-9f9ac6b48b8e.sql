
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS shared_completion BOOLEAN NOT NULL DEFAULT false;

-- Allow project members to see habits that belong to a shared project
DROP POLICY IF EXISTS "member_select_project_habits" ON public.habits;
CREATE POLICY "member_select_project_habits" ON public.habits
  FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_project_member(project_id, auth.uid()));

-- Allow project members to see habit_logs for habits in shared projects
DROP POLICY IF EXISTS "member_select_project_habit_logs" ON public.habit_logs;
CREATE POLICY "member_select_project_habit_logs" ON public.habit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = habit_logs.habit_id
      AND h.project_id IS NOT NULL
      AND public.is_project_member(h.project_id, auth.uid())
  ));

-- Allow project members to insert their own logs against project habits
DROP POLICY IF EXISTS "member_insert_project_habit_logs" ON public.habit_logs;
CREATE POLICY "member_insert_project_habit_logs" ON public.habit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = habit_logs.habit_id
      AND h.project_id IS NOT NULL
      AND public.is_project_member(h.project_id, auth.uid())
  ));

-- Allow project members to delete their own logs on project habits
DROP POLICY IF EXISTS "member_delete_project_habit_logs" ON public.habit_logs;
CREATE POLICY "member_delete_project_habit_logs" ON public.habit_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = habit_logs.habit_id
      AND h.project_id IS NOT NULL
      AND public.is_project_member(h.project_id, auth.uid())
  ));

-- Allow co-members of any project to see each other's display name/avatar
DROP POLICY IF EXISTS "co_member_select_profiles" ON public.profiles;
CREATE POLICY "co_member_select_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.project_members m1
      JOIN public.project_members m2 ON m1.project_id = m2.project_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members m
      JOIN public.projects p ON p.id = m.project_id
      WHERE (m.user_id = auth.uid() AND p.user_id = profiles.id)
         OR (p.user_id = auth.uid() AND m.user_id = profiles.id)
    )
  );
