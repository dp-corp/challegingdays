
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  challenge_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foundation
CREATE TABLE public.foundation (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  one_word TEXT,
  dream_outcome TEXT,
  why_matters TEXT,
  success_headline TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL, -- number_one, business, health, financial, learning, relationship
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  progress INT NOT NULL DEFAULT 0,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habits
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'personal', -- morning, work, personal, custom
  target_per_day INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habit logs
CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, log_date)
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  progress INT NOT NULL DEFAULT 0,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks (kanban)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog', -- backlog, todo, in_progress, review, completed
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weekly reviews
CREATE TABLE public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_start DATE NOT NULL,
  wins TEXT,
  lessons TEXT,
  challenges TEXT,
  exercise_days INT,
  weight NUMERIC,
  energy_level INT,
  career_accomplishments TEXT,
  income_earned NUMERIC,
  savings_added NUMERIC,
  important_connections TEXT,
  next_week_priorities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

-- Reflections
CREATE TABLE public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  biggest_win TEXT,
  challenge TEXT,
  gratitude TEXT,
  tomorrow_focus TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, reflection_date)
);

-- Daily scores
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  habits_score INT NOT NULL DEFAULT 0,
  goals_score INT NOT NULL DEFAULT 0,
  projects_score INT NOT NULL DEFAULT 0,
  health_score INT NOT NULL DEFAULT 0,
  learning_score INT NOT NULL DEFAULT 0,
  daily_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, score_date)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foundation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Generic owner policies
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','foundation','goals','habits','habit_logs','projects','tasks','weekly_reviews','achievements','reflections','scores'])
  LOOP
    EXECUTE format('CREATE POLICY "own_select_%s" ON public.%I FOR SELECT USING (auth.uid() = %s)', t, t, CASE WHEN t='profiles' OR t='foundation' THEN (CASE WHEN t='profiles' THEN 'id' ELSE 'user_id' END) ELSE 'user_id' END);
    EXECUTE format('CREATE POLICY "own_insert_%s" ON public.%I FOR INSERT WITH CHECK (auth.uid() = %s)', t, t, CASE WHEN t='profiles' THEN 'id' ELSE 'user_id' END);
    EXECUTE format('CREATE POLICY "own_update_%s" ON public.%I FOR UPDATE USING (auth.uid() = %s)', t, t, CASE WHEN t='profiles' THEN 'id' ELSE 'user_id' END);
    EXECUTE format('CREATE POLICY "own_delete_%s" ON public.%I FOR DELETE USING (auth.uid() = %s)', t, t, CASE WHEN t='profiles' THEN 'id' ELSE 'user_id' END);
  END LOOP;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.foundation (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_goals_user ON public.goals(user_id);
CREATE INDEX idx_habits_user ON public.habits(user_id);
CREATE INDEX idx_habit_logs_user_date ON public.habit_logs(user_id, log_date);
CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_tasks_user_project ON public.tasks(user_id, project_id);
CREATE INDEX idx_reflections_user_date ON public.reflections(user_id, reflection_date);
CREATE INDEX idx_scores_user_date ON public.scores(user_id, score_date);
