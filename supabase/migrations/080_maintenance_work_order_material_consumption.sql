-- Arias Suite — migración 080
-- Consumo de materiales por OT con descuento transaccional y trazabilidad.
-- Requiere el esquema de stock físico de la migración 078.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.maintenance_material_catalog') IS NULL
     OR to_regclass('public.maintenance_stock_movements') IS NULL
     OR to_regclass('public.maintenance_work_orders') IS NULL THEN
    RAISE EXCEPTION 'No están disponibles las tablas necesarias para la migración 080; verifica primero el historial de migraciones.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'maintenance_material_catalog'
      AND column_name = 'stock_verified'
  ) THEN
    RAISE EXCEPTION 'Falta el esquema de stock físico de la migración 078.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.maintenance_work_order_material_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
  work_order_id uuid NOT NULL REFERENCES public.maintenance_work_orders(id) ON DELETE RESTRICT,
  material_id uuid NOT NULL REFERENCES public.maintenance_material_catalog(id) ON DELETE RESTRICT,
  stock_movement_id uuid NOT NULL UNIQUE REFERENCES public.maintenance_stock_movements(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL UNIQUE,
  material_description text NOT NULL,
  material_order_code text NOT NULL,
  material_reference_code text,
  unit_of_measure text NOT NULL,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  reason text NOT NULL CHECK (length(btrim(reason)) >= 2),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_work_order_material_consumptions_ticket_date
  ON public.maintenance_work_order_material_consumptions (hotel_id, work_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_work_order_material_consumptions_material_date
  ON public.maintenance_work_order_material_consumptions (hotel_id, material_id, created_at DESC);

ALTER TABLE public.maintenance_work_order_material_consumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS maintenance_work_order_material_consumptions_select ON public.maintenance_work_order_material_consumptions;
CREATE POLICY maintenance_work_order_material_consumptions_select
  ON public.maintenance_work_order_material_consumptions FOR SELECT TO authenticated
  USING (public.has_hotel_permission(hotel_id, 'maintenance.view'));

REVOKE ALL ON TABLE public.maintenance_work_order_material_consumptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.maintenance_work_order_material_consumptions TO authenticated;

CREATE OR REPLACE FUNCTION public.record_maintenance_work_order_material_consumption(
  target_hotel_id uuid, target_work_order_id uuid, target_material_id uuid,
  target_quantity numeric, target_reason text, target_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  work_order_record public.maintenance_work_orders%ROWTYPE;
  material_record public.maintenance_material_catalog%ROWTYPE;
  prior_consumption public.maintenance_work_order_material_consumptions%ROWTYPE;
  before_quantity numeric(12,2);
  after_quantity numeric(12,2);
  movement_id uuid;
  consumption_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_hotel_permission(target_hotel_id, 'maintenance.update') THEN
    RAISE EXCEPTION 'No tienes permiso para registrar consumos de material en este hotel.';
  END IF;
  IF target_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Falta la clave de seguridad del consumo; vuelve a intentarlo.';
  END IF;
  IF target_quantity IS NULL OR target_quantity <= 0 OR round(target_quantity, 2) <> target_quantity THEN
    RAISE EXCEPTION 'La cantidad consumida debe ser mayor que cero y tener como máximo dos decimales.';
  END IF;
  IF length(btrim(coalesce(target_reason, ''))) < 2 THEN
    RAISE EXCEPTION 'Indica el detalle del consumo.';
  END IF;

  -- Serialize retries carrying the same key to prevent duplicate stock deductions.
  PERFORM pg_advisory_xact_lock(hashtextextended(target_idempotency_key::text, 0));
  SELECT * INTO prior_consumption FROM public.maintenance_work_order_material_consumptions
  WHERE idempotency_key = target_idempotency_key;
  IF FOUND THEN
    IF prior_consumption.hotel_id <> target_hotel_id
       OR prior_consumption.work_order_id <> target_work_order_id
       OR prior_consumption.material_id <> target_material_id
       OR prior_consumption.quantity <> target_quantity THEN
      RAISE EXCEPTION 'La clave de reintento ya se utilizó con otros datos. No se ha descontado stock.';
    END IF;
    RETURN jsonb_build_object('id', prior_consumption.id, 'stock_movement_id', prior_consumption.stock_movement_id, 'already_recorded', true);
  END IF;

  SELECT * INTO work_order_record FROM public.maintenance_work_orders
  WHERE id = target_work_order_id AND hotel_id = target_hotel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La OT no existe o pertenece a otro hotel.'; END IF;
  IF work_order_record.status IN ('COMPLETED', 'REJECTED') THEN
    RAISE EXCEPTION 'No se puede registrar consumo en una OT cerrada o rechazada.';
  END IF;

  SELECT * INTO material_record FROM public.maintenance_material_catalog
  WHERE id = target_material_id AND hotel_id = target_hotel_id AND active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El material no existe, está inactivo o pertenece a otro hotel.'; END IF;
  IF NOT material_record.stock_verified THEN
    RAISE EXCEPTION 'El stock del material no está inventariado. Registra primero un conteo físico.';
  END IF;

  before_quantity := material_record.stock_quantity;
  after_quantity := before_quantity - target_quantity;
  IF after_quantity < 0 THEN
    RAISE EXCEPTION 'No hay stock suficiente. Disponible: % %.', before_quantity, material_record.unit_of_measure;
  END IF;

  UPDATE public.maintenance_material_catalog
  SET stock_quantity = after_quantity, updated_by = auth.uid(), updated_at = now()
  WHERE id = material_record.id;

  INSERT INTO public.maintenance_stock_movements (
    hotel_id, material_id, movement_type, quantity_delta, stock_before, stock_after,
    reason, reference, created_by
  )
  VALUES (
    target_hotel_id, target_material_id, 'ISSUE', -target_quantity, before_quantity, after_quantity,
    btrim(target_reason), 'OT ' || work_order_record.ot_number || ' · ' || target_idempotency_key::text, auth.uid()
  )
  RETURNING id INTO movement_id;

  INSERT INTO public.maintenance_work_order_material_consumptions (
    hotel_id, work_order_id, material_id, stock_movement_id, idempotency_key,
    material_description, material_order_code, material_reference_code, unit_of_measure,
    quantity, reason, created_by
  )
  VALUES (
    target_hotel_id, target_work_order_id, target_material_id, movement_id, target_idempotency_key,
    material_record.description, material_record.order_code, material_record.reference_code,
    material_record.unit_of_measure, target_quantity, btrim(target_reason), auth.uid()
  )
  RETURNING id INTO consumption_id;

  RETURN jsonb_build_object('id', consumption_id, 'stock_movement_id', movement_id,
    'stock_before', before_quantity, 'stock_after', after_quantity, 'already_recorded', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_maintenance_work_order_material_consumption(uuid, uuid, uuid, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_maintenance_work_order_material_consumption(uuid, uuid, uuid, numeric, text, uuid) TO authenticated;

COMMENT ON TABLE public.maintenance_work_order_material_consumptions IS
  'Consumos reales vinculados a una OT; cada registro tiene su movimiento de stock y conserva una instantánea del artículo.';

COMMIT;
