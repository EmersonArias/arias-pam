# ARIAS SUITE — MAESTRO DE CONTINUIDAD
## Documento de transferencia para continuar el desarrollo en otro chat

**Fecha de referencia:** 08/10/2026  
**Producto:** Arias Suite  
**Módulo principal:** Arias PAM / Mantenimiento  
**Repositorio:** `EmersonArias/arias-pam`  
**Rama activa:** `feature/arias-suite-common-ui-v1`  
**HEAD conocido al redactar este documento:** `b59f046e16995607b17edabc2e8e81fa197c2cb1`  
**Último commit relevante:** `feat(pending): completar acciones con nuevo registro y botones comunes`

---

# 1. OBJETIVO DE ESTE DOCUMENTO

Este documento es la referencia de continuidad para que otro chat pueda retomar Arias Suite sin perder decisiones, contexto, arquitectura, estado técnico ni reglas de trabajo.

El objetivo es **continuar desde el estado real de GitHub**, no reconstruir el proyecto desde cero, no volver a tomar decisiones ya congeladas y no repetir migraciones que ya se han ejecutado.

Este documento NO sustituye al código real. Cuando exista una diferencia entre este texto y GitHub, **GitHub y el código actual tienen prioridad para saber qué existe realmente**, pero las decisiones congeladas descritas aquí deben respetarse salvo que el usuario pida expresamente cambiarlas.

---

# 2. CÓMO DEBE TRABAJAR EL NUEVO CHAT

## 2.1 Regla fundamental

El desarrollo debe hacerse **directamente sobre GitHub**.

No se debe asumir que el proyecto se está desarrollando localmente.

El usuario dispone de Visual Studio / Visual Studio Code, pero **no es necesario usarlo para que el asistente modifique el repositorio** cuando la conexión GitHub está disponible.

El flujo correcto es:

**ChatGPT → conexión GitHub → repositorio → rama activa → leer código actual → modificar código → commit → Vercel**

No se debe inventar código basándose solamente en conversaciones anteriores. Primero hay que leer la versión actual del archivo desde GitHub.

---

# 3. INSTRUCCIONES PARA ENTRAR Y CONECTARSE A GITHUB EN UN CHAT NUEVO

Pegar literalmente esto al comienzo del nuevo chat:

> **CONTINUIDAD ARIAS SUITE**
>
> Necesito que trabajes directamente sobre GitHub, no en local.
>
> Repositorio: `EmersonArias/arias-pam`
>
> Rama activa: `feature/arias-suite-common-ui-v1`
>
> Quiero que leas primero el estado actual de GitHub y trabajes directamente sobre esa rama.
>
> No quiero que me hagas copiar archivos a Visual Studio ni que me propongas trabajar en local como método principal.
>
> Tu trabajo es:
> 1. conectarte a GitHub usando la conexión disponible;
> 2. leer el código actual de la rama;
> 3. localizar los archivos que haya que modificar;
> 4. hacer las modificaciones directamente en GitHub;
> 5. crear los commits correspondientes;
> 6. no tocar migraciones anteriores ya ejecutadas;
> 7. no inventar tablas, campos, rutas ni funciones que no existan sin verificar primero;
> 8. comprobar siempre el estado actual de la rama antes de modificar.
>
> Si no ves inmediatamente dónde está la conexión GitHub, busca/descubre la conexión o herramienta de GitHub disponible en el entorno. No me mandes a configurar Visual Studio ni a trabajar en local.
>
> **Importante:** antes de hacer cambios, confirma leyendo GitHub cuál es el HEAD actual de `feature/arias-suite-common-ui-v1`.
>
> Usa este documento como contexto de continuidad:
> `docs/MAESTRO_CONTINUIDAD_ARIAS_SUITE.md`

---

# 4. QUÉ HACER SI EL NUEVO CHAT DICE QUE NO TIENE GITHUB

No se debe aceptar inmediatamente la respuesta "no puedo entrar a GitHub".

El entorno utilizado para este proyecto dispone de acciones de GitHub capaces de:

- leer archivos;
- buscar código;
- leer commits;
- comparar commits;
- crear archivos;
- actualizar archivos;
- crear commits;
- trabajar sobre ramas;
- consultar estados y otros recursos GitHub.

El nuevo chat debe **descubrir la herramienta/connector de GitHub disponible en su entorno** y usarla.

Si existe una conexión GitHub pero no está siendo utilizada, el problema es de enrutamiento de herramientas, no del proyecto.

---

# 5. VISUAL STUDIO / VISUAL STUDIO CODE

El usuario ha indicado que tiene Visual Studio.

Eso puede servir para trabajar localmente cuando él lo necesite, pero **no es el flujo principal de esta continuidad**.

Para el desarrollo con el asistente:

**No es necesario abrir Visual Studio.**

La forma de trabajo preferida es:

**GitHub directo + commits + Vercel**

Visual Studio puede utilizarse como apoyo para inspeccionar archivos, ejecutar el proyecto localmente o hacer pruebas locales si el usuario lo solicita.

---

# 6. DATOS FIJOS DEL PROYECTO

## Repositorio

`EmersonArias/arias-pam`

## Rama activa

`feature/arias-suite-common-ui-v1`

## HEAD conocido

`b59f046e16995607b17edabc2e8e81fa197c2cb1`

Mensaje:

`feat(pending): completar acciones con nuevo registro y botones comunes`

Este HEAD debe volver a comprobarse antes de seguir trabajando.

---

# 7. REGLAS ABSOLUTAS DE TRABAJO

## 7.1 No asumir

La regla principal del proyecto es:

**NO ASSUME**

Nunca asumir:

- nombres de columnas;
- nombres de tablas;
- nombres de RPC;
- rutas;
- componentes;
- estados;
- permisos;
- estructura de archivos;
- comportamiento de un módulo;
- datos de producción;
- migraciones ejecutadas.

Primero leer GitHub / Supabase según corresponda.

---

## 7.2 No modificar decisiones congeladas

Hay decisiones ya validadas.

No volver a rediseñarlas sin una petición explícita del usuario.

Especialmente:

- Login congelado.
- Migraciones 046–063 ya ejecutadas y congeladas.
- Nunca editar una migración ya ejecutada.
- Las siguientes migraciones serán 064+.
- No mezclar trabajos preventivos del PAM con la gestión operativa de Tickets.
- No volver a convertir Tickets en un listado gigantesco de todo el PAM.
- No reintroducir menús laterales grandes.
- No cambiar los términos de interfaz congelados.
- No introducir Arias Pump / sensores / telemetría en Suite V1.

---

# 8. ARQUITECTURA GENERAL DE ARIAS SUITE

Arias Suite es una plataforma técnica para hoteles.

No es:

- un ERP genérico;
- una simple GMAO;
- una aplicación aislada de mantenimiento.

Su objetivo es centralizar:

- conocimiento técnico;
- operaciones;
- mantenimiento preventivo;
- mantenimiento correctivo;
- activos;
- documentación;
- compras;
- stock;
- proveedores;
- contratos;
- auditorías;
- intervenciones;
- consumos;
- lecturas;
- analítica;
- IA preparada desde diseño.

Principios:

- Multiempresa.
- Multihotel.
- Multiusuario.
- Escalable horizontalmente.
- API First.
- PWA.
- Offline First.
- PostgreSQL como núcleo.
- AI First.
- Modelo normalizado.
- Sin duplicación innecesaria.
- Alta trazabilidad.
- Permisos por hotel.
- Arquitectura modular.

---

# 9. JERARQUÍA FUNCIONAL

La jerarquía conceptual principal es:

**Empresa → Hotel → Ubicaciones → Sistemas → Activos → Plan Anual**

En mantenimiento:

**PAM → Planificación → ejecución / gestión → histórico**

Conceptualmente:

**PAM = qué mantenimiento debe hacerse**

**Planificación = cuándo corresponde**

**Tickets = qué trabajo requiere gestión operativa**

**Histórico = qué ocurrió / qué se terminó / qué se rechazó**

**Intervenciones = trabajos relevantes o especiales que deben quedar documentados**

---

# 10. ORDEN ACTUAL DEL CENTRO DE MANTENIMIENTO

El centro de mantenimiento está definido con este orden:

1. Equipos e instalaciones
2. Tickets
3. Trabajos programados
4. Intervenciones
5. PAM
6. Auditoría
7. Configuración

No volver a mezclar el flujo preventivo del PAM dentro de Tickets.

---

# 11. TÉRMINOS VISIBLES CONGELADOS

En interfaz se usan:

- **Tickets** en lugar de "Incidencias".
- **Intervenciones** en lugar de "Actuaciones" como nombre visible del módulo.
- **En gestión** en lugar de "Atendido".
- **Planificador Horario** en lugar de "Control Horario".
- **Notas** en lugar de "Parte de Relevo".

No cambiar estos términos salvo petición expresa.

---

# 12. MIGRACIONES — ESTADO CONOCIDO

El usuario confirmó que están ejecutadas:

**046–063**

No volver a pedir que se ejecuten.

No cambiar ninguna de ellas.

La próxima migración disponible es:

**064**

## 058 — sincronización PAM diario / OT

Responsabilidades principales:

- sincroniza el bloque diario;
- resuelve los 27 activos diarios esperados;
- usa `apparatus_registry`;
- materializa planes de mantenimiento;
- fuerza periodicidad diaria;
- corrige fechas iniciales;
- genera OTs preventivas mediante la función existente.

Estado: **OK / congelada**

## 059 — alertas

Ajustó:

- `COALESCE(next_due_date,start_date)`;
- refresco de alertas en Home.

Estado: **OK / congelada**

## 060 — periodicidad PAM / planificación de tickets

Generaliza la planificación a periodicidades:

- Diario
- Semanal
- Quincenal
- Mensual
- Bimensual
- Trimestral
- Semestral
- Anual

Sincroniza trabajos programados con fechas reales del PAM y evita colisiones.

Estado: **OK / congelada**

## 061 — estados operativos de Tickets

Estados:

- `PENDING` → Pendiente
- `IN_MANAGEMENT` → En gestión
- `IN_PROGRESS` → En curso
- `COMPLETED` → Cerrado
- `REJECTED` → Rechazado

Reglas:

- En gestión no significa trabajo físico iniciado necesariamente.
- En curso representa inicio operativo del trabajo.
- Cerrado / Rechazado pasa al histórico.

Estado: **OK / congelada**

## 062 — importación PENDIENTES

Creó:

`public.maintenance_pending_items`

Importó:

**216 registros**

desde:

`PENDIENTES (1).xlsm`

Conserva:

- ubicación;
- categoría;
- pendiente;
- estado original;
- asignación;
- prioridad;
- observación;
- fecha;
- trazabilidad al archivo/fila.

Tres registros estaban originalmente terminados.

Estado: **OK / congelada**

## 063 — habitaciones bloqueadas

Creó:

`public.maintenance_blocked_rooms`

El bloqueo pertenece a la habitación, no al pendiente.

Campos principales:

- `id`
- `hotel_id`
- `room_number`
- `blocked_at`
- `created_at`

Tiene unicidad por:

`hotel_id + room_number`

Permisos RLS implementados.

Estado: **OK / congelada**

---

# 13. PENDIENTES — ESTADO ACTUAL

Archivo principal:

`src/features/maintenance/pages/MaintenancePendingPage.tsx`

Tabla:

`maintenance_pending_items`

Actualmente la pantalla tiene:

## Cabecera

- Logo Arias.
- Título Pendientes.
- Actualizar.
- Volver.
- Inicio.
- Nuevo pendiente.
- Histórico / Pendientes activos.

Los botones usan los componentes comunes de la aplicación.

## Tarjetas superiores

Actualmente existen cuatro tarjetas:

- Pendientes.
- Prioridad alta.
- Terminados.
- Habitaciones bloqueadas.

Las tarjetas son clicables y aplican los filtros correspondientes.

## Filtros

- Buscar.
- Estado.
- Categoría.
- Prioridad.
- Asignado.
- Habitación:
  - Todas
  - Bloqueadas
  - No bloqueadas
- Limpiar filtros.

## Columna adicional

Existe la columna:

**Bloqueada**

Permite bloquear/desbloquear una habitación desde la tabla.

## Nuevo pendiente

Existe botón:

**Nuevo pendiente**

Permite crear registros desde Arias Suite, con:

- ubicación;
- categoría;
- pendiente;
- prioridad;
- asignado;
- observación.

El origen para estos nuevos registros se marca como `ARIAS_SUITE` y no depende del Excel.

## Modificar

Existe botón de modificar.

Permite editar:

- ubicación;
- categoría;
- pendiente;
- prioridad;
- asignado;
- observación.

## No existe borrado físico como regla

La operación de eliminar debe ser una **desactivación lógica**:

`active = false`

Nunca se debe borrar físicamente un pendiente del histórico operativo sin una decisión expresa.

## Histórico de pendientes

La pantalla ya incluye el concepto de:

**Histórico**

Los registros desactivados quedan conservados.

Desde histórico se debe poder:

- consultar;
- restaurar.

Esto es importante porque permitirá posteriormente estudiar:

- qué habitaciones acumulan más reparaciones;
- qué tipos de incidencias se repiten;
- qué categorías se repiten;
- qué reparaciones tardan más;
- qué elementos producen más carga de mantenimiento.

---

# 14. PENDIENTES — LÓGICA DE HABITACIONES BLOQUEADAS

Se considera habitación cuando `location` contiene un código numérico de 3 o 4 cifras.

Ejemplos válidos:

- 213
- 305
- 805
- 1201
- 1410

No se debe interpretar automáticamente "Hotel", "SPA", "Planta 14", etc. como habitación.

Una habitación puede tener múltiples pendientes.

Ejemplo:

Habitación 1112:

- puerta de baño;
- zócalo;
- lateral;
- bañera;
- etc.

El estado de bloqueo se guarda una sola vez en:

`maintenance_blocked_rooms`

y afecta a todos los pendientes de esa habitación.

Esto evita duplicar el mismo estado.

---

# 15. PROBLEMA DEL FOCO DEL BUSCADOR

Se detectó un problema:

Al escribir una letra en el buscador, la búsqueda se ejecutaba y el foco saltaba al grid.

La causa estaba en:

`useGridKeyboardNavigation.ts`

El grid podía recuperar el foco al cambiar la lista filtrada.

Se modificó el comportamiento para:

- evitar recuperar foco repetidamente;
- no robar el foco a inputs/select/textarea;
- detener la propagación de teclado del buscador de Pendientes.

Archivo:

`src/shared/components/grid/useGridKeyboardNavigation.ts`

No deshacer esta corrección.

---

# 16. COMPONENTES DE BOTONES COMUNES

Los botones comunes se encuentran en:

`src/shared/components/buttons/IconButton.tsx`

y:

`src/shared/components/buttons/ActionButton.tsx`

Navegación:

`src/shared/components/navigation/NavigationButtons.tsx`

Componentes:

- `ActionButton`
- `IconButton`
- `BackButton`
- `HomeButton`

## Regla

Los botones nuevos de una pantalla deben usar estos componentes.

No crear estilos aislados diferentes para cada módulo salvo que exista una razón clara.

La estética general incluye:

- botones redondeados;
- degradado azul discreto;
- sombras suaves;
- comportamiento hover;
- estado disabled;
- consistencia visual.

---

# 17. TICKETS — ESTADO ACTUAL

Archivo:

`src/features/maintenance/pages/MaintenanceWorkOrdersPage.tsx`

Ruta:

`/maintenance/tickets`

Tickets visibles operativamente:

- correctivas;
- avisos / incidencias;
- tickets creados manualmente;
- trabajos que requieren gestión;
- tickets asignados.

Los preventivos del PAM no deben llenar este grid.

Los preventivos se gestionan mediante:

**Trabajos programados / Planificación**

Estados:

- Pendiente
- En gestión
- En curso

Salida:

- Cerrado
- Rechazado

## Botones actuales de cabecera

- Nuevo ticket
- Actualizar
- Reporte
- Histórico
- Volver
- Inicio

El histórico existe en:

