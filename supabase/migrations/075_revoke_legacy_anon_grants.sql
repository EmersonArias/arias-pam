-- Arias Suite — migración 075
-- Retira permisos explícitos heredados de anon en las relaciones existentes
-- del esquema public. No cambia los grants de authenticated ni service_role.
--
-- Esta migración se prepara primero en una rama/Preview y NO debe aplicarse
-- a producción hasta validar login, lectura y escritura de los módulos afectados.
--
-- La migración 072 ya evita que se vuelvan a conceder estos permisos por defecto
-- a los objetos futuros creados por postgres.

BEGIN;

-- ALL TABLES incluye las tablas y vistas existentes (y otras relaciones
-- grantables incluidas por PostgreSQL dentro de esta categoría).
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- Los permisos de secuencias se gestionan por separado en PostgreSQL.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Verificación de los ACL explícitos: si queda algún grant directo a anon,
-- falla la migración y se revierte la transacción en lugar de dejar un estado
-- parcialmente endurecido.
DO $$
DECLARE
  remaining_grants text;
BEGIN
  SELECT string_agg(
    format('%I.%I (%s)', n.nspname, c.relname, acl.privilege_type),
    ', ' ORDER BY n.nspname, c.relname, acl.privilege_type
  )
  INTO remaining_grants
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    AND c.relacl IS NOT NULL
    AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon');

  IF remaining_grants IS NOT NULL THEN
    RAISE EXCEPTION
      'La migración 075 ha dejado grants explícitos a anon en: %',
      remaining_grants;
  END IF;
END;
$$;

COMMIT;
