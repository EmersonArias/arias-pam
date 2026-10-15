# Auditoría de seguridad y estado de migraciones — Arias Suite
**Fecha:** 15 de octubre de 2026  
**Entorno:** Supabase activo `eqxcuwrfestwqelnucmv` (producción), repositorio `EmersonArias/arias-suite`.  
**Rama de correcciones:** `feature/materials-stock-safety`.  
**Regla de operación:** no aplicar SQL a producción sin exportación recuperable comprobada y conciliación del historial.

## Hallazgos confirmados

1. **Privilegios históricos de `anon` en `public`:** 336 concesiones de tabla/vista, 2.340 concesiones por columna, una de secuencia y cuatro funciones ejecutables. Las concesiones a vistas incluyen siete vistas de mantenimiento/PAM. Son `security_invoker=true`; no se ha demostrado filtración de filas porque siguen actuando los permisos y RLS de las tablas subyacentes, pero el acceso anónimo no es necesario.
2. **RLS habilitado sin políticas:** cinco tablas internas de contadores/secuencias: `apparatus_registry_code_counter`, `apparatus_registry_code_counters`, `code_sequence_templates`, `hotel_code_sequences`, `maintenance_ot_daily_counters`. No se encontraron concesiones a `anon` ni `authenticated` en esas tablas. No se deben crear políticas genéricas que expongan los contadores.
3. **Protección de contraseñas filtradas:** el asesor de seguridad de Supabase informa que está deshabilitada. No hay una herramienta disponible en esta sesión para cambiar esa opción Auth; debe activarse desde la configuración Auth del Dashboard antes de cerrar la auditoría.
4. **Funciones `SECURITY DEFINER`:** el asesor enumera 18 funciones accesibles por usuarios autenticados. No son puertas traseras por sí mismas: algunas son RPC legítimas. Los ejemplos revisados tienen `search_path=pg_catalog, public`; deben conservarse los RPC de la aplicación, pero cada comprobación de autorización requiere una revisión individual. No revocar en bloque.
5. **Advertencias de rendimiento:** 33 claves foráneas sin índice, siete avisos de evaluación de auth en políticas RLS y otras advertencias informativas. No mezclar optimizaciones no urgentes con la corrección de privilegios.
6. **Historial inconsistente:** la tabla `supabase_migrations.schema_migrations` registra 068–074, 076 y 077; faltan 064–067, 078, 079 y 080. Los objetos que deberían corresponder a 064–067 existen parcialmente, pero el historial no lo confirma. No ejecutar esas migraciones de nuevo: 064 contiene operaciones que reactivan/actualizan proveedores y catálogos. No se encontró archivo 075 en la rama revisada; no inventar ni falsificar ese registro.
7. **Inventario:** hay tres artículos en el catálogo. El stock desconocido debe distinguirse de un stock real igual a cero; el código de pruebas ahora deja el conteo inicial vacío por defecto.
8. **Recuperación:** existe una rama de respaldo de código `backup/pre-078-2026-10-15`, pero eso no es una copia de base de datos. Falta verificar un dump lógico externo para producción.

## Cambios preparados en la rama aislada

- La migración 079 revoca a `anon` concesiones de tablas/vistas, columnas, secuencias y funciones en `public`, y hace rollback si el recuento posterior no es cero.
- No revoca permisos explícitos de `authenticated` ni `service_role`.
- La migración 078 diferencia el stock no inventariado, habilita el conteo físico y bloquea los movimientos hasta que exista inventario verificado.
- La migración 080 asocia consumos reales a la OT con descuento y movimiento en una sola transacción, control de hotel, permiso, OT abierta, saldo no negativo y clave idempotente.
- La rama de trabajo no es producción y no se aplicaron cambios al esquema de Supabase durante esta auditoría.

## Bloqueos antes de aplicar a producción

- Obtener y comprobar exportación lógica de schema y data fuera de Supabase, sin almacenar contraseñas en Git.
- Cotejar los efectos de 064–067 con la estructura real; no registrar históricas como aplicadas hasta demostrar cada efecto.
- Revisar los RPC `SECURITY DEFINER` de mayor riesgo y verificar la autenticación/rol de las funciones Edge de administración.
- Activar protección de contraseñas filtradas desde Auth.
- Aplicar en orden controlado y verificar 079, 078 y 080; después comprobar de nuevo el historial, privilegios, RLS, asesores y operaciones de la app.
- No desplegar a producción la rama de pruebas hasta verificar build y flujos esenciales.

## Estado verificado
Las consultas de esta auditoría fueron de solo lectura. **No se han aplicado migraciones ni modificado datos en producción.** El estado `READY` de un despliegue de Vercel confirma el build/despliegue, no las pruebas funcionales end-to-end.