`/maintenance/tickets/history`

Archivo:

`MaintenanceWorkOrderHistoryPage.tsx`

---

# 18. HISTÓRICO DE TICKETS

El histórico actual utiliza:

`maintenance_work_orders_resolved`

y recoge:

- Cerrados
- Rechazados

Los preventivos están excluidos del histórico operativo de Tickets cuando corresponde a esta separación funcional.

El histórico sirve para analizar:

- número de trabajos;
- activos repetitivos;
- mantenimientos repetitivos;
- responsables;
- fechas;
- cumplimiento;
- tipo de trabajo.

---

# 19. PLANIFICACIÓN

Archivo:

`src/features/maintenance/pages/MaintenancePlanningPage.tsx`

Ruta:

`/maintenance/planning`

Concepto:

**PAM → Planificación → ejecución**

La pantalla muestra trabajos derivados del PAM.

Filtros:

- Año
- Mes
- Periodicidad
- Estado
- Buscar

Estados visibles:

- Pendiente
- En curso
- Finalizado

Columnas:

- Día
- Semana
- Mes
- Equipo
- Mantenimiento
- Periodicidad
- Estado
- Ticket

Fuentes principales:

- `maintenance_scheduled_jobs`
- `maintenance_plans`
- `apparatus_registry`
- `maintenance_work_orders_resolved`

No crear otra tabla para planificación salvo necesidad real.

---

# 20. INTERVENCIONES

Archivo:

`src/features/actions/pages/ActionsPage.tsx`

Ruta:

`/maintenance/interventions`

Tabla:

`maintenance_actions`

Concepto:

Registro histórico de trabajos relevantes o especiales.

Ejemplos conceptuales:

- sustitución de acumulador;
- hipercloración;
- vaciado de piscina;
- reparación de rótulo;
- trabajos especiales;
- obras;
- sustituciones importantes.

Debe poder recoger:

- título;
- tipo;
- fecha;
- proveedor;
- persona/técnico;
- referencia;
- resultado;
- coste;
- descripción;
- observaciones;
- evidencia cuando se implemente.

No sustituye Tickets ni PAM.

---

# 21. CENTRO DE MANTENIMIENTO

Archivo:

`src/features/maintenance/pages/MaintenanceLandingPage.tsx`

Ruta:

`/maintenance`

Tarjetas principales:

- Equipos e instalaciones
- Tickets
- Trabajos programados
- Intervenciones
- PAM
- Auditoría
- Configuración

Las tarjetas son navegables.

---

# 22. HOME PRINCIPAL

Archivo:

`src/pages/Books/BooksPage.tsx`

Home principal de Arias Suite contiene módulos como:

- Mantenimiento
- Pendientes
- Stock
- Planificador Horario
- Proveedores

Pendientes ya tiene presencia en Home.

---

# 23. HISTÓRICO — OBJETIVO EVOLUTIVO

Una de las decisiones importantes de arquitectura es que "eliminar" no significa perder datos.

Para cualquier registro operativo que deje de estar activo:

**activo → desactivado → histórico**

Esto permite crear analítica futura sobre:

- habitación;
- activo;
- equipo;
- categoría;
- tipo de reparación;
- frecuencia;
- tiempos;
- coste;
- proveedor;
- responsable.

Objetivo final:

Arias Suite debe poder responder preguntas como:

- ¿Qué habitación se repara más?
- ¿Qué equipo falla más?
- ¿Qué activo genera más Tickets?
- ¿Qué tipo de avería se repite?
- ¿Qué proveedor realiza más trabajos?
- ¿Cuánto cuesta mantener un activo?
- ¿Qué instalaciones son críticas?

---

# 24. AUDITORÍA

Módulo existente:

`/maintenance/audit`

No confundir:

- Libros / auditoría
- PAM / mantenimiento preventivo

El usuario ya definió que los "libros" son para auditoría y no deben mezclarse con el PAM como trabajo preventivo.

---

# 25. PAM

Módulo principal:

`/maintenance/pam`

Archivos principales:

- `MaintenancePamPage.tsx`
- `MaintenancePamDetailPage.tsx`

