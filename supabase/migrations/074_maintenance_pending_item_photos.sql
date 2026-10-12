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
    public.has_hotel_access(hotel_id)
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_pending_items pending_item
      WHERE pending_item.id = public.maintenance_pending_item_photos.pending_item_id
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

-- Las fotos siguen el mismo acceso de lectura que la tabla de pendientes:
-- solo se firman URLs si el usuario puede acceder al hotel y al registro.
DROP POLICY IF EXISTS maintenance_pending_evidence_select
  ON storage.objects;

CREATE POLICY maintenance_pending_evidence_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'maintenance-evidence'
    AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+
'Fotografías de incidencias y pendientes operativos. Los archivos viven en el bucket privado maintenance-evidence y requieren permisos del hotel.';

COMMIT;

    AND EXISTS (
      SELECT 1
      FROM public.maintenance_pending_items pending_item
      WHERE pending_item.id::text = split_part(storage.objects.name, '/', 3)
        AND pending_item.hotel_id::text = split_part(storage.objects.name, '/', 1)
        AND public.has_hotel_access(pending_item.hotel_id)
    )
  );

-- Permite adjuntar fotos solo al pendiente activo del mismo hotel.
-- La política existente maintenance_evidence_insert sigue permitiendo a
-- usuarios con maintenance.update cargar evidencias en los flujos ya existentes.
DROP POLICY IF EXISTS maintenance_pending_evidence_insert
  ON storage.objects;

CREATE POLICY maintenance_pending_evidence_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-evidence'
    AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+
'Fotografías de incidencias y pendientes operativos. Los archivos viven en el bucket privado maintenance-evidence y requieren permisos del hotel.';

COMMIT;

    AND public.has_hotel_permission(split_part(name, '/', 1)::uuid, 'maintenance.create')
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_pending_items pending_item
      WHERE pending_item.id::text = split_part(storage.objects.name, '/', 3)
        AND pending_item.hotel_id::text = split_part(storage.objects.name, '/', 1)
        AND pending_item.active = true
    )
  );

-- Si falla el registro de metadatos tras subir un archivo, la persona que
-- puede dar de alta pendientes puede limpiar ese objeto no asociado. No puede
-- borrar objetos que ya estén registrados en maintenance_pending_item_photos.
DROP POLICY IF EXISTS maintenance_pending_evidence_cleanup
  ON storage.objects;

CREATE POLICY maintenance_pending_evidence_cleanup
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'maintenance-evidence'
    AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+
'Fotografías de incidencias y pendientes operativos. Los archivos viven en el bucket privado maintenance-evidence y requieren permisos del hotel.';

COMMIT;

    AND public.has_hotel_permission(split_part(name, '/', 1)::uuid, 'maintenance.create')
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_pending_items pending_item
      WHERE pending_item.id::text = split_part(storage.objects.name, '/', 3)
        AND pending_item.hotel_id::text = split_part(storage.objects.name, '/', 1)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.maintenance_pending_item_photos photo
      WHERE photo.storage_path = storage.objects.name
    )
  );

COMMENT ON TABLE public.maintenance_pending_item_photos IS
'Fotografías de incidencias y pendientes operativos. Los archivos viven en el bucket privado maintenance-evidence y requieren permisos del hotel.';

COMMIT;
