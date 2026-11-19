-- Per-question notes, synced by nickname (same no-password model as users/study_history).
-- Deleted notes are kept as tombstones (content = '') so deletions sync across devices.
CREATE TABLE IF NOT EXISTS public.question_notes (
  nickname text NOT NULL CHECK (char_length(trim(nickname)) BETWEEN 1 AND 60),
  exam_id text NOT NULL CHECK (char_length(exam_id) BETWEEN 1 AND 200),
  question_index integer NOT NULL CHECK (question_index > 0),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 5000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_notes_pkey PRIMARY KEY (nickname, exam_id, question_index)
);

ALTER TABLE public.question_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.question_notes TO anon, authenticated;

DROP POLICY IF EXISTS "question_notes_select_all" ON public.question_notes;
CREATE POLICY "question_notes_select_all"
  ON public.question_notes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "question_notes_insert_all" ON public.question_notes;
CREATE POLICY "question_notes_insert_all"
  ON public.question_notes FOR INSERT
  TO anon, authenticated
  WITH CHECK (char_length(trim(nickname)) BETWEEN 1 AND 60);

DROP POLICY IF EXISTS "question_notes_update_all" ON public.question_notes;
CREATE POLICY "question_notes_update_all"
  ON public.question_notes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (char_length(trim(nickname)) BETWEEN 1 AND 60);
