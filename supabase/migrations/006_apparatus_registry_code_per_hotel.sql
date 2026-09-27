-- Arias Suite — migración 006
-- Numeración RA independiente por hotel.
--
-- Objetivo:
--   Hotel A -> RA-0001, RA-0002, ...
--   Hotel B -> RA-0001, RA-0002, ...
--
-- La serie no se reutiliza: el contador de cada hotel solo avanza.
-- Mientras exista un único hotel activo, una creación realizada por la
-- aplicación actual puede omitir hotel_id y la base de datos asignará ese hotel.
-- Cuando existan varios hoteles activos, la aplicación deberá enviar hotel_id.

BEGIN;

-- Comprobación de transición: todos los aparatos actuales deben pertenecer a un hotel.
DO $$
DECLARE
  orphan_count bigint;
BEGIN
  SELECT COUNT(*)
  INTO orphan_count
  FROM public.apparatus_registry
  WHERE hotel_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'No se puede completar la migración 006: existen % aparatos sin hotel_id.',
      orphan_count;
  END IF;
END $$;

-- El código pasa a ser único dentro del hotel, no globalmente.
DROP INDEX IF EXISTS public.ux_apparatus_registry_code;

CREATE UNIQUE INDEX IF NOT EXISTS ux_apparatus_registry_hotel_code
  ON public.apparatus_registry (hotel_id, code);

-- Asegurar que existe una fila de contador para cada hotel que ya tenga aparatos,
-- inicializada con el máximo código existente de ese hotel.
INSERT INTO public.apparatus_registry_code_counters (hotel_id, last_number)
SELECT
  ar.hotel_id,
  COALESCE(
    MAX(
      CASE
        WHEN ar.code ~ '^RA-[0-9]+$'
        THEN CAST(SUBSTRING(ar.code FROM 4) AS bigint)
        ELSE 0
      END
    ),
    0
  ) AS last_number
FROM public.apparatus_registry ar
GROUP BY ar.hotel_id
ON CONFLICT (hotel_id)
DO UPDATE SET
  last_number = GREATEST(
    public.apparatus_registry_code_counters.last_number,
    EXCLUDED.last_number
  );

CREATE OR REPLACE FUNCTION public.assign_apparatus_registry_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  next_number bigint;
  resolved_hotel_id uuid;
  active_hotel_count integer;
BEGIN
  resolved_hotel_id := NEW.hotel_id;

  -- Compatibilidad temporal con la aplicación actual.
  -- Solo es seguro hacerlo mientras exista un único hotel activo.
  IF resolved_hotel_id IS NULL THEN
    SELECT COUNT(*)
    INTO active_hotel_count
    FROM public.hotels
    WHERE active = true;

    IF active_hotel_count <> 1 THEN
      RAISE EXCEPTION
        'hotel_id es obligatorio cuando existen varios hoteles activos.';
    END IF;

    SELECT id
    INTO resolved_hotel_id
    FROM public.hotels
    WHERE active = true
    LIMIT 1;

    NEW.hotel_id := resolved_hotel_id;
  END IF;

  INSERT INTO public.apparatus_registry_code_counters (hotel_id, last_number)
  VALUES (resolved_hotel_id, 0)
  ON CONFLICT (hotel_id) DO NOTHING;

  UPDATE public.apparatus_registry_code_counters
  SET last_number = last_number + 1
  WHERE hotel_id = resolved_hotel_id
  RETURNING last_number INTO next_number;

  NEW.code := 'RA-' || LPAD(next_number::text, 4, '0');

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_apparatus_registry_code() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_assign_apparatus_registry_code
ON public.apparatus_registry;

CREATE TRIGGER trg_assign_apparatus_registry_code
BEFORE INSERT ON public.apparatus_registry
FOR EACH ROW
EXECUTE FUNCTION public.assign_apparatus_registry_code();

COMMIT;
