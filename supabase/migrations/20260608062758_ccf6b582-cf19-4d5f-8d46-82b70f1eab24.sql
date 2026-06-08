
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_days integer NOT NULL DEFAULT 90;

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_habits_project ON public.habits(project_id);
