# ADR-009 — Autenticación, estado y navegación del panel web

- **Estado:** Aceptado
- **Fecha:** 2026-11-07
- **Equipo:** Equipo PostAi
- **Contexto relacionado:** `ADR-002`, `ADR-004`, `ADR-006`, `ADR-007`,
  `MVP-012`, `docs/api/README.md` y `docs/api/openapi.yaml`.

## Contexto

`MVP-012` entrega el panel web administrativo básico en `apps/admin`. El panel
consume la **PostAi API /v1** existente y no agrega ni modifica endpoints del
backend. Debe permitir iniciar y cerrar sesión, renovar el access token de forma
transparente, elegir el comercio activo, consultar dashboard, ventas, catálogo,
clientes e inventario, y distinguir siempre los pagos simulados de los reales.

El panel **no cobra ni aprueba pagos**: el backend es la fuente de verdad
(`ADR-007`) y la aceptación real de tarjetas vive en la app Android con el
proveedor SoftPOS. Tampoco implementa roles de empleado (`ADR-006`): cualquier
miembro activo del comercio puede consultar y administrar.

Las decisiones pendientes eran: dónde guardar los tokens, cómo renovarlos sin
duplicar peticiones, cómo enrutar una SPA servida como archivos estáticos y cómo
resolver el comercio activo cuando un usuario tiene varias membresías.

## Alternativas consideradas

1. **`localStorage` para los tokens.** Persiste entre pestañas y reinicios, pero
   amplía la ventana de exposición ante XSS y deja sesiones vivas en equipos
   compartidos. Se descartó para el MVP.
2. **Cookies `HttpOnly`.** Es la opción más robusta frente a XSS, pero exige
   cambios de contrato y de CORS en el backend, fuera del alcance de `MVP-012`.
   Queda como mejora futura.
3. **Router con dependencia externa (React Router).** Aporta rutas anidadas y
   helpers, pero suma una dependencia que el MVP no necesita. Se descartó.
4. **Sesión en `sessionStorage` + refresh compartido + rutas por hash.** Es la
   opción elegida: limita la sesión a la pestaña, evita carreras de refresh y
   funciona con cualquier hosting estático sin reglas de reescritura.

## Decisión

### 1. Almacenamiento de sesión

- El panel guarda `accessToken`, `refreshToken` y `merchantId` en
  **`sessionStorage`** bajo la clave `postai.admin.session`.
- La sesión se limpia al cerrar la pestaña o al cerrar sesión. `logout` revoca el
  refresh token en el backend (`POST /v1/auth/logout`) y luego limpia el estado
  local; si la API falla, la limpieza local ocurre igualmente.
- El módulo `lib/session.ts` es la única puerta de acceso al almacenamiento y
  notifica a suscriptores cuando la sesión cambia o se limpia.
- **Nunca** se guardan PAN, CVV, PIN ni credenciales de proveedores. El panel no
  recibe datos de tarjeta.

### 2. Renovación transparente del access token

- `lib/api.ts` centraliza las peticiones. Toda llamada autenticada envía
  `Authorization: Bearer <accessToken>`; las llamadas con contexto de comercio
  envían además `X-Merchant-Id`.
- Ante un `401`, el cliente intenta **una** renovación con
  `POST /v1/auth/refresh`, actualiza ambos tokens y reintenta la petición
  original una sola vez.
- Las renovaciones concurrentes comparten una única promesa (`refreshPromise`),
  de modo que varias peticiones que reciben `401` al mismo tiempo no rotan el
  refresh token en paralelo ni provocan carreras.
- Si la renovación falla, se limpia la sesión y el panel vuelve al login.
- Los errores de la API se interpretan con el formato del contrato
  `{ error: { code, message, details? } }` y se muestran en español.

### 3. Navegación por hash

- Las rutas son `#/dashboard`, `#/sales`, `#/sales/{saleId}`, `#/products`,
  `#/customers`, `#/inventory`, `#/cash`, `#/audit` y `#/settings`, resueltas
  por `hooks/useHashRoute.ts`.
