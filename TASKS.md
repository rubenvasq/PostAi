# TASKS — Fuente de verdad del progreso

Estados: `Pendiente`, `En curso`, `En revisión`, `Bloqueada`, `Hecho`,
`Descartada`.

## En curso

| ID | Tarea | Estado | Nota |
| --- | --- | --- | --- |
| PAY-002 | Solicitar documentación, SDK y sandbox | En curso | Contactos verificados y borradores listos en `docs/providers/PAY-002-contacto.md`. Credibanco tiene marketplace con auto-registro y sandbox (API REST); Symbiotic: sales@symbiotic.com. Endpoint sandbox de «Botón de pagos» registrado en `credibanco.md` (requiere SSO; `403` en la raíz). PDF «Botón de Pagos 2.0» analizado (2026-11-08): es una pasarela **web/API REST** (SSO, `formUrl`, consulta de estado, anulación total y callbacks), **no** el SDK Android; hallazgos y relevancia en `credibanco.md`. La producción exige **certificación: dos requests exitosos por servicio (100 %)**; falta que una persona registre la cuenta, envíe los correos y obtenga credenciales, URLs, tarjetas y casos de prueba. |

## En revisión

_(nada por ahora)_

## Pendientes

### Documentación y arquitectura

| ID | Tarea | Estado | Depende de |
| --- | --- | --- | --- |
| ARQ-001 | Decidir stack móvil y registrar ADR-001 | Pendiente | investigación SDK |
| PAY-003 | Confirmar dispositivos Android compatibles | Pendiente | PAY-001 |
| PAY-004 | Validar certificaciones (PCI MPoC cuando aplique) | Pendiente | PAY-001 |
| PAY-005 | Definir modelo comercial: comisiones, planes, liquidaciones | Pendiente | PAY-001 |
| ARQ-004 | Definir contrato interno `PaymentProvider` según SDK real | Pendiente | PAY-002, ARQ-003 |

### Fundación

| ID | Tarea | Estado | Depende de |
| --- | --- | --- | --- |
| INF-004 | Configurar app Android según stack elegido | Pendiente | INF-001, ARQ-001 |

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
| MVP-004 | Carrito y checkout (backend): `POST /v1/carts`, `GET/PATCH/DELETE /v1/carts/{cartId}`, `POST /v1/carts/{cartId}/items`, `PATCH/DELETE .../items/{itemId}` y `POST /v1/carts/{cartId}/checkout`; carrito persistido con totales vivos y checkout idempotente que crea la venta en `DRAFT` (`ADR-008`) | 2026-11-07 |
| PAY-001 | Investigar proveedores SoftPOS con operación en Colombia y registrar fuentes verificadas: fichas de Credibanco, Symbiotic, SumUp, Redeban y Bold en `docs/providers/`, con tabla de candidatos y criterio de encaje por SDK | 2026-11-07 |
| SEC-001 | Rate limiting de autenticación: límite de intentos fallidos en `POST /v1/auth/login` (por correo e IP) y `POST /v1/auth/refresh` (por IP), respuesta `429 RATE_LIMITED` con `Retry-After`, configurable por entorno (`ADR-004`) | 2026-11-07 |
| MVP-012 | Panel web administrativo básico (`apps/admin`): auth con refresh compartido, dashboard, ventas, catálogo, clientes e inventario contra `/v1`, sin cambios de backend (`ADR-009`) | 2026-11-07 |
| PAY-017 | Reembolsos del MVP (backend y panel): `GET/POST /v1/payments/{paymentId}/refunds`, reembolso total del saldo, idempotente, repone inventario (`RETURN`), estados `REFUNDED`, auditoría `payment.refunded`; solo métodos sin proveedor, SoftPOS real `501`; acción «Reembolsar» en el panel | 2026-11-07 |
| MVP-014 | Caja y gastos (backend y panel): sesiones de caja por sucursal con una sola `OPEN`, movimientos manuales, gastos con/sin sesión, cierre con esperado y diferencia, movimientos automáticos `SALE`/`REFUND` en efectivo, `openCashSession` en el dashboard y página «Caja y gastos» en el panel (`ADR-010`) | 2026-11-08 |

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

