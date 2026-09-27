-- Arias Suite — migración 006
-- Sistema de codificación configurable por hotel y módulo.
--
-- OBJETIVO:
--   * Los formatos de código no están fijados por el cliente ni por el nombre del hotel.
--   * Arias Suite proporciona valores por defecto.
--   * Cada hotel puede configurar sus propias series antes de empezar a utilizarlas.
--   * Cada serie tiene contador independiente por hotel.
--   * Los números utilizados no se reutilizan.
--
-- Ejemplo de configuración por defecto:
--   Relación de Aparatos      RA- + 4 dígitos
--   Luces de Emergencia       LE- + 4 dígitos
--   Cuadros Eléctricos        CE- + 4 dígitos
--   Bombas                    BM- + 4 dígitos
--   Puertas Cortafuegos       PC- + 4 dígitos
--   Equipos Contra Incendios  EC- + 4 dígitos
--   Calibraciones             CA- + 4 dígitos
--
-- Piscinas y SPA quedan sin código según el estándar actual.
--
-- IMPORTANTE:
-- Esta migración todavía no introduce el selector de hotel ni Login.
-- Mientras exista un único hotel activo, el trigger de aparatos mantiene
-- compatibilidad con la aplicación actual. Cuando existan varios hoteles,
-- la aplicación deberá enviar hotel_id explícitamente.

BEGIN;

-- =========================================================
-- 1. MODELO DE CONFIGURACIÓN DE SERIES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.code_sequence_templates (
  module_code text PRIMARY KEY,
  module_name text NOT NULL,
  code_enabled_by_default boolean NOT NULL DEFAULT true,
  prefix_default text,
  digits_default integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT code_sequence_templates_digits_check
    CHECK (digits_default IS NULL OR digits_default BETWEEN 1 AND 12)
);

CREATE TABLE IF NOT EXISTS public.hotel_code_sequences (
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
  module_code text NOT NULL REFERENCES public.code_sequence_templates(module_code) ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT true,
  prefix text,
  digits integer,
  last_number bigint NOT NULL DEFAULT 0,
  format_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hotel_id, module_code),
  CONSTRAINT hotel_code_sequences_digits_check
    CHECK (digits IS NULL OR digits BETWEEN 1 AND 12),
  CONSTRAINT hotel_code_sequences_last_number_check
    CHECK (last_number >= 0)
);

CREATE INDEX IF NOT EXISTS ix_hotel_code_sequences_hotel_id
  ON public.hotel_code_sequences (hotel_id);

-- =========================================================
-- 2. VALORES POR DEFECTO DE ARIAS SUITE
-- =========================================================

INSERT INTO public.code_sequence_templates (
  module_code,
  module_name,
  code_enabled_by_default,
  prefix_default,
  digits_default
)
VALUES
  ('apparatusregistry', 'Relación de Aparatos', true, 'RA-', 4),
  ('emergencylights', 'Luces de Emergencia', true, 'LE-', 4),
  ('electricalpanels', 'Cuadros Eléctricos', true, 'CE-', 4),
  ('pumps', 'Bombas', true, 'BM-', 4),
  ('firedoors', 'Puertas Cortafuegos', true, 'PC-', 4),
  ('fireequipment', 'Equipos Contra Incendios', true, 'EC-', 4),
  ('calibrations', 'Calibraciones', true, 'CA-', 4),
  ('pools', 'Piscinas', false, NULL, NULL),
  ('spa', 'SPA', false, NULL, NULL)
ON CONFLICT (module_code) DO UPDATE
SET
  module_name = EXCLUDED.module_name;

-- =========================================================
-- 3. INICIALIZACIÓN AUTOMÁTICA DE NUEVOS HOTELES
-- =========================================================

