-- Projects: Add project_type
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'Personal or Passion';

-- Goals: Add goal_type and parent_goal_id
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'monthly'; -- 'monthly' or 'weekly'
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE;

-- Tasks: Add goal_id to link tasks to goals
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'daily'; -- 'daily', 'weekly', 'monthly'

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goals_parent_goal_id ON public.goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);
