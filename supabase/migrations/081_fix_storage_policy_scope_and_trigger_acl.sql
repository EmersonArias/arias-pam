-- Arias Suite — migración 081
-- Corrige el ámbito de las políticas de Storage para fotos/documentos de equipos
-- y retira EXECUTE directo de una rutina que se usa únicamente como trigger.
-- No cambia la visibilidad pública de los buckets para no romper URLs históricas.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.apparatus_registry') IS NULL THEN
    RAISE EXCEPTION 'No existe public.apparatus_registry; deteniendo la migración 081.';
  END IF;
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'No existe storage.objects; deteniendo la migración 081.';
  END IF;
  IF to_regprocedure('public.set_maintenance_room_led_tracking_audit()') IS NULL THEN
    RAISE EXCEPTION 'No existe la función de auditoría LED esperada; deteniendo la migración 081.';
  END IF;
END;
$$;

-- La función se invoca por el trigger creado en la migración 077, no como RPC.
-- Revocar EXECUTE directo no elimina ni desactiva el trigger existente.
REVOKE EXECUTE ON FUNCTION public.set_maintenance_room_led_tracking_audit()
  FROM PUBLIC, anon, authenticated;

-- Nombre de objeto en Storage:
-- <apparatus_registry UUID>/<nombre de archivo>.
-- Referenciar objects.name (no ar.name) permite autorizar el mismo objeto que se
-- está consultando y evita casts derivados de la columna de equipo.
DROP POLICY IF EXISTS apparatus_registry_documents_select ON storage.objects;
CREATE POLICY apparatus_registry_documents_select
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'apparatus-registry-documents'
    AND split_part(objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.apparatus_registry ar
      WHERE ar.id = split_part(objects.name, '/', 1)::uuid
        AND public.has_hotel_permission(ar.hotel_id, 'apparatusregistry.view')
    )
  );

DROP POLICY IF EXISTS apparatus_registry_documents_insert ON storage.objects;
CREATE POLICY apparatus_registry_documents_insert
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'apparatus-registry-documents'
    AND split_part(objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.apparatus_registry ar
      WHERE ar.id = split_part(objects.name, '/', 1)::uuid
        AND public.has_hotel_permission(ar.hotel_id, 'apparatusregistry.update')
    )
  );

DROP POLICY IF EXISTS apparatus_registry_documents_delete ON storage.objects;
CREATE POLICY apparatus_registry_documents_delete
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'apparatus-registry-documents'
    AND split_part(objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.apparatus_registry ar
      WHERE ar.id = split_part(objects.name, '/', 1)::uuid
        AND public.has_hotel_permission(ar.hotel_id, 'apparatusregistry.update')
    )
  );

DROP POLICY IF EXISTS apparatus_registry_photos_select ON storage.objects;
CREATE POLICY apparatus_registry_photos_select
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'apparatus-registry'
    AND split_part(objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.apparatus_registry ar
      WHERE ar.id = split_part(objects.name, '/', 1)::uuid
        AND public.has_hotel_permission(ar.hotel_id, 'apparatusregistry.view')
    )
  );

DROP POLICY IF EXISTS apparatus_registry_photos_insert ON storage.objects;
CREATE POLICY apparatus_registry_photos_insert
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'apparatus-registry'
    AND split_part(objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.apparatus_registry ar
      WHERE ar.id = split_part(objects.name, '/', 1)::uuid
        AND public.has_hotel_permission(ar.hotel_id, 'apparatusregistry.update')
    )
  );

DROP POLICY IF EXISTS apparatus_registry_photos_delete ON storage.objects;
CREATE POLICY apparatus_registry_photos_delete
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'apparatus-registry'
    AND split_part(objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.apparatus_registry ar
      WHERE ar.id = split_part(objects.name, '/', 1)::uuid
        AND public.has_hotel_permission(ar.hotel_id, 'apparatusregistry.update')
    )
  );

COMMIT;
