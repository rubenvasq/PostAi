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
| MVP-004 | Carrito y checkout | Pendiente | MVP-003 |
| MVP-012 | Panel web administrativo básico | Pendiente | MVP-002 |

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
| MVP-001 | Autenticación y registro (backend) | 2026-11-06 |
| ADR-004 | Autenticación y sesiones del backend | 2026-11-06 |
| MVP-002 | Comercio y configuración básica (backend): `GET/PATCH /v1/merchant`, `GET /v1/branches`, contexto `X-Merchant-Id` | 2026-11-06 |
| MVP-003 | Catálogo (backend): categorías, impuestos y productos con paginación, autorización por membresía y aislamiento por comercio | 2026-11-06 |
| MVP-008 | Clientes básicos (backend): `GET/POST /v1/customers`, `GET/PATCH /v1/customers/{customerId}`, búsqueda, paginación y aislamiento por comercio | 2026-11-06 |
| MVP-009 | Inventario básico (backend): `GET /v1/inventory`, `POST /v1/inventory/{productId}/adjustments` y `GET /v1/inventory/movements` con sucursal `MAIN`, stock no negativo y aislamiento por comercio (`ADR-005`) | 2026-11-06 |
| ADR-006 | Modelo de terminal sin roles de empleado; autorización por membresía activa | 2026-11-06 |
| MVP-005 | Registro de ventas (backend): `POST/GET /v1/sales`, `GET /v1/sales/{saleId}`, anulación e idempotencia con cálculo en servidor (`ADR-007`) | 2026-11-06 |
| MVP-006 | Pagos simulados (backend): `GET /v1/payment-methods`, `POST/GET /v1/sales/{saleId}/payments`, `GET /v1/payments/{paymentId}`, descuento de inventario transaccional (`ADR-007`) | 2026-11-06 |
| ADR-007 | Ventas y pagos simulados del MVP | 2026-11-06 |
| MVP-007 | Historial, detalle y comprobante (backend): `GET /v1/sales/{saleId}/receipt` con número de comprobante legible secuencial por comercio | 2026-11-06 |
| MVP-011 | Dashboard e indicadores (backend): `GET /v1/dashboard/summary` y `GET /v1/reports/sales` (agregación por backend, zona `America/Bogota`, aislado por comercio) | 2026-11-06 |
| MVP-013 | Auditoría (backend): `GET /v1/audit-logs` con filtros y paginación; registro best-effort de `sale.created`, `sale.cancelled` y `payment.approved` con autor y metadatos | 2026-11-06 |
| MVP-010 | Terminales y sesiones por dispositivo (backend): `GET /v1/auth/sessions` y `DELETE /v1/auth/sessions/{sessionId}`; cada refresh token guarda `deviceName` (`X-Device-Name`), `userAgent`, `ipAddress` y `lastUsedAt`, aislado por usuario | 2026-11-07 |

> `INF-002` e `INF-005` quedaron configurados y validados. La migración inicial
> `20261107004220_init` ya está aplicada contra PostgreSQL y el flujo real de
> registro, login, refresh, logout y `me` fue verificado.
> El repositorio está publicado en
> [`rubenvasq/PostAi`](https://github.com/rubenvasq/PostAi) y el CI de `INF-007`
> se ejecutó correctamente sobre `main`.

### Criterios cumplidos de `MVP-001`

- [x] `POST /v1/auth/register` crea usuario, comercio, sucursal `MAIN` y membresía en una transacción, sin roles (`ADR-006`).
- [x] `POST /v1/auth/login` valida credenciales y devuelve tokens y membresías.
- [x] `POST /v1/auth/refresh` rota el refresh token y rechaza tokens revocados o expirados.
- [x] `POST /v1/auth/logout` revoca el refresh token y responde `204`.
- [x] `GET /v1/auth/me` devuelve usuario y membresías con bearer token.
- [x] Contraseñas con bcrypt; refresh tokens guardados solo como hash; access token JWT de corta vida.
- [x] Errores con el formato del contrato.
- [x] Pruebas automáticas y CI en verde.

### Criterios cumplidos de `MVP-008`

- [x] `GET /v1/customers` lista clientes del comercio con `search`, `page` y `pageSize`, sin filtrar datos de otros comercios.
- [x] `POST /v1/customers` crea un cliente con `name` obligatorio y `email`, `phone`, `taxId` y `notes` opcionales; normaliza y valida el correo.
- [x] `GET /v1/customers/{customerId}` devuelve el cliente o `404` si no pertenece al comercio.
- [x] `PATCH /v1/customers/{customerId}` actualiza campos parciales y permite limpiar opcionales con `null`.
- [x] Pueden leer y escribir cualquier miembro activo; sin roles de empleado (`ADR-006`).
- [x] Errores con el formato del contrato y entradas validadas con Zod.
- [x] Pruebas automáticas en verde (36 pruebas) y flujo real verificado contra PostgreSQL, incluido el aislamiento entre comercios.

### Criterios cumplidos de `MVP-009`

- [x] `GET /v1/inventory` lista productos inventariables con `search`, `lowStock`, `page` y `pageSize`, aislando por comercio.
- [x] `POST /v1/inventory/{productId}/adjustments` registra un movimiento `ADJUSTMENT` y actualiza el stock de forma transaccional.
- [x] `GET /v1/inventory/movements` lista movimientos con filtros `productId`, `from`, `to`, paginación y aislamiento.
- [x] No se permite stock negativo; un ajuste inválido responde `422`.
- [x] Los servicios y productos sin control de inventario se rechazan en ajustes y no aparecen en el listado.
- [x] Lectura y ajustes para cualquier miembro activo; sin roles de empleado (`ADR-006`).
- [x] Errores con el formato del contrato y entradas validadas con Zod.
- [x] Pruebas automáticas en verde (47 pruebas) y flujo real verificado contra PostgreSQL, incluido el aislamiento entre comercios.

### Criterios cumplidos de `MVP-010`

- [x] `GET /v1/auth/sessions` lista las sesiones activas (refresh tokens vigentes)
      de la cuenta con `deviceName`, `userAgent`, `ipAddress`, `createdAt`,
      `lastUsedAt` y `expiresAt`, ordenadas por último uso.
- [x] `DELETE /v1/auth/sessions/{sessionId}` revoca una sesión propia e invalida
      su refresh token; responde `404` si no existe o no pertenece al usuario.
- [x] `register`, `login` y `refresh` capturan el dispositivo desde el encabezado
      `X-Device-Name`, el `User-Agent` y la IP; el refresh conserva la identidad
      del dispositivo al rotar.
- [x] Aislamiento por usuario: nadie puede listar ni revocar sesiones ajenas.
- [x] Migración `20261107052000_add_device_sessions` (aditiva) lista para aplicar.
- [x] Pruebas automáticas en verde (88 pruebas) y OpenAPI validado.

## Próxima acción recomendada

1. Aplicar la migración `20261107052000_add_device_sessions` contra PostgreSQL
   (requiere `docker compose up` y `DATABASE_URL`) y verificar el flujo real de
   sesiones por dispositivo.
2. Mantener `PAY-001` en paralelo: investigar proveedores SoftPOS con operación
   en Colombia y registrar hallazgos verificados en `docs/providers/`.
3. Añadir rate limiting en login/refresh antes de exponer la API a Internet
   (ver `ADR-004`).
