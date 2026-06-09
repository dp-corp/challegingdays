CREATE TABLE public.finance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  note TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_finance_user_date ON public.finance_entries(user_id, entry_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select_finance" ON public.finance_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert_finance" ON public.finance_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_finance" ON public.finance_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_finance" ON public.finance_entries FOR DELETE USING (auth.uid() = user_id);