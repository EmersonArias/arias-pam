-- Arias Suite — migración 074
-- Fotografías asociadas a los pendientes operativos de mantenimiento.
--
-- Utiliza el bucket privado maintenance-evidence ya existente.
-- Cada foto queda vinculada a un pendiente y al mismo hotel.
-- No modifica registros existentes ni toca otras tablas funcionales.

BEGIN;

CREATE TABLE IF NOT EXISTS public.maintenance_pending_item_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL
    REFERENCES public.hotels(id) ON DELETE CASCADE,
  pending_item_id uuid NOT NULL
    REFERENCES public.maintenance_pending_items(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type LIKE 'image/%'),
  file_size integer NOT NULL CHECK (file_size >= 0 AND file_size <= 10485760),
  uploaded_by uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_maintenance_pending_item_photos_pending
  ON public.maintenance_pending_item_photos (pending_item_id, uploaded_at DESC);

ALTER TABLE public.maintenance_pending_item_photos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.maintenance_pending_item_photos FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.maintenance_pending_item_photos TO authenticated;

DROP POLICY IF EXISTS maintenance_pending_item_photos_select
  ON public.maintenance_pending_item_photos;

CREATE POLICY maintenance_pending_item_photos_select
  ON public.maintenance_pending_item_photos
  FOR SELECT
  TO authenticated
  USING (
    public.has_hotel_permission(hotel_id, 'maintenance.view')
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_pending_items pending_item
      WHERE pending_item.id = pending_item_id
        AND pending_item.hotel_id = public.maintenance_pending_item_photos.hotel_id
    )
  );

DROP POLICY IF EXISTS maintenance_pending_item_photos_insert
  ON public.maintenance_pending_item_photos;

CREATE POLICY maintenance_pending_item_photos_insert
  ON public.maintenance_pending_item_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.has_hotel_permission(hotel_id, 'maintenance.create')
      OR public.has_hotel_permission(hotel_id, 'maintenance.update')
    )
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_pending_items pending_item
      WHERE pending_item.id = pending_item_id
        AND pending_item.hotel_id = public.maintenance_pending_item_photos.hotel_id
        AND pending_item.active = true
    )
  );

DROP POLICY IF EXISTS maintenance_pending_item_photos_delete
  ON public.maintenance_pending_item_photos;

CREATE POLICY maintenance_pending_item_photos_delete
  ON public.maintenance_pending_item_photos
  FOR DELETE
  TO authenticated
  USING (
    public.has_hotel_permission(hotel_id, 'maintenance.update')
  );

-- Permite a usuarios con permiso de alta adjuntar fotos solo a pendientes
-- del mismo hotel. El bucket sigue privado; las URLs firmadas exigen acceso.
-- El permiso maintenance.update sigue cubierto por la política preexistente.
DROP POLICY IF EXISTS maintenance_pending_evidence_insert
  ON storage.objects;

CREATE POLICY maintenance_pending_evidence_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-evidence'
    AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    AND public.has_hotel_permission(split_part(name, '/', 1)::uuid, 'maintenance.create')
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_pending_items pending_item
      WHERE pending_item.id = split_part(name, '/', 3)::uuid
        AND pending_item.hotel_id = split_part(name, '/', 1)::uuid
        AND pending_item.active = true
    )
  );

COMMENT ON TABLE public.maintenance_pending_item_photos IS
'Fotografías de incidencias y pendientes operativos. Los archivos viven en el bucket privado maintenance-evidence y requieren permisos del hotel.';

COMMIT;
