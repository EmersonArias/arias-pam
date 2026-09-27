-- Arias Suite — migración 024
-- Permite repetir alertas de mantenimiento vencido según la configuración.
--
-- No modifica ni reejecuta migraciones anteriores.

BEGIN;

-- Las alertas próximas y de hoy son únicas por vencimiento.
-- Las vencidas pueden repetirse, por lo que no deben estar incluidas
-- en el índice único creado en 022.
DROP INDEX IF EXISTS public.ux_maintenance_alert_date_state;

CREATE UNIQUE INDEX IF NOT EXISTS ux_maintenance_alert_date_state
  ON public.maintenance_alerts (
    maintenance_plan_id,
    alert_type,
    due_date
  )
  WHERE alert_type IN (
    'UPCOMING_REVIEW',
    'DUE_TODAY'
  );

CREATE OR REPLACE FUNCTION public.refresh_maintenance_due_alerts(
  target_hotel_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  plan_record public.maintenance_plans%ROWTYPE;
  config_record public.maintenance_alert_configs%ROWTYPE;
  days_overdue integer;
  days_before integer;
  last_overdue_alert_date date;
  should_create_overdue boolean;
  desired_type text;
  desired_severity text;
  desired_title text;
  desired_message text;
  inserted_count integer := 0;
BEGIN
  IF target_hotel_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND NOT public.has_hotel_access(target_hotel_id)
  THEN
    RAISE EXCEPTION 'No tienes acceso al hotel solicitado.';
  END IF;

  FOR plan_record IN
    SELECT mp.*
    FROM public.maintenance_plans mp
    WHERE mp.active = true
      AND mp.next_due_date IS NOT NULL
      AND (
        target_hotel_id IS NULL
        OR mp.hotel_id = target_hotel_id
      )
      AND (
        auth.uid() IS NULL
        OR public.has_hotel_access(mp.hotel_id)
      )
  LOOP
    SELECT *
      INTO config_record
    FROM public.maintenance_alert_configs mac
    WHERE mac.maintenance_plan_id = plan_record.id;

    days_before := COALESCE(config_record.days_before, 7);

    desired_type := NULL;
    desired_severity := NULL;
    desired_title := NULL;
    desired_message := NULL;

    IF plan_record.next_due_date < CURRENT_DATE THEN
      days_overdue := CURRENT_DATE - plan_record.next_due_date;
      should_create_overdue := config_record.notify_when_overdue IS DISTINCT FROM false;

      IF should_create_overdue THEN
        SELECT MAX(ma.triggered_at::date)
          INTO last_overdue_alert_date
        FROM public.maintenance_alerts ma
        WHERE ma.maintenance_plan_id = plan_record.id
          AND ma.alert_type = 'OVERDUE_REVIEW'
          AND ma.due_date = plan_record.next_due_date
          AND ma.resolved_at IS NULL;

        IF last_overdue_alert_date IS NOT NULL
           AND CURRENT_DATE < last_overdue_alert_date
             + COALESCE(config_record.overdue_repeat_days, 2)
        THEN
          should_create_overdue := false;
        END IF;
      END IF;

      IF should_create_overdue THEN
        desired_type := 'OVERDUE_REVIEW';
        desired_severity := CASE
          WHEN days_overdue >= 7 THEN 'CRITICAL'
          ELSE 'WARNING'
        END;
        desired_title := plan_record.name || ' — mantenimiento vencido';
        desired_message :=
          'El mantenimiento previsto para ' ||
          to_char(plan_record.next_due_date, 'DD/MM/YYYY') ||
          ' lleva ' || days_overdue ||
          CASE WHEN days_overdue = 1 THEN ' día' ELSE ' días' END ||
          ' sin una ejecución real registrada.';
      END IF;

    ELSIF plan_record.next_due_date = CURRENT_DATE THEN
      IF config_record.notify_on_due IS DISTINCT FROM false THEN
        desired_type := 'DUE_TODAY';
        desired_severity := 'WARNING';
        desired_title := plan_record.name || ' — vence hoy';
        desired_message :=
          'El mantenimiento está previsto para hoy. Registra la ejecución real cuando se haya realizado.';
      END IF;

    ELSIF plan_record.next_due_date <= CURRENT_DATE + days_before THEN
      desired_type := 'UPCOMING_REVIEW';
      desired_severity := 'INFO';
      desired_title := plan_record.name || ' — mantenimiento próximo';
      desired_message :=
        'El próximo mantenimiento está previsto para ' ||
        to_char(plan_record.next_due_date, 'DD/MM/YYYY') || '.';
    END IF;

    IF desired_type IS NOT NULL THEN
      INSERT INTO public.maintenance_alerts (
        hotel_id,
        maintenance_plan_id,
        alert_type,
        severity,
        title,
        message,
        due_date
      )
      VALUES (
        plan_record.hotel_id,
        plan_record.id,
        desired_type,
        desired_severity,
        desired_title,
        desired_message,
        plan_record.next_due_date
      )
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        inserted_count := inserted_count + 1;
      END IF;
    END IF;

    -- Al aparecer una nueva fecha/estado, deja resuelta la alerta
    -- correspondiente al ciclo anterior.
    UPDATE public.maintenance_alerts ma
    SET resolved_at = COALESCE(ma.resolved_at, now())
    WHERE ma.maintenance_plan_id = plan_record.id
      AND ma.alert_type IN ('UPCOMING_REVIEW', 'DUE_TODAY')
      AND ma.resolved_at IS NULL
      AND ma.due_date <> plan_record.next_due_date;

    IF plan_record.next_due_date >= CURRENT_DATE THEN
      UPDATE public.maintenance_alerts ma
      SET resolved_at = COALESCE(ma.resolved_at, now())
      WHERE ma.maintenance_plan_id = plan_record.id
        AND ma.alert_type = 'OVERDUE_REVIEW'
        AND ma.resolved_at IS NULL;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_maintenance_due_alerts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_maintenance_due_alerts(uuid) TO authenticated;

COMMIT;