CREATE OR REPLACE FUNCTION public.initialize_hotel_code_sequences(
  target_hotel_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $
BEGIN
  INSERT INTO public.hotel_code_sequences (
    hotel_id,
    module_code,
    enabled,
    prefix,
    digits,
    last_number,
    format_locked
  )
  SELECT
    target_hotel_id,
    t.module_code,
    t.code_enabled_by_default,
    t.prefix_default,
    t.digits_default,
    0,
    false
  FROM public.code_sequence_templates t
  ON CONFLICT (hotel_id, module_code) DO NOTHING;
END;
$;

REVOKE ALL ON FUNCTION public.initialize_hotel_code_sequences(uuid) FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_initialize_hotel_code_sequences
ON public.hotels;

CREATE TRIGGER trg_initialize_hotel_code_sequences
AFTER INSERT ON public.hotels
FOR EACH ROW
EXECUTE FUNCTION public.initialize_hotel_code_sequences(NEW.id);

-- =========================================================
-- 4. CONFIGURAR LAS SERIES DE LOS HOTELES EXISTENTES
-- =========================================================

-- Se copia la configuración por defecto únicamente para hoteles que todavía
-- no tienen una configuración de esa serie.
INSERT INTO public.hotel_code_sequences (
  hotel_id,
  module_code,
  enabled,
  prefix,
  digits,
  last_number
)
SELECT
  h.id,
  t.module_code,
  t.code_enabled_by_default,
  t.prefix_default,
  t.digits_default,
  0
FROM public.hotels h
CROSS JOIN public.code_sequence_templates t
WHERE h.active = true
ON CONFLICT (hotel_id, module_code) DO NOTHING;

-- La serie existente de Relación de Aparatos ya tiene registros.
-- Su configuración inicial se sincroniza con el máximo código real.
UPDATE public.hotel_code_sequences s
SET
  enabled = true,
  prefix = COALESCE(s.prefix, 'RA-'),
  digits = COALESCE(s.digits, 4),
  last_number = GREATEST(
    s.last_number,
    COALESCE(
      (
        SELECT MAX(CAST(SUBSTRING(ar.code FROM LENGTH(s.prefix) + 1) AS bigint))
        FROM public.apparatus_registry ar
        WHERE ar.hotel_id = s.hotel_id
          AND ar.code ~ '^RA-[0-9]+$'
      ),
      0
    )
  ),
  format_locked = true,
  updated_at = now()
WHERE s.module_code = 'apparatusregistry';

-- =========================================================
-- 4. ÁMBITO HOTEL DE RELACIÓN DE APARATOS
-- =========================================================

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

DROP INDEX IF EXISTS public.ux_apparatus_registry_code;

CREATE UNIQUE INDEX IF NOT EXISTS ux_apparatus_registry_hotel_code
  ON public.apparatus_registry (hotel_id, code);

-- =========================================================
-- 5. GENERADOR GENÉRICO DE CÓDIGOS
-- =========================================================

CREATE OR REPLACE FUNCTION public.allocate_hotel_code(
  target_hotel_id uuid,
  target_module_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  sequence_record public.hotel_code_sequences%ROWTYPE;
  next_number bigint;
BEGIN
  SELECT *
  INTO sequence_record
  FROM public.hotel_code_sequences
  WHERE hotel_id = target_hotel_id
    AND module_code = target_module_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'No existe configuración de código para el hotel % y módulo %.',
      target_hotel_id,
      target_module_code;
  END IF;

  IF sequence_record.enabled IS NOT TRUE THEN
    RAISE EXCEPTION
      'La codificación está desactivada para el módulo % en el hotel %.',
      target_module_code,
      target_hotel_id;
  END IF;

  IF sequence_record.prefix IS NULL OR sequence_record.digits IS NULL THEN
    RAISE EXCEPTION
      'La configuración de código del módulo % está incompleta.',
      target_module_code;
  END IF;

  UPDATE public.hotel_code_sequences
  SET
    last_number = last_number + 1,
    format_locked = true,
    updated_at = now()
  WHERE hotel_id = target_hotel_id
    AND module_code = target_module_code
  RETURNING last_number INTO next_number;

  RETURN sequence_record.prefix || LPAD(next_number::text, sequence_record.digits, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_hotel_code(uuid, text) FROM PUBLIC;

-- =========================================================
-- 6. TRIGGER DE RELACIÓN DE APARATOS
-- =========================================================

CREATE OR REPLACE FUNCTION public.assign_apparatus_registry_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  resolved_hotel_id uuid;
  active_hotel_count integer;
BEGIN
  resolved_hotel_id := NEW.hotel_id;

  -- Compatibilidad temporal con la aplicación actual.
  -- Cuando haya varios hoteles activos, hotel_id será obligatorio.
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

  NEW.code := public.allocate_hotel_code(
    resolved_hotel_id,
    'apparatusregistry'
  );

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

-- =========================================================
-- 7. CONTINUIDAD CON LA TABLA DE CONTADOR LEGADA
-- =========================================================
--
-- La tabla apparatus_registry_code_counter se conserva porque forma parte
-- del historial de la instalación. Desde esta migración deja de ser la fuente
-- de verdad; hotel_code_sequences es la nueva fuente de verdad.

COMMIT;
