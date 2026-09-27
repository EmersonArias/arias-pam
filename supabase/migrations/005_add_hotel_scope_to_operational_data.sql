-- Arias Suite — migración 005
-- Añade el ámbito de hotel a las tablas operativas existentes.
-- Fase segura: mantiene compatible la aplicación actual.
-- NO activa todavía RLS sobre estas tablas y NO hace hotel_id NOT NULL:
-- eso se hará cuando Login + selección de hotel + permisos estén operativos.

BEGIN;

DO $$
DECLARE
  diagonal_zero_id uuid;
BEGIN
  SELECT id
  INTO diagonal_zero_id
  FROM public.hotels
  WHERE code = 'SB-DZ'
  LIMIT 1;

  IF diagonal_zero_id IS NULL THEN
    RAISE EXCEPTION 'No existe el hotel SB-DZ. La migración 004 debe ejecutarse primero.';
  END IF;

  ALTER TABLE public.apparatus_registry
    ADD COLUMN IF NOT EXISTS hotel_id uuid;

  ALTER TABLE public.assets
    ADD COLUMN IF NOT EXISTS hotel_id uuid;

  ALTER TABLE public.electrical_panels
    ADD COLUMN IF NOT EXISTS hotel_id uuid;

  ALTER TABLE public.inspections
    ADD COLUMN IF NOT EXISTS hotel_id uuid;

  -- Los datos existentes pertenecen actualmente a SB Diagonal Zero.
  UPDATE public.apparatus_registry
  SET hotel_id = diagonal_zero_id
  WHERE hotel_id IS NULL;

  UPDATE public.assets
  SET hotel_id = diagonal_zero_id
  WHERE hotel_id IS NULL;

  UPDATE public.electrical_panels
  SET hotel_id = diagonal_zero_id
  WHERE hotel_id IS NULL;

  -- Las inspecciones heredan el hotel de su activo cuando es posible.
  UPDATE public.inspections i
  SET hotel_id = a.hotel_id
  FROM public.assets a
  WHERE i.asset_id = a.id
    AND i.hotel_id IS NULL;

  -- Si existiera alguna inspección sin activo válido, mantenerla dentro del
  -- único hotel actual para no perder datos en esta transición.
  UPDATE public.inspections
  SET hotel_id = diagonal_zero_id
  WHERE hotel_id IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS ix_apparatus_registry_hotel_id
  ON public.apparatus_registry (hotel_id);

CREATE INDEX IF NOT EXISTS ix_assets_hotel_id
  ON public.assets (hotel_id);

CREATE INDEX IF NOT EXISTS ix_electrical_panels_hotel_id
  ON public.electrical_panels (hotel_id);

CREATE INDEX IF NOT EXISTS ix_inspections_hotel_id
  ON public.inspections (hotel_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'apparatus_registry_hotel_id_fkey'
  ) THEN
    ALTER TABLE public.apparatus_registry
      ADD CONSTRAINT apparatus_registry_hotel_id_fkey
      FOREIGN KEY (hotel_id)
      REFERENCES public.hotels(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assets_hotel_id_fkey'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_hotel_id_fkey
      FOREIGN KEY (hotel_id)
      REFERENCES public.hotels(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'electrical_panels_hotel_id_fkey'
  ) THEN
    ALTER TABLE public.electrical_panels
      ADD CONSTRAINT electrical_panels_hotel_id_fkey
      FOREIGN KEY (hotel_id)
      REFERENCES public.hotels(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inspections_hotel_id_fkey'
  ) THEN
    ALTER TABLE public.inspections
      ADD CONSTRAINT inspections_hotel_id_fkey
      FOREIGN KEY (hotel_id)
      REFERENCES public.hotels(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Contador de códigos RA independiente por hotel.
CREATE TABLE IF NOT EXISTS public.apparatus_registry_code_counters (
  hotel_id uuid PRIMARY KEY REFERENCES public.hotels(id) ON DELETE RESTRICT,
  last_number bigint NOT NULL DEFAULT 0,
  CONSTRAINT apparatus_registry_code_counters_last_number_nonnegative
    CHECK (last_number >= 0)
);

-- Inicializar la serie del hotel actual con el contador existente.
INSERT INTO public.apparatus_registry_code_counters (hotel_id, last_number)
SELECT
  h.id,
  COALESCE(c.last_number, 0)
FROM public.hotels h
LEFT JOIN public.apparatus_registry_code_counter c
  ON c.id = true
WHERE h.code = 'SB-DZ'
ON CONFLICT (hotel_id)
DO UPDATE SET last_number = EXCLUDED.last_number;

CREATE INDEX IF NOT EXISTS ix_apparatus_registry_code_counters_hotel_id
  ON public.apparatus_registry_code_counters (hotel_id);

COMMIT;
