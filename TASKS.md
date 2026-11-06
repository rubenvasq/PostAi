# TASKS — Fuente de verdad del progreso

Estados: `Pendiente`, `En curso`, `En revisión`, `Bloqueada`, `Hecho`,
`Descartada`.

## En curso

_(nada por ahora)_

## En revisión

_(nada por ahora)_

## Pendientes

### Documentación y arquitectura

| ID | Tarea | Estado | Depende de |
| --- | --- | --- | --- |
| ARQ-001 | Decidir stack móvil y registrar ADR-001 | Pendiente | investigación SDK |
| PAY-001 | Investigar proveedores SoftPOS con operación en Colombia | Pendiente | — |
| PAY-002 | Solicitar documentación, SDK y sandbox | Pendiente | PAY-001 |
| PAY-003 | Confirmar dispositivos Android compatibles | Pendiente | PAY-001 |
| PAY-004 | Validar certificaciones (PCI MPoC cuando aplique) | Pendiente | PAY-001 |
| PAY-005 | Definir modelo comercial: comisiones, planes, liquidaciones | Pendiente | PAY-001 |
| ARQ-004 | Definir contrato interno `PaymentProvider` según SDK real | Pendiente | PAY-002, ARQ-003 |

### Fundación

| ID | Tarea | Estado | Depende de |
| --- | --- | --- | --- |
| INF-004 | Configurar app Android según stack elegido | Pendiente | INF-001, ARQ-001 |

### Producto MVP

| ID | Tarea | Estado | Depende de |
| --- | --- | --- | --- |
| MVP-001 | Autenticación y registro | Pendiente | INF-002, INF-004 |
| MVP-002 | Comercio y configuración básica | Pendiente | MVP-001 |
| MVP-003 | Productos, servicios y categorías | Pendiente | MVP-002 |
| MVP-004 | Carrito y checkout | Pendiente | MVP-003 |
| MVP-005 | Registro de ventas | Pendiente | MVP-004 |
| MVP-006 | Pagos simulados (efectivo/transferencia y tarjeta sandbox) | Pendiente | MVP-005 |
| MVP-007 | Historial, detalle de venta y comprobantes | Pendiente | MVP-005 |
| MVP-008 | Clientes básicos | Pendiente | MVP-002 |
| MVP-009 | Inventario básico | Pendiente | MVP-003 |
| MVP-010 | Empleados, roles y permisos básicos | Pendiente | MVP-002 |
| MVP-011 | Dashboard con indicadores esenciales | Pendiente | MVP-005 |
| MVP-012 | Panel web administrativo básico | Pendiente | MVP-002 |
| MVP-013 | Auditoría de operaciones relevantes | Pendiente | MVP-001 |

### Integración SoftPOS

| ID | Tarea | Estado | Depende de |
| --- | --- | --- | --- |
| PAY-010 | Módulo de integración del SDK en la app Android | Bloqueada | PAY-002, ARQ-004, INF-004 |
| PAY-011 | Verificación de compatibilidad del dispositivo | Bloqueada | PAY-003, PAY-010 |
| PAY-012 | Activación y vinculación del comercio | Bloqueada | PAY-010 |
| PAY-013 | Inicio y seguimiento de transacciones reales | Bloqueada | PAY-012 |
| PAY-014 | Webhooks y verificación de resultados en backend | Bloqueada | PAY-002, ARQ-003 |
| PAY-015 | Idempotencia y prevención de cobros duplicados | Bloqueada | PAY-013 |
| PAY-016 | Conciliación y liquidaciones | Bloqueada | PAY-005, PAY-014 |
| PAY-017 | Reembolsos, si el proveedor lo permite | Bloqueada | PAY-013 |

## Bloqueadas

Las tareas `PAY-010` a `PAY-017` permanecen bloqueadas hasta confirmar proveedor,
SDK, sandbox y condiciones comerciales para Colombia.

## Hecho

| ID | Tarea | Fecha |
| --- | --- | --- |
| DOC-001 | Crear documentos base del proyecto | 2026-11-06 |
| DOC-002 | Registrar nombre y nomenclatura oficial: PostAi / Equipo PostAi (`ADR-003`) | 2026-11-06 |
| ARQ-002 | Modelo de datos del núcleo comercial | 2026-11-06 |
| ADR-002 | Supuestos pragmáticos del MVP | 2026-11-06 |
| ARQ-003 | Contrato API v1 del MVP | 2026-11-06 |
| INF-001 | Estructura del monorepo `postai` (api + admin) | 2026-11-06 |
| INF-002 | Backend con Express, TypeScript, Prisma y PostgreSQL | 2026-11-06 |
| INF-003 | Panel web con React, Vite, Tailwind y base shadcn/ui | 2026-11-06 |
| INF-005 | Docker Compose y variables de entorno | 2026-11-06 |
| INF-006 | Lint, formato, typecheck y pruebas | 2026-11-06 |
| INF-007 | CI con GitHub Actions | 2026-11-06 |

> `INF-002` e `INF-005` quedaron configurados y validados. La migración inicial
> no se aplicó porque el daemon de Docker no estaba disponible en el entorno.
> El repositorio está publicado en
> [`rubenvasq/PostAi`](https://github.com/rubenvasq/PostAi) y el CI de `INF-007`
> se ejecutó correctamente sobre `main`.

## Próxima acción recomendada

1. Implementar autenticación y registro (`MVP-001`) en el backend; la parte
   móvil queda bloqueada hasta `ARQ-001`.
2. Mantener `PAY-001` en paralelo: investigar proveedores SoftPOS con operación
   en Colombia y registrar hallazgos verificados en `docs/providers/`.
3. Aplicar la migración inicial cuando Docker esté disponible.
