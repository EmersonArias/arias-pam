-- Arias Suite — migración 075
-- Retira los grants explícitos heredados de anon sobre objetos existentes de public.
--
-- Alcance deliberadamente limitado a tablas, particiones, vistas, vistas materializadas,
-- tablas foráneas y secuencias del esquema public. No modifica políticas RLS, propiedad,
-- grants de authenticated ni grants de service_role. Tampoco aplica cambios a Storage.
--
-- Antes de aplicar en producción:
--   1) probar login con usuario de prueba;
--   2) probar CRUD en las pantallas principales y cargas/descargas de Storage;
--   3) verificar que authenticated y service_role conservan los ACL existentes.
-- Esta migración NO debe aplicarse hasta superar esas pruebas.

BEGIN;

-- Capturar los ACL actuales para demostrar que authenticated y service_role no cambian.
CREATE TEMPORARY TABLE _arias_suite_075_grants_before
ON COMMIT DROP AS
SELECT
  n.nspname,
  c.relname,
  c.relkind,
  x.grantee,
  x.privilege_type,
  x.is_grantable
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(
    c.relacl,
    acldefault(
      CASE WHEN c.relkind = 'S' THEN 'S' ELSE 'r' END::"char",
      c.relowner
    )
  )
) AS x
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
  AND x.grantee IN (
    SELECT oid
    FROM pg_roles
    WHERE rolname IN ('authenticated', 'service_role')
  );

-- No se pretende resolver la propiedad de objetos: si anon fuera propietario,
-- abortamos para evitar que la propiedad implícita eluda el REVOKE.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
      AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
  ) THEN
    RAISE EXCEPTION
      'Migración 075 abortada: anon es propietario de un objeto en public; requiere revisión manual de propiedad.';
  END IF;
END;
$$;

-- Retirar solo los permisos del rol anon sobre cada objeto existente.
DO $$
DECLARE
  object_row record;
BEGIN
  FOR object_row IN
    SELECT n.nspname, c.relname, c.relkind
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    ORDER BY c.relkind, c.relname
  LOOP
    IF object_row.relkind = 'S' THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM anon',
        object_row.nspname,
        object_row.relname
      );
    ELSE
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM anon',
        object_row.nspname,
        object_row.relname
      );
    END IF;
  END LOOP;
END;
$$;

-- Asegurar que no quedan ACL explícitos para anon en los objetos revisados.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(
      COALESCE(
        c.relacl,
        acldefault(
          CASE WHEN c.relkind = 'S' THEN 'S' ELSE 'r' END::"char",
          c.relowner
        )
      )
    ) AS x
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
      AND x.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
  ) THEN
    RAISE EXCEPTION
      'Migración 075 abortada: siguen existiendo ACL explícitos para anon en objetos de public.';
  END IF;
END;
$$;

-- Verificar que los ACL de authenticated y service_role son exactamente los mismos
-- que antes del REVOKE (no solo que sus accesos más comunes siguen funcionando).
DO $$
DECLARE
  changed_count integer;
BEGIN
  WITH current_grants AS (
    SELECT
      n.nspname,
      c.relname,
      c.relkind,
      x.grantee,
      x.privilege_type,
      x.is_grantable
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(
      COALESCE(
        c.relacl,
        acldefault(
          CASE WHEN c.relkind = 'S' THEN 'S' ELSE 'r' END::"char",
          c.relowner
        )
      )
    ) AS x
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
      AND x.grantee IN (
        SELECT oid
        FROM pg_roles
        WHERE rolname IN ('authenticated', 'service_role')
      )
  ),
  differences AS (
    (SELECT * FROM _arias_suite_075_grants_before
     EXCEPT
     SELECT * FROM current_grants)
    UNION ALL
    (SELECT * FROM current_grants
     EXCEPT
     SELECT * FROM _arias_suite_075_grants_before)
  )
  SELECT count(*) INTO changed_count FROM differences;

  IF changed_count <> 0 THEN
    RAISE EXCEPTION
      'Migración 075 abortada: cambiaron ACL de authenticated o service_role (% diferencias).',
      changed_count;
  END IF;
END;
$$;

COMMIT;