# Changelog

Todos los cambios relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
versionado se adoptará cuando exista la primera entrega.

## [Unreleased]

### Añadido

- Caja y gastos del MVP (`MVP-014`): endpoints `GET/POST
  /v1/cash/sessions`, `GET /v1/cash/sessions/current`, `POST
  /v1/cash/sessions/{sessionId}/close`, `GET/POST
  /v1/cash/sessions/{sessionId}/movements` y `GET/POST /v1/expenses`.
  Una sola sesión `OPEN` por sucursal (índice único parcial), cierre con
  efectivo esperado y diferencia, gastos asociados o no a la caja y movimientos
  automáticos `SALE`/`REFUND` para pagos y reembolsos en efectivo. El dashboard
  devuelve `openCashSession` y el panel incorpora la página «Caja y gastos».
  Decisiones en `ADR-010`.
- Endpoint sandbox de «Botón de pagos» de Credibanco registrado en
  `docs/providers/credibanco.md` y `PAY-002-contacto.md` (requiere SSO; la raíz
  responde `403`).
- Reembolsos del MVP (backend y panel): `GET /v1/payments/{paymentId}/refunds`
  y `POST /v1/payments/{paymentId}/refunds` con reembolso **total** del saldo del
  pago, idempotencia por `Idempotency-Key`, reposición de inventario de productos
  controlados (movimiento `RETURN`), actualización de estados de pago y venta a
  `REFUNDED` y auditoría `payment.refunded`. Solo métodos sin proveedor; SoftPOS
  real responde `501`. En el panel, acción «Reembolsar» en el detalle de venta y
  listado de reembolsos registrados.
- Rate limiting de autenticación: límite de intentos fallidos en `POST
  /v1/auth/login` (por correo e IP) y `POST /v1/auth/refresh` (por IP) con
  ventana deslizante en memoria, respuesta `429 RATE_LIMITED` con `Retry-After`
  y claves derivadas con SHA-256; configurable por variables de entorno
  (`AUTH_RATE_LIMIT_WINDOW_SECONDS`, `AUTH_LOGIN_MAX_ATTEMPTS_PER_EMAIL`,
  `AUTH_LOGIN_MAX_ATTEMPTS_PER_IP`, `AUTH_REFRESH_MAX_ATTEMPTS_PER_IP`). Ver
  `ADR-004`.
- Documento de contexto operativo `PROJECT_CONTEXT.md`.
- Reglas y convenciones para agentes en `AGENTS.md`.
- Backlog inicial y fuente de verdad del progreso en `TASKS.md`.
- Estructura documental `docs/` con índices por área.
- Plantilla de ADR (`docs/architecture/ADR-000-plantilla.md`).
- ADR-001 de stack móvil en estado propuesto.
- Guía y plantilla para evaluar proveedores SoftPOS en `docs/providers/`.
- `.gitignore` inicial para dependencias, secretos, builds y Android.
- `.editorconfig` con convenciones de formato.
- Modelo de datos del núcleo comercial (`docs/database/data-model.md`) con ERD,
  entidades, estados, invariantes e índices.
- Esquema Prisma ejecutable (`apps/api/prisma/schema.prisma`), generado y
  validado.
- ADR-002 con los supuestos pragmáticos del MVP (COP en pesos enteros, un pago
  por venta, sin facturación electrónica, entre otros).
- Contrato API v1 en `docs/api/README.md` y `docs/api/openapi.yaml`, con
  autenticación, catálogo, ventas, pagos, caja y reportes.
- Validación del esquema Prisma y del contrato OpenAPI.
- ADR-003 con el nombre y la nomenclatura oficial: **Equipo PostAi**, producto
  **PostAi**, repositorio `postai`, paquetes `@postai/*`, base de datos `postai`.
- Nombre oficial aplicado a `PROJECT_CONTEXT.md`, `README.md`, `AGENTS.md`,
  `docs/api/`, `docs/database/` y `docs/development/`.
