-- Arias Suite — migración 005
-- Añade el ámbito de hotel a las tablas operativas existentes.
--
-- IMPORTANTE:
-- Esta migración NO conoce ni contiene nombres de clientes/hoteles.
-- Solo prepara la estructura. La asignación de los datos existentes al hotel
-- actual se realiza como operación de transición de la instalación, no como
-- regla fija del producto.
--
-- hotel_id permanece nullable temporalmente para permitir la transición.
-- Se hará NOT NULL cuando el flujo de alta/selección de hotel esté operativo.

BEGIN;

ALTER TABLE public.apparatus_registry
  ADD COLUMN IF NOT EXISTS hotel_id uuid;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS hotel_id uuid;

ALTER TABLE public.electrical_panels
  ADD COLUMN IF NOT EXISTS hotel_id uuid;

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS hotel_id uuid;

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

COMMIT;
