-- Estandariza la relación de aparatos con códigos secuenciales RA-0001, RA-0002, ...
-- y garantiza la asignación transaccional de nuevos códigos.

BEGIN;

CREATE TABLE IF NOT EXISTS public.apparatus_registry_code_counter (
  id boolean PRIMARY KEY DEFAULT true,
  last_number bigint NOT NULL DEFAULT 0,
  CONSTRAINT apparatus_registry_code_counter_id_true
    CHECK (id = true),
  CONSTRAINT apparatus_registry_code_counter_last_number_nonnegative
    CHECK (last_number >= 0)
);

-- Reasigna toda la base existente en el orden actual de código.
-- El paso intermedio evita colisiones si existe una restricción UNIQUE sobre code.
CREATE TEMP TABLE _apparatus_registry_recode (
  id uuid PRIMARY KEY,
  sequence_number bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO _apparatus_registry_recode (id, sequence_number)
SELECT
  id,
  ROW_NUMBER() OVER (ORDER BY code ASC NULLS LAST, id ASC)
FROM public.apparatus_registry;

UPDATE public.apparatus_registry ar
SET code = 'TMP' || LPAD(r.sequence_number::text, 8, '0')
FROM _apparatus_registry_recode r
WHERE ar.id = r.id;

UPDATE public.apparatus_registry ar
SET code = 'RA-' || LPAD(r.sequence_number::text, 4, '0')
FROM _apparatus_registry_recode r
WHERE ar.id = r.id;

INSERT INTO public.apparatus_registry_code_counter (id, last_number)
SELECT true, COALESCE(MAX(sequence_number), 0)
FROM _apparatus_registry_recode
ON CONFLICT (id)
DO UPDATE SET last_number = GREATEST(
  public.apparatus_registry_code_counter.last_number,
  EXCLUDED.last_number
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'apparatus_registry'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(code)%'
  ) THEN
    CREATE UNIQUE INDEX ux_apparatus_registry_code
      ON public.apparatus_registry (code);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.assign_apparatus_registry_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  next_number bigint;
BEGIN
  UPDATE public.apparatus_registry_code_counter
  SET last_number = last_number + 1
  WHERE id = true
  RETURNING last_number INTO next_number;

  IF next_number IS NULL THEN
    INSERT INTO public.apparatus_registry_code_counter (id, last_number)
    VALUES (true, 1)
    ON CONFLICT (id) DO UPDATE
      SET last_number = public.apparatus_registry_code_counter.last_number + 1
    RETURNING last_number INTO next_number;
  END IF;

  NEW.code := 'RA-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_apparatus_registry_code
  ON public.apparatus_registry;

CREATE TRIGGER trg_assign_apparatus_registry_code
BEFORE INSERT ON public.apparatus_registry
FOR EACH ROW
EXECUTE FUNCTION public.assign_apparatus_registry_code();

COMMIT;