- Scaffolding del monorepo con npm workspaces (`INF-001`):
  - `apps/api`: Express 5, TypeScript estricto, Zod, Prisma, endpoint `/health`,
    manejo uniforme de errores y pruebas con Vitest + Supertest.
  - `apps/admin`: React 19, Vite 8, Tailwind CSS 4, base de shadcn/ui y estado
    de la API en el panel.
  - Configuración raíz de ESLint, Prettier, typecheck y scripts de workspace.
  - `docker-compose.yml` con PostgreSQL 17 y variables de entorno de ejemplo.
- Prisma Client generado y esquema validado; migración inicial
  `20261107004220_init` creada y aplicada contra PostgreSQL 17.
- Autenticación y registro del backend (`MVP-001`):
  - Endpoints `POST /v1/auth/register`, `POST /v1/auth/login`,
    `POST /v1/auth/refresh`, `POST /v1/auth/logout` y `GET /v1/auth/me`.
  - Registro transaccional de usuario, comercio, sucursal `MAIN` y membresía.
  - Access token JWT HS256 de 15 minutos; refresh token opaco de 30 días
    guardado como hash SHA-256 y rotado/revocado en cada ciclo.
  - Contraseñas con bcrypt (coste 12; 4 en pruebas) y validación con Zod.
  - Middleware `requireAuth` y manejo de errores `VALIDATION_ERROR`,
    `UNAUTHORIZED` y `CONFLICT` según el contrato.
  - Pruebas de registro, login, refresh, logout y `me` con 11 casos en verde.
- Comercio y configuración básica del backend (`MVP-002`):
  - Endpoints `GET/PATCH /v1/merchant` y `GET /v1/branches`.
  - Contexto de comercio mediante la cabecera `X-Merchant-Id`, validado contra
    la membresía activa del usuario (`requireMerchant`).
  - Lecturas y escritura para cualquier miembro activo.
  - Validación con Zod y aislamiento de datos por `merchantId`.
- Catálogo del backend (`MVP-003`):
  - CRUD de categorías (`/v1/categories`), impuestos (`/v1/tax-rates`) y
    productos/servicios (`/v1/products`).
  - Paginación, búsqueda y filtros por estado en productos; borrado lógico
    mediante `isActive`.
  - Escritura para cualquier miembro activo; aislamiento por `merchantId`.
  - Importes como enteros en pesos expuestos como string, según `ADR-002`.
- Clientes básicos del backend (`MVP-008`):
  - Endpoints `GET/POST /v1/customers` y `GET/PATCH /v1/customers/{customerId}`.
  - Búsqueda por nombre, correo, teléfono e identificación tributaria, con
    paginación.
  - `name` obligatorio; `email`, `phone`, `taxId` y `notes` opcionales y
    limpiables con `null`; el correo se normaliza a minúsculas.
  - Lecturas y escritura para cualquier miembro activo. Sin `DELETE`, según el
    contrato.
  - Aislamiento estricto por comercio: otro comercio recibe `404`.
- Inventario básico del backend (`MVP-009`):
  - Endpoints `GET /v1/inventory`, `POST /v1/inventory/{productId}/adjustments`
    y `GET /v1/inventory/movements`.
  - Stock por producto en la sucursal `MAIN` (o la primera sucursal activa),
    con movimientos inmutables y ajustes transaccionales `Serializable` con
    reintentos ante conflictos de serialización.
  - Solo productos `PRODUCT` con `trackInventory = true`; los servicios se crean
    y actualizan con `trackInventory = false` y quedan fuera del inventario.
  - Stock no negativo: los ajustes que dejarían cantidad negativa responden
    `422`. Ajustes con delta cero o más de tres decimales responden `400`.
  - Lectura y ajuste para cualquier miembro activo.
- ADR-005 con la decisión de inventario por sucursal y ajustes manuales.
- ADR-004 con la decisión de autenticación y sesiones.
- ADR-006 con el modelo de teléfono-terminal: sin roles de empleado y con varios
  teléfonos usando la misma cuenta.