Concepto:

El PAM es la fuente maestra de los trabajos preventivos.

No convertir el PAM en un simple listado de "OT".

Debe seguir siendo:

**Plan Anual de Mantenimiento**

Agrupa el mantenimiento por:

- familia;
- subfamilia;
- activo;
- periodicidad;
- calendario;
- plan.

Periodicidades aprobadas:

- Diario
- Semanal
- Quincenal
- Mensual
- Bimensual
- Trimestral
- Semestral
- Anual

---

# 26. OTRAS DECISIONES DE PRODUCTO CONGELADAS

## Dashboard

Diseño:

- minimalista;
- seis tarjetas pequeñas como referencia funcional;
- alertas discretas;
- sin menú lateral grande;
- navegación superior;
- botones tipo Android próximos al logo;
- tarjetas blancas;
- acentos azules.

## Buscador global

Está congelado como función de plataforma:

**Buscador Global**

Debe realizar búsqueda incremental sobre datos del hotel.

## Lecturas

Módulo aprobado:

- Electricidad
- Agua
- Gas

Debe detectar:

- desviaciones;
- sobreconsumo;
- alertas;
- desglose hotel;
- desglose departamentos.

## Índice de criticidad

Idea aprobada:

Dashboard de criticidad.

## Stock

Debe soportar:

- peticiones;
- recepción;
- catálogo maestro;
- búsqueda incremental;
- generación de PDF.

## Planificador Horario

Debe sustituir el antiguo concepto de Control Horario.

## Captura rápida

Fue eliminada como función independiente.

---

# 27. COSAS QUE NO DEBEN IMPLEMENTARSE EN SUITE V1

Arias Pump / telemetría / sensores / infraestructura IoT:

**CONGELADO PARA MÁS ADELANTE**

Incluye:

- Raspberry Pi;
- ESP32;
- SCT-013;
- monitorización de bombas;
- consumo por fase;
- alarmas SMS;
- fallback;
- telemetría;
- monitorización de variadores.

Estos conceptos existen como ideas futuras, pero no se deben introducir ahora dentro de Suite V1.

---

# 28. DESPLIEGUE — VERCEL

Vercel se utiliza para desplegar.

Se detectó un problema de sincronización entre GitHub y Vercel.

La rama GitHub sí avanzó hasta commits posteriores, mientras un deployment de Vercel seguía mostrando un commit antiguo.

Ejemplo de deployment antiguo:

`21439d7`

La rama de GitHub posteriormente avanzó.

Por tanto:

**No asumir que una URL concreta de preview de Vercel representa siempre el HEAD actual de GitHub.**

Una URL de deployment concreta puede permanecer asociada a una versión concreta.

Cuando Vercel no recoja automáticamente un commit, el procedimiento utilizado fue:

Vercel → Deployments → Create Deployment → seleccionar la rama:

`feature/arias-suite-common-ui-v1`

y desplegar manualmente.

---

# 29. URL DE PREVIEW CONOCIDA

URL facilitada durante esta continuidad:

`https://arias-suite-2vuor4l3l-arias9.vercel.app`

Esta URL fue utilizada para comprobar un deployment concreto.

No asumir que esta URL se actualiza con cada commit si es una URL de deployment específica.

---

# 30. SECUENCIA RECIENTE DE COMMITS RELEVANTES

Commits importantes de esta continuidad:

- `8815bc72233c1e82b949e1c9c75ae31ea754411f`
  - Corrección delimitadores migración 060.

- `5ffd813a0cf62326094d8e6dd6bb7b63274085a4`
  - Filtros en Tickets.

- `ee1de06814a530f3d416cbcb14f87abc51909c23`
  - Ajustes de pendientes / planificación.

- `7b87be56c2291a3b9f814ae88ad96bcbb896031a`
  - Corrección de `getGridProps` en Pendientes.

- `a3f5f4bb8b8f92fe9ed7001285994bf15e5eed84`
  - Corrección de `getGridProps` y `CalendarClock` en Planificación.

- `2e04b57d7732eda1b356339d54c97b17971d685f`
  - Commit técnico usado para provocar nuevo deployment.

