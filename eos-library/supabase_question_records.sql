CREATE TABLE IF NOT EXISTS public.question_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id text NOT NULL,
  question_index integer NOT NULL,
  nickname text NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms > 0 AND duration_ms < 3600000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_records_unique UNIQUE (exam_id, question_index, nickname)
);

CREATE INDEX IF NOT EXISTS idx_question_records_lookup
  ON public.question_records (exam_id, question_index, duration_ms ASC);

ALTER TABLE public.question_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.question_records TO anon, authenticated;

DROP POLICY IF EXISTS "question_records_select_all" ON public.question_records;
CREATE POLICY "question_records_select_all"
  ON public.question_records FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "question_records_insert_all" ON public.question_records;
CREATE POLICY "question_records_insert_all"
  ON public.question_records FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(trim(nickname)) BETWEEN 1 AND 60);

DROP POLICY IF EXISTS "question_records_update_all" ON public.question_records;
CREATE POLICY "question_records_update_all"
  ON public.question_records FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (length(trim(nickname)) BETWEEN 1 AND 60);

CREATE OR REPLACE FUNCTION public.record_question_speed(
  p_exam_id text,
  p_question_index integer,
  p_nickname text,
  p_duration_ms integer
)
RETURNS TABLE (
  nickname text,
  duration_ms integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF length(trim(COALESCE(p_nickname, ''))) < 1 OR p_duration_ms <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.question_records (exam_id, question_index, nickname, duration_ms, updated_at)
  VALUES (p_exam_id, p_question_index, trim(p_nickname), p_duration_ms, now())
  ON CONFLICT ON CONSTRAINT question_records_unique
  DO UPDATE SET
    duration_ms = LEAST(public.question_records.duration_ms, EXCLUDED.duration_ms),
    updated_at = CASE
      WHEN EXCLUDED.duration_ms < public.question_records.duration_ms THEN now()
      ELSE public.question_records.updated_at
    END;

  RETURN QUERY
  SELECT qr.nickname, qr.duration_ms, qr.updated_at
  FROM public.question_records qr
  WHERE qr.exam_id = p_exam_id AND qr.question_index = p_question_index
  ORDER BY qr.duration_ms ASC, qr.updated_at ASC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_question_speed(text, integer, text, integer) TO anon, authenticated;
