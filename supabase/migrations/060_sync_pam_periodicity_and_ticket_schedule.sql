-- Arias Suite — migración 060
-- Sincronización general de periodicidad y primeras fechas desde el PAM.
--
-- Objetivo:
--   - Cada maintenance_plan materializado desde un candidato PAM confirmado
--     conserva la periodicidad derivada de las marcas reales del PAM.
--   - Si el plan aún no tiene fecha de inicio, se toma la primera posición
--     mes/semana real del PAM como start_date.
--   - Los trabajos programados derivados de las marcas reciben su fecha de
--     calendario real.
--   - El generador existente puede materializar en Tickets el trabajo que ya
--     corresponde realizar, sea diario, semanal, quincenal, mensual, etc.
--
-- El bloque Diario de la migración 058 queda respetado: sus 27 planes no se
-- sobreescriben aquí.
--
-- No modifica migraciones anteriores.

BEGIN;

-- 1) Periodicidad: el código/marca del PAM ya tiene una periodicidad derivada
--    en pam_plan_candidates. La llevamos al plan vivo para que el motor de
--    Tickets trabaje con la misma regla.
UPDATE public.maintenance_plans mp
SET
  periodicity_value = c.derived_periodicity_value,
  periodicity_unit = c.derived_periodicity_unit,
  updated_at = now()
FROM public.pam_plan_candidates c
JOIN public.pam_maintenance_plan_links l
  ON l.source_apparatus_id = c.source_apparatus_id
 AND l.mark_code = c.mark_code
 AND l.plan_year = c.plan_year
JOIN public.pam_source_groups psg
  ON psg.id = l.source_group_id
 AND psg.hotel_id = c.hotel_id
 AND psg.source_version = c.source_version
 AND psg.source_sheet = c.source_sheet
 AND psg.source_row = c.source_row
WHERE mp.id = l.maintenance_plan_id
  AND mp.active = true
  AND c.apparatus_registry_id IS NOT NULL
  AND c.definition_status = 'CONFIRMED'
  AND c.derived_periodicity_unit <> 'VARIABLE'
  AND c.source_row NOT IN (6, 7, 8);

-- 2) Primera fecha: primera marca real del PAM para cada plan.
UPDATE public.maintenance_plans mp
SET
  start_date = COALESCE(
    mp.start_date,
    (
      SELECT public.pam_week_slot_start_date(
        psm.plan_year,
        psm.month_number,
        psm.week_slot
      )
      FROM public.pam_maintenance_plan_links l
      JOIN public.pam_source_groups psg
        ON psg.id = l.source_group_id
      JOIN public.pam_source_marks psm
        ON psm.hotel_id = psg.hotel_id
       AND psm.source_version = psg.source_version
       AND psm.source_sheet = psg.source_sheet
       AND psm.source_row = psg.source_row
       AND psm.source_apparatus_id = l.source_apparatus_id
       AND psm.mark_code = l.mark_code
       AND psm.plan_year = l.plan_year
      WHERE l.maintenance_plan_id = mp.id
      ORDER BY psm.plan_year, psm.month_number, psm.week_slot, psm.source_column, psm.id
      LIMIT 1
    )
  ),
  updated_at = now()
WHERE mp.active = true
  AND EXISTS (
    SELECT 1
    FROM public.pam_maintenance_plan_links l
    JOIN public.pam_plan_candidates c
      ON c.source_apparatus_id = l.source_apparatus_id
     AND c.mark_code = l.mark_code
     AND c.plan_year = l.plan_year
    JOIN public.pam_source_groups psg
      ON psg.id = l.source_group_id
     AND psg.hotel_id = c.hotel_id
     AND psg.source_version = c.source_version
     AND psg.source_sheet = c.source_sheet
     AND psg.source_row = c.source_row
    WHERE l.maintenance_plan_id = mp.id
      AND c.apparatus_registry_id IS NOT NULL
      AND c.definition_status = 'CONFIRMED'
      AND c.derived_periodicity_unit <> 'VARIABLE'
  );

-- 3) Fecha real de cada marca PAM ya materializada como trabajo programado.
UPDATE public.maintenance_scheduled_jobs j
SET
  scheduled_date = public.pam_week_slot_start_date(
    j.plan_year,
    j.month_number,
    j.week_slot
  ),
  updated_at = now()
WHERE j.scheduled_date IS NULL;

-- 4) Materializamos los trabajos programados que todavía no existan para
--    todas las marcas PAM enlazadas a planes activos.
INSERT INTO public.maintenance_scheduled_jobs (
  hotel_id,
  maintenance_plan_id,
  source_mark_id,
  plan_year,
  month_number,
  week_slot,
  scheduled_date,
  status
)
SELECT
  psm.hotel_id,
  l.maintenance_plan_id,
  psm.id,
  psm.plan_year,
  psm.month_number,
  psm.week_slot,
  public.pam_week_slot_start_date(
    psm.plan_year,
    psm.month_number,
    psm.week_slot
  ),
  'PENDING'
FROM public.pam_source_marks psm
JOIN public.pam_source_groups psg
  ON psg.hotel_id = psm.hotel_id
 AND psg.source_version = psm.source_version
 AND psg.source_sheet = psm.source_sheet
 AND psg.source_row = psm.source_row
JOIN public.pam_maintenance_plan_links l
  ON l.source_group_id = psg.id
 AND l.source_apparatus_id = psm.source_apparatus_id
 AND l.mark_code = psm.mark_code
 AND l.plan_year = psm.plan_year
JOIN public.maintenance_plans mp
  ON mp.id = l.maintenance_plan_id
 AND mp.active = true
WHERE psm.apparatus_registry_id IS NOT NULL
ON CONFLICT (maintenance_plan_id, source_mark_id) DO NOTHING;

-- 5) El motor existente crea ahora los Tickets que por fecha ya correspondan.
DO $$
BEGIN
  PERFORM public.generate_maintenance_work_orders();
END;
$$;

COMMIT;
