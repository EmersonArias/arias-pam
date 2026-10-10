-- Arias Suite — migración 064
-- Catálogos de proveedores, relación categoría-proveedor y materiales/códigos.
-- Datos iniciales tomados de las hojas PROVEEDORES y MATERIALES Y CODIGOS
-- de PENDIENTES (1).xlsm para el hotel SB Diagonal Zero.
-- No modifica la tabla de pendientes ni las migraciones anteriores.

BEGIN;

CREATE TABLE IF NOT EXISTS public.maintenance_supplier_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  contact_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_maintenance_supplier_catalog_hotel_name UNIQUE (hotel_id, supplier_name),
  CONSTRAINT ux_maintenance_supplier_catalog_hotel_id UNIQUE (hotel_id, id)
);

CREATE TABLE IF NOT EXISTS public.maintenance_category_supplier_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  supplier_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_maintenance_category_supplier_defaults_hotel_category UNIQUE (hotel_id, category_name),
  CONSTRAINT fk_maintenance_category_supplier_defaults_supplier
    FOREIGN KEY (hotel_id, supplier_id)
    REFERENCES public.maintenance_supplier_catalog (hotel_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.maintenance_material_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  description text NOT NULL,
  order_code text NOT NULL,
  supplier_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_maintenance_material_catalog_hotel_description UNIQUE (hotel_id, description),
  CONSTRAINT fk_maintenance_material_catalog_supplier
    FOREIGN KEY (hotel_id, supplier_id)
    REFERENCES public.maintenance_supplier_catalog (hotel_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_maintenance_supplier_catalog_hotel_active
  ON public.maintenance_supplier_catalog (hotel_id, active, supplier_name);
CREATE INDEX IF NOT EXISTS ix_maintenance_category_supplier_defaults_hotel_active
  ON public.maintenance_category_supplier_defaults (hotel_id, active, category_name);
CREATE INDEX IF NOT EXISTS ix_maintenance_material_catalog_hotel_active
  ON public.maintenance_material_catalog (hotel_id, active, description);

ALTER TABLE public.maintenance_supplier_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_category_supplier_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_material_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_supplier_catalog_select ON public.maintenance_supplier_catalog;
CREATE POLICY maintenance_supplier_catalog_select
  ON public.maintenance_supplier_catalog FOR SELECT TO authenticated
  USING (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS maintenance_supplier_catalog_insert ON public.maintenance_supplier_catalog;
CREATE POLICY maintenance_supplier_catalog_insert
  ON public.maintenance_supplier_catalog FOR INSERT TO authenticated
  WITH CHECK (public.has_hotel_permission(hotel_id, 'maintenance.update'));

DROP POLICY IF EXISTS maintenance_supplier_catalog_update ON public.maintenance_supplier_catalog;
CREATE POLICY maintenance_supplier_catalog_update
  ON public.maintenance_supplier_catalog FOR UPDATE TO authenticated
  USING (public.has_hotel_permission(hotel_id, 'maintenance.update'))
  WITH CHECK (public.has_hotel_permission(hotel_id, 'maintenance.update'));

DROP POLICY IF EXISTS maintenance_supplier_catalog_delete ON public.maintenance_supplier_catalog;
CREATE POLICY maintenance_supplier_catalog_delete
  ON public.maintenance_supplier_catalog FOR DELETE TO authenticated
  USING (public.has_hotel_permission(hotel_id, 'maintenance.update'));

DROP POLICY IF EXISTS maintenance_category_supplier_defaults_select ON public.maintenance_category_supplier_defaults;
CREATE POLICY maintenance_category_supplier_defaults_select
  ON public.maintenance_category_supplier_defaults FOR SELECT TO authenticated
  USING (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS maintenance_category_supplier_defaults_insert ON public.maintenance_category_supplier_defaults;
CREATE POLICY maintenance_category_supplier_defaults_insert
  ON public.maintenance_category_supplier_defaults FOR INSERT TO authenticated
  WITH CHECK (public.has_hotel_permission(hotel_id, 'maintenance.update'));

DROP POLICY IF EXISTS maintenance_category_supplier_defaults_update ON public.maintenance_category_supplier_defaults;
CREATE POLICY maintenance_category_supplier_defaults_update
  ON public.maintenance_category_supplier_defaults FOR UPDATE TO authenticated
  USING (public.has_hotel_permission(hotel_id, 'maintenance.update'))
  WITH CHECK (public.has_hotel_permission(hotel_id, 'maintenance.update'));

DROP POLICY IF EXISTS maintenance_category_supplier_defaults_delete ON public.maintenance_category_supplier_defaults;
CREATE POLICY maintenance_category_supplier_defaults_delete
  ON public.maintenance_category_supplier_defaults FOR DELETE TO authenticated
  USING (public.has_hotel_permission(hotel_id, 'maintenance.update'));

DROP POLICY IF EXISTS maintenance_material_catalog_select ON public.maintenance_material_catalog;
CREATE POLICY maintenance_material_catalog_select
  ON public.maintenance_material_catalog FOR SELECT TO authenticated
  USING (public.has_hotel_access(hotel_id));

DROP POLICY IF EXISTS maintenance_material_catalog_insert ON public.maintenance_material_catalog;
CREATE POLICY maintenance_material_catalog_insert
  ON public.maintenance_material_catalog FOR INSERT TO authenticated
  WITH CHECK (public.has_hotel_permission(hotel_id, 'maintenance.update'));

DROP POLICY IF EXISTS maintenance_material_catalog_update ON public.maintenance_material_catalog;
CREATE POLICY maintenance_material_catalog_update
  ON public.maintenance_material_catalog FOR UPDATE TO authenticated
  USING (public.has_hotel_permission(hotel_id, 'maintenance.update'))
  WITH CHECK (public.has_hotel_permission(hotel_id, 'maintenance.update'));

DROP POLICY IF EXISTS maintenance_material_catalog_delete ON public.maintenance_material_catalog;
CREATE POLICY maintenance_material_catalog_delete
  ON public.maintenance_material_catalog FOR DELETE TO authenticated
  USING (public.has_hotel_permission(hotel_id, 'maintenance.update'));

COMMENT ON TABLE public.maintenance_supplier_catalog IS
  'Catálogo de proveedores y contactos por hotel; reutilizable en formularios de mantenimiento y pedidos.';
COMMENT ON TABLE public.maintenance_category_supplier_defaults IS
  'Proveedor predeterminado por categoría de pendiente, importado del libro Excel de mantenimiento.';
COMMENT ON TABLE public.maintenance_material_catalog IS
  'Catálogo de materiales, códigos de pedido y proveedor por hotel, importado de MATERIALES Y CODIGOS.';

DO $$
DECLARE
  v_hotel_id uuid;
BEGIN
  SELECT h.id INTO v_hotel_id
  FROM public.hotels h
  JOIN public.tenants t ON t.id = h.tenant_id
  WHERE h.code = 'SB-DZ' AND t.code = 'SBH'
  LIMIT 1;

  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el hotel SB-DZ para inicializar los catálogos de mantenimiento.';
  END IF;

  INSERT INTO public.maintenance_supplier_catalog (hotel_id, supplier_name, contact_name)
  SELECT v_hotel_id, seed.supplier_name, seed.contact_name
  FROM (VALUES
    ('SSTT', 'Emerson'),
    ('Pio', 'Manolo'),
    ('FRYCA', 'Julian'),
    ('FRIGORISTA', 'Dani'),
    ('FONTROOM', 'Paco'),
    ('NECHI', 'Hector'),
    ('ROTUGLAS', 'Jose'),
    ('KONE', 'kone'),
    ('DORMAKABA', 'Dormakaba'),
    ('CRISTALERIA LLOREDA', 'Francisco'),
    ('Carpinteria de aluminio', NULL),
    ('PLADURISTA', 'David'),
    ('TMB', 'TMB'),
    ('AIRLAM', NULL),
    ('TRES', NULL)
  ) AS seed(supplier_name, contact_name)
  ON CONFLICT (hotel_id, supplier_name) DO UPDATE
    SET contact_name = EXCLUDED.contact_name,
        active = true,
        updated_at = now();

  INSERT INTO public.maintenance_category_supplier_defaults (hotel_id, category_name, supplier_id)
  SELECT v_hotel_id, seed.category_name, supplier.id
  FROM (VALUES
    ('Electricidad básica', 'SSTT'),
    ('Fontaneria basica', 'SSTT'),
    ('Varios', 'SSTT'),
    ('Fontanería mayor', 'Pio'),
    ('Tren de lavado', 'FRYCA'),
    ('Climatización', 'FRIGORISTA'),
    ('Carpintería', 'FONTROOM'),
    ('Domotica', 'NECHI'),
    ('Rotulación', 'ROTUGLAS'),
    ('Ascensores', 'KONE'),
    ('Puertas automáticas', 'DORMAKABA'),
    ('Cristaleria y ventanas', 'CRISTALERIA LLOREDA'),
    ('Carpinteria de aluminio', 'Carpinteria de aluminio'),
    ('Pladur', 'PLADURISTA'),
    ('Reparación de bombas', 'TMB')
  ) AS seed(category_name, supplier_name)
  JOIN public.maintenance_supplier_catalog supplier
    ON supplier.hotel_id = v_hotel_id
   AND supplier.supplier_name = seed.supplier_name
  ON CONFLICT (hotel_id, category_name) DO UPDATE
    SET supplier_id = EXCLUDED.supplier_id,
        active = true,
        updated_at = now();

  INSERT INTO public.maintenance_material_catalog (hotel_id, description, order_code, supplier_id)
  SELECT v_hotel_id, seed.description, seed.order_code, supplier.id
  FROM (VALUES
    ('Motor tipo 1 fancoil habitaciones', 'AERMEC FCX50P 9110233', 'AIRLAM'),
    ('Bandeja de condensados', 'Bandeja de condensados BC8', 'AIRLAM'),
    ('Telefono de ducha', 'Tres 134748 Ducha Lex-100 5 posiciones', 'TRES')
  ) AS seed(description, order_code, supplier_name)
  JOIN public.maintenance_supplier_catalog supplier
    ON supplier.hotel_id = v_hotel_id
   AND supplier.supplier_name = seed.supplier_name
  ON CONFLICT (hotel_id, description) DO UPDATE
    SET order_code = EXCLUDED.order_code,
        supplier_id = EXCLUDED.supplier_id,
        active = true,
        updated_at = now();
END;
$$;

COMMIT;