### Criterios cumplidos de `MVP-004`

- [x] `POST /v1/carts` crea un carrito `OPEN` (cliente y notas opcionales); los
      totales arrancan en cero y se calculan en vivo contra el catálogo.
- [x] `POST /v1/carts/{cartId}/items` agrega productos y variantes; si ya existen
      suma la cantidad. Rechaza producto inexistente/ajeno (`404`) o inactivo
      (`422`).
- [x] `PATCH/DELETE .../items/{itemId}` y `PATCH /v1/carts/{cartId}` (cliente,
      notas, descuento con limpieza por `null`) recalculan totales; solo sobre
      carritos `OPEN` (`409` en otro estado).
- [x] Los ítems con producto o variante no disponible se marcan
      `available: false`, no suman al total y bloquean el checkout.
- [x] `POST /v1/carts/{cartId}/checkout` crea la venta en `DRAFT` delegando en
      `SaleService` (recálculo autoritativo, `ADR-007`); es idempotente por
      carrito (`checkoutSaleId`) y el carrito pasa a `CHECKED_OUT`.
- [x] Carrito vacío responde `422`; aislamiento por comercio (`404`) y membresía
      activa sin roles (`ADR-006`, `ADR-008`).
- [x] Migración `20261107060000_add_carts` (aditiva) lista para aplicar.
- [x] Pruebas automáticas en verde (102 pruebas, 14 nuevas) y OpenAPI validado.

### Criterios cumplidos de `MVP-012`

- [x] Login contra `POST /v1/auth/login`; logout contra
      `POST /v1/auth/logout`; sesión en `sessionStorage`.
- [x] Renovación transparente del access token con `POST /v1/auth/refresh` y
      una sola promesa compartida ante `401` concurrentes.
- [x] `X-Merchant-Id` en llamadas con contexto de comercio y selector cuando el
      usuario tiene varias membresías activas.
- [x] Dashboard con `GET /v1/dashboard/summary` y `GET /v1/reports/sales`
      (rango de fechas, ventas por día y pagos por método).
- [x] Catálogo con CRUD mínimo: productos/servicios, categorías e impuestos,
      búsqueda y paginación.
- [x] Clientes con búsqueda, paginación, alta y edición.
- [x] Inventario con stock, filtro `lowStock`, ajustes y movimientos.
- [x] Historial de ventas, detalle, pagos y comprobante imprimible.
- [x] Pagos simulados distinguidos con insignia y aviso explícito; el panel solo
      muestra estados que calcula el backend.
- [x] Errores con el formato del contrato y entradas validadas en formularios.
- [x] `npm run lint`, `npm run typecheck`, build del panel y `format:check` en
      verde; pruebas de la API en verde (102).
- [x] Verificación E2E contra PostgreSQL 17, API real y panel en Vite:
      registro, login, refresh, logout, `me`, comercio, catálogo, clientes,
      inventario, venta, pago simulado, comprobante, dashboard y reportes.
- [x] Verificación de UI con navegador headless: login, dashboard, catálogo,
      clientes, inventario, historial, detalle de venta y aviso de simulado.
