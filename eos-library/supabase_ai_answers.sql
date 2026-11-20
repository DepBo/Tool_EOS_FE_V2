-- Shared AI answer verification cache (populated on demand via /api/ai-check).
CREATE TABLE IF NOT EXISTS public.ai_answers (
  exam_id text NOT NULL CHECK (char_length(exam_id) BETWEEN 1 AND 200),
  question_index integer NOT NULL CHECK (question_index > 0),
  model text NOT NULL DEFAULT 'gemini-3-flash-preview',
  ai_answer text NOT NULL CHECK (char_length(ai_answer) BETWEEN 1 AND 20),
  confidence text NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 3000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_answers_pkey PRIMARY KEY (exam_id, question_index)
);

ALTER TABLE public.ai_answers ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.ai_answers TO anon, authenticated;

DROP POLICY IF EXISTS "ai_answers_select_all" ON public.ai_answers;
CREATE POLICY "ai_answers_select_all"
  ON public.ai_answers FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "ai_answers_insert_all" ON public.ai_answers;
CREATE POLICY "ai_answers_insert_all"
  ON public.ai_answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (char_length(exam_id) BETWEEN 1 AND 200 AND question_index > 0);

DROP POLICY IF EXISTS "ai_answers_update_all" ON public.ai_answers;
CREATE POLICY "ai_answers_update_all"
  ON public.ai_answers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (char_length(exam_id) BETWEEN 1 AND 200 AND question_index > 0);