- Se usa hash para que el build estático funcione en cualquier servidor sin
  reglas de reescritura y para no agregar un router externo.
- Una ruta desconocida muestra una pantalla de “no encontrada” con enlace al
  dashboard.

### 4. Comercio activo y autorización

- Tras el login y en cada restauración de sesión se consulta `GET /v1/auth/me`.
  El panel conserva el `merchantId` si sigue teniendo una membresía `ACTIVE`; si
  no, toma la primera membresía activa.
- Si el usuario no tiene membresías activas, se muestra un estado “Sin comercio
  activo” con opción de cerrar sesión.
- El selector de comercio solo aparece cuando hay más de una membresía activa.
  Al cambiarlo, las páginas se vuelven a montar para no mezclar datos.
- La autorización real la aplica el backend con la membresía y `X-Merchant-Id`;
  el panel solo oculta o muestra datos, nunca eleva permisos. Sin roles de
  empleado (`ADR-006`).

### 5. Registro de la sesión

- Cada petición envía `X-Device-Name: Panel PostAi (web)` para que
  `GET /v1/auth/sessions` identifique la sesión del panel junto a las de los
  teléfonos.

### 6. Pagos y datos simulados

- El panel **no crea ni aprueba pagos**. Actualización 2026-11-11: sí puede
  pedir al backend dos operaciones administrativas, que el backend valida y
  audita: **reembolsar** un pago de un método sin proveedor (`PAY-017`) y
  **anular** una venta sin pago aprobado (`MVP-015`). Nunca cambia estados por
  su cuenta.
- Los estados de venta y pago se muestran tal como los devuelve el backend.
- Los pagos y comprobantes simulados se marcan con una insignia y un aviso
  explícito (“pago simulado / no representa un cobro real”).

## Consecuencias

### Positivas

- La sesión queda acotada a la pestaña, lo que reduce la exposición en equipos
  compartidos sin tocar el contrato del backend.
- La renovación compartida evita carreras de rotación y expulsiones falsas.
- El panel funciona como build estático en cualquier hosting, sin reglas de
  reescritura ni dependencias de router.
- El backend sigue siendo la única fuente de verdad de importes, estados y
  pagos.

### Negativas o riesgos

- `sessionStorage` sigue siendo accesible desde JavaScript; la defensa principal
  es evitar XSS y no renderizar HTML no confiable. Migrar a cookies `HttpOnly`
  requiere cambios de backend y queda para un incremento posterior.
- Al cerrar la pestaña se pierde la sesión y hay que iniciar sesión de nuevo.
  Es el comportamiento deseado para el MVP.
- El panel no incluyó caja, carrito ni creación de ventas en esa entrega. El
  carrito (`MVP-004`) y la operación de caja (`ADR-010`) se añadieron en
  incrementos posteriores.
- No hay pruebas E2E automatizadas del panel; la verificación es manual contra
  la API y las pruebas automáticas cubren el backend.

### Acciones derivadas

- [x] Implementar `MVP-012` (login, dashboard, ventas, catálogo, clientes e
      inventario) en `apps/admin`.
- [x] Verificación manual completa del panel contra PostgreSQL y la API real
      (`MVP-012` el 2026-11-07; caja, auditoría y configuración el 2026-11-11).
- [x] Completar el panel con configuración del comercio, sesiones por
      dispositivo, auditoría y anulación de ventas (`MVP-015`).
- [ ] Evaluar cookies `HttpOnly` para los tokens en una entrega futura.
- [ ] Añadir pruebas E2E del panel cuando se defina la estrategia de pruebas.

## Referencias

- `docs/api/README.md` y `docs/api/openapi.yaml` (contrato `/v1`).
- `ADR-004` (autenticación y sesiones), `ADR-006` (sin roles de empleado),
  `ADR-007` (ventas y pagos simulados).
- `apps/admin/README.md` (uso y variables de entorno del panel).