- Ajustes de entorno: `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`,
  `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS` y `BCRYPT_ROUNDS`.
- CI con GitHub Actions (`INF-007`): formato, lint, typecheck, pruebas y build
  sobre Node.js 22, con caché de npm y cancelación de ejecuciones obsoletas.
- Publicación inicial en GitHub
  ([`rubenvasq/PostAi`](https://github.com/rubenvasq/PostAi)) y ejecución correcta
  del CI sobre `main`.
- Panel web administrativo básico del MVP (`MVP-012`) en `apps/admin`, contra el
  contrato `/v1` existente y sin cambios de backend:
  - Login, logout, restauración de sesión y renovación transparente del access
    token con `POST /v1/auth/refresh`; sesión en `sessionStorage` y selector de
    comercio activo con `X-Merchant-Id`.
  - Dashboard con rango de fechas, indicadores de `GET /v1/dashboard/summary` y
    reporte diario de `GET /v1/reports/sales`.
  - Historial de ventas con filtros y paginación, detalle de venta, pagos y
    comprobante imprimible.
  - Catálogo con CRUD mínimo de productos/servicios, categorías e impuestos,
    búsqueda y paginación.
  - Clientes con búsqueda, paginación, alta y edición.
  - Inventario con stock, filtro de stock bajo, ajustes y movimientos.
  - Insignias y avisos explícitos para pagos simulados; el panel solo muestra
    estados calculados por el backend y nunca aprueba pagos.
  - Cliente de API tipado, manejo del formato de error del contrato y
    validación de entradas en formularios.
- ADR-009 con las decisiones de autenticación, sesión, renovación de tokens y
  navegación por hash del panel web.
- `apps/admin/README.md` con desarrollo, variables de entorno, rutas, seguridad
  y limitaciones conocidas.

### Cambiado

- El registro ya no crea roles ni permisos: crea usuario, comercio, sucursal
  `MAIN` y membresía activa.
- La autorización de comercio, catálogo, clientes e inventario se basa solo en
  una membresía activa al comercio; cualquier miembro activo puede leer y
  escribir.
- Varios teléfonos pueden iniciar sesión con la misma cuenta del comercio; cada
  sesión tiene su propio refresh token y rotación.
- El reporte de ventas ya no admite agrupar por `employee`.

### Eliminado

- Modelos `Role`, `Permission` y `RolePermission`, y `Membership.roleId`.
- Endpoints `GET/POST /v1/users`, `PATCH /v1/users/{userId}` y `GET /v1/roles`.
- Esquemas `RoleSummary`, `Member`, `Permission`, `Role`,
  `UserCreateRequest` y `UserUpdateRequest` del contrato v1.
- Campos `role` de `Membership` en `POST /v1/auth/register`, `POST
  /v1/auth/login` y `GET /v1/auth/me`.
- Tarea `MVP-010` de empleados y roles, sustituida por terminales y sesiones por
  dispositivo.

### Notas

- El backend y el panel web son ejecutables. La API expone autenticación,
  comercio, carrito, catálogo, clientes, inventario, ventas, pagos simulados,
  caja, gastos, dashboard y auditoría; el panel cubre login, dashboard, ventas,
  catálogo, clientes, inventario y caja/gastos. La app Android sigue pendiente de
  la decisión de stack (`ARQ-001`) y el proveedor SoftPOS de `PAY-001`.
- Las pruebas usan repositorios en memoria; los flujos reales de autenticación,
  comercio, catálogo, clientes, inventario, ventas, pagos simulados, comprobante,
  dashboard y reportes se verificaron manualmente contra PostgreSQL 17. El panel
  `MVP-012` se verificó además con un navegador headless sobre la API real. Las
  pruebas de integración en CI quedan pendientes.
- El umbral `lowStockThreshold` todavía no tiene endpoint en el contrato v1; el
  campo y el filtro `lowStock` existen, pero el umbral permanece nulo en uso real.
- El repositorio remoto es
  [`rubenvasq/PostAi`](https://github.com/rubenvasq/PostAi).