- [x] Merge del PR
      [#1](https://github.com/rubenvasq/PostAi/pull/1) (`ddc8d19`), autorizado
      por el responsable del repositorio y con CI en verde (run
      `42430371896`).

Decisiones registradas en
[`ADR-009`](docs/architecture/ADR-009-panel-web-sesion-y-navegacion.md).
Uso y variables de entorno en [`apps/admin/README.md`](apps/admin/README.md).

### Hallazgos de `PAY-001` (2026-11-07)

- Candidatos con **SDK para apps de terceros** (encaje con PostAi, prioritarios):
  **Credibanco** (adquirente local; SDK, deep link y white-label; Android 8.1+;
  NFC; Visa/Amex/MC; hasta $250.000 COP) y **Symbiotic** (habilitador LATAM;
  SDK/white-label/deep link; declara MPoC y CPoC; Colombia confirmada).
- Soluciones de **app propia** (encaje por confirmar): **SumUp** (Colombia,
  2,49 % + IVA), **Redeban** (Tap to Phone con Visa) y **Bold** (Bold Tap).
- Todo lo sensible (PCI MPoC con evidencia, dispositivos, sandbox, webhooks,
  reembolsos, liquidaciones y comisiones de los habilitadores) sigue
  `Por verificar` y es alcance de `PAY-002` a `PAY-005`.
- Detalle y fuentes en `docs/providers/` (una ficha por proveedor).

### Criterios cumplidos de `PAY-017`

- [x] `POST /v1/payments/{paymentId}/refunds` reembolsa el total del saldo del
      pago (`422` ante importes parciales), es idempotente por `Idempotency-Key`
      y aísla por comercio (`404` para pagos ajenos).
- [x] Solo métodos sin proveedor; un pago `CARD_SOFTPOS` responde `501` y un pago
      no aprobado o ya reembolsado responde `409`.
- [x] El reembolso crea un registro `APPROVED`, actualiza el pago y la venta a
      `REFUNDED`, repone el inventario de productos controlados con un movimiento
      `RETURN` y registra la auditoría `payment.refunded`.
- [x] `GET /v1/payments/{paymentId}/refunds` lista los reembolsos del pago.
- [x] Panel: acción «Reembolsar» en el detalle de venta con motivo opcional y
      tabla de reembolsos registrados.
- [x] Pruebas automáticas en verde (117 pruebas, 7 nuevas), typecheck, lint,
      `format:check` y build de API y panel en verde.

### Criterios cumplidos de `MVP-014`

- [x] `GET /v1/cash/sessions/current`, `GET/POST /v1/cash/sessions`, `POST
      /v1/cash/sessions/{sessionId}/close`, `GET/POST
      /v1/cash/sessions/{sessionId}/movements`, `GET/POST /v1/expenses`
      implementados según el contrato v1.
- [x] Una sola sesión `OPEN` por sucursal, reforzada con el índice único parcial
      `cash_sessions_branch_open_key`; abrir una segunda caja responde `409`.
- [x] El cierre calcula `expectedAmount` como entradas menos salidas de los
      movimientos y guarda `difference` y notas del cierre.
- [x] Los movimientos manuales (`DEPOSIT`, `WITHDRAWAL`, `ADJUSTMENT`) solo se
      aceptan en cajas abiertas, con importe entero positivo y dirección
      explícita.
- [x] Los gastos pueden asociarse a una caja abierta (`EXPENSE`/`OUT`) o
      registrarse sin afectar el efectivo; se listan con filtros y paginación.
- [x] Los pagos y reembolsos en efectivo crean movimientos `SALE`/`REFUND`
      dentro de la misma transacción Serializable, solo si hay caja abierta.
- [x] `GET /v1/dashboard/summary` devuelve `openCashSession` real o `null`.
- [x] Panel: página «Caja y gastos» con apertura, movimientos, cierre, historial
      y gastos.
- [x] Pruebas automáticas en verde (127 pruebas, 10 nuevas), typecheck, lint,
      `format:check` y build de API y panel en verde.

## Próxima acción recomendada

1. Verificar `MVP-014` contra PostgreSQL 17 con el flujo real: abrir caja,
   vender en efectivo, reembolsar, registrar un gasto y cerrar la caja con
   diferencia.
2. `PAY-002`: contactar a **Credibanco** y **Symbiotic** para solicitar acceso
   al **SDK Android**, credenciales de sandbox, URLs de prueba/producción,
   tarjetas y casos de prueba de la certificación; confirmar estado PCI MPoC y
   el modelo de contratación en Colombia. El PDF recibido es de «Botón de pagos»
   (web), no del SDK.
3. Confirmar si **SumUp**, **Redeban** y **Bold** ofrecen SDK de integración
   para terceros; si solo operan con su app propia, marcarlos `Descartado` para
   el modelo de PostAi.
4. Con la respuesta de SDK real, retomar `ARQ-001` (stack móvil, `ADR-001`) y
   `ARQ-004` (contrato interno `PaymentProvider`).