- `bdffb7d9cebc98ff79b4bd62f9b7b69f23cdd725`
  - Botones comunes / ajustes de Pendientes.

- `aa0839874f23b280c21c4ce4e65af3f3a10687a8`
  - Botones comunes / Planificación.

- `1bb205525353b24b4675e33b79f4529bac616fd0`
  - Control de habitaciones bloqueadas / filtros.

- `6ade8bbb2321f9ed4f88cce67331409c76f11920`
  - Ajuste de nombre de columna.

- `31a734e9594d68c8395e5e43cf3242c0c37536c4`
  - Corrección del foco del grid.

- `f19c438e9e0e28cebed7f4fe85e1663d7ce3ee24`
  - Aislamiento de teclado del buscador.

- `b59f046e16995607b17edabc2e8e81fa197c2cb1`
  - Nuevo pendiente + histórico + botones comunes.

---

# 31. ÚLTIMO ESTADO DE PENDIENTES

En el HEAD actual conocido se ha confirmado que la pantalla ya incorpora:

- Nuevo pendiente.
- Histórico.
- Pendientes activos.
- Actualizar.
- Volver.
- Inicio.
- Tarjetas superiores clicables.
- Filtros.
- Bloqueo de habitaciones.
- Modificación.
- Desactivación lógica.
- Restauración desde histórico.
- Componentes comunes de botones.
- Protección del foco del buscador.

Antes de modificar cualquier cosa, el nuevo chat debe volver a leer `MaintenancePendingPage.tsx` desde GitHub porque el código puede haber avanzado.

---

# 32. IMPORTANTE: EL HISTÓRICO NO ES BORRADO

La regla funcional correcta es:

**Eliminar de la vista operativa ≠ borrar de la base de datos**

Para Pendientes:

`active = false`

El registro sigue existiendo.

Esto es fundamental para el futuro analítico.

---

# 33. PERMISOS

El módulo de mantenimiento utiliza permisos existentes:

- `maintenance.view`
- `maintenance.create`
- `maintenance.update`
- `maintenance.delete`

Reglas generales:

- consulta según `maintenance.view`;
- creación según `maintenance.create`;
- modificación / operaciones de gestión según `maintenance.update`;
- borrado físico no debe utilizarse por defecto para Pendientes.

En tickets existe además la regla:

**Solo Head of Maintenance o usuarios con permiso pueden asignar / reasignar Tickets.**

---

# 34. RLS

Las nuevas estructuras deben mantener:

- `hotel_id`;
- RLS;
- acceso por hotel;
- permisos de mantenimiento.

No crear una tabla operativa sin revisar:

1. hotel scope;
2. política SELECT;
3. política INSERT;
4. política UPDATE;
5. política DELETE si aplica;
6. permisos correspondientes.

---

# 35. CÓMO CREAR UNA NUEVA MIGRACIÓN

La siguiente migración disponible será:

**064**

Nunca reutilizar 063.

Nunca editar:

- 046;
- 047;
- 048;
- 049;
- 050;
- 051;
- 052;
- 053;
- 054;
- 055;
- 056;
- 057;
- 058;
- 059;
- 060;
- 061;
- 062;
- 063.

El patrón debe ser:

`064_nombre_descriptivo.sql`

y posteriormente:

- commit GitHub;
- ejecutar en Supabase;
- confirmar resultado;
- congelar la migración.

---

# 36. QUÉ HACER ANTES DE MODIFICAR CÓDIGO

Secuencia obligatoria:

1. Leer HEAD actual.
2. Leer el archivo afectado.
3. Leer los componentes compartidos que utiliza.
4. Leer la migración relacionada si la funcionalidad depende de DB.
5. Comprobar si ya existe tabla/RPC/campo.
6. Evitar duplicar funcionalidad existente.
7. Modificar directamente en GitHub.
8. Crear commit.
9. Comprobar el nuevo HEAD.
10. Desplegar / comprobar Vercel.
11. No afirmar que el build está verde sin evidencia.

---

# 37. LO QUE NO HAY QUE HACER

No:

- tocar Login;
- tocar migraciones ejecutadas;
- pedir repetir una migración confirmada como OK;
- crear otra tabla si ya existe una adecuada;
- duplicar datos;
- crear "Incidencias" si el concepto debe ser Tickets;
- mezclar preventivos con Tickets;
- volver a introducir menú lateral grande;
- crear botones con estilos aislados si existe `ActionButton` / `IconButton`;
- mover lógica de negocio a la UI cuando debe vivir en DB / RPC;
- hacer borrado físico por comodidad;
- asumir que Vercel ha desplegado porque GitHub tiene un commit;
- afirmar que el build está correcto sin comprobar Vercel;
- pedir al usuario que copie manualmente código si se puede editar directamente GitHub.

---

# 38. PRÓXIMO PASO RECOMENDADO

Antes de seguir añadiendo funciones, revisar en la rama actual:

1. **Pendientes**
   - probar Nuevo;
   - probar Modificar;
   - probar desactivar;
   - probar Histórico;
   - probar Restaurar;
   - probar bloqueado/desbloqueado;
   - probar tarjetas;
   - probar filtro;
   - comprobar que el buscador mantiene foco.

2. **Vercel**
   - confirmar que el deployment corresponde al HEAD actual.

3. **Tickets**
   - comprobar que los preventivos siguen fuera del grid operativo.

4. **Planificación**
   - comprobar que los trabajos derivados del PAM aparecen correctamente.

5. **Histórico**
   - revisar que los datos permiten análisis futuro por activo/habitación/tipo.

---

# 39. PROMPT DE ARRANQUE PARA EL SIGUIENTE CHAT

Pegar también este bloque después del texto anterior:

> Primero no hagas ningún cambio.
>
> Lee el HEAD real de `feature/arias-suite-common-ui-v1`.
>
> Lee:
>
> - `docs/MAESTRO_CONTINUIDAD_ARIAS_SUITE.md`
> - `src/features/maintenance/pages/MaintenancePendingPage.tsx`
> - `src/features/maintenance/pages/MaintenanceWorkOrdersPage.tsx`
> - `src/features/maintenance/pages/MaintenancePlanningPage.tsx`
> - `src/shared/components/buttons/ActionButton.tsx`
> - `src/shared/components/buttons/IconButton.tsx`
> - `src/shared/components/navigation/NavigationButtons.tsx`
> - `src/shared/components/grid/useGridKeyboardNavigation.ts`
>
> Después dime el estado real que encuentras en GitHub y cuál es el HEAD actual.
>
> No cambies nada hasta que yo te diga la siguiente tarea.
>
> Recuerda:
> **trabajar directamente en GitHub, no en local.**

---

# 40. RESUMEN EJECUTIVO PARA NO PERDER EL HILO

Arias Suite es un sistema modular de mantenimiento hotelero.

La arquitectura central es:

**PAM → Planificación → Tickets → Histórico**

con:

**Intervenciones** como registro de trabajos especiales relevantes.

El backlog **Pendientes** es independiente de Tickets.

Pendientes actualmente dispone de:

- 216 registros importados inicialmente;
- tarjetas resumen;
- filtros;
- búsqueda incremental;
- habitaciones bloqueadas;
- Nuevo;
- Modificar;
- desactivación lógica;
- Histórico;
- Restaurar.

La DB tiene las migraciones **046–063 confirmadas como OK**.

La siguiente migración es **064**.

El repositorio activo es:

`EmersonArias/arias-pam`

Rama:

`feature/arias-suite-common-ui-v1`

El desarrollo debe continuar:

**GitHub directo → commit → Vercel**

Nunca asumir que Vercel está sincronizado simplemente porque GitHub tiene un commit nuevo.

Nunca modificar migraciones ya ejecutadas.

Nunca tocar Login salvo petición expresa.

Nunca perder histórico por borrado físico.

---

# 41. REGLA FINAL PARA EL NUEVO CHAT

La frase que resume todo el método de trabajo es:

> **Lee primero. Comprueba. Modifica directamente GitHub. Haz commit. Verifica. No asumas. No rompas lo congelado.**

Este documento debe acompañar la continuidad del proyecto.
