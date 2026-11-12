# @postai/admin — Panel web administrativo

Panel de gestión de **PostAi** para comercios. Es una SPA de React 19 + Vite 8 +
Tailwind CSS 4 + base shadcn/ui que consume la **PostAi API /v1** existente.

> **Alcance:** el panel es web y de gestión. **No** cobra, **no** procesa pagos
> reales, **no** marca pagos como aprobados y **no** almacena datos de tarjeta
> (PAN, CVV, PIN). La aceptación real de tarjetas vive en la app Android con el
> proveedor SoftPOS. Ver [`ADR-009`](../../docs/architecture/ADR-009-panel-web-sesion-y-navegacion.md).

## Requisitos

- Node.js >= 22 y npm >= 10.
- La API de PostAi corriendo en `http://127.0.0.1:3000` (`npm run dev:api`) o un
  `VITE_API_BASE_URL` que apunte a la API desplegada.

## Desarrollo

Desde la raíz del repositorio:

```bash
npm install
npm run dev:admin
```

El panel queda en `http://127.0.0.1:5173`. En desarrollo, Vite hace proxy de
`/v1` y `/health` hacia `http://127.0.0.1:3000`, por lo que no hace falta
configurar la URL de la API.

También puede ejecutarse el panel junto con la API:

```bash
npm run dev
```

## Variables de entorno

| Variable | Uso | Valor por defecto |
| --- | --- | --- |
| `VITE_API_BASE_URL` | URL base de la API (`/v1` se agrega en cada llamada) | vacío (usa el proxy de Vite) |

Ejemplo para un build que apunta directo a la API:

```bash
VITE_API_BASE_URL=https://api.ejemplo.com npm run build --workspace @postai/admin
```

En PowerShell:

```powershell
$env:VITE_API_BASE_URL="https://api.ejemplo.com"; npm run build --workspace @postai/admin
```

No se guardan secretos en el panel: solo se configura la URL pública de la API.
Si el panel se sirve desde otro origen, la API debe permitir ese origen en
`CORS_ORIGIN`.

## Rutas

La navegación usa hash para que el build estático funcione sin reglas de
reescritura del servidor.

| Ruta | Pantalla |
| --- | --- |
| `#/dashboard` | Indicadores y ventas por día (`/v1/dashboard/summary`, `/v1/reports/sales`) |
| `#/sales` | Historial de ventas con filtros y paginación |
| `#/sales/{saleId}` | Detalle, pagos, comprobante e impresión |
| `#/products` | Catálogo: productos/servicios, categorías e impuestos |
| `#/customers` | Clientes: búsqueda, alta y edición |
| `#/inventory` | Stock, ajustes y movimientos |
| `#/cash` | Caja (apertura, movimientos, cierre e historial) y gastos |
| `#/audit` | Auditoría: eventos con filtros por fecha y acción (solo lectura) |
| `#/settings` | Configuración: datos del comercio, sucursales y sesiones por dispositivo |

## Autenticación

- Login con `POST /v1/auth/login`, logout con `POST /v1/auth/logout`.
- Los tokens se guardan en `sessionStorage` (solo esta pestaña), no en
  `localStorage`.
- Ante `401`, el cliente renueva con `POST /v1/auth/refresh`, actualiza ambos
  tokens y reintenta la llamada una vez. Las renovaciones concurrentes comparten
  una sola promesa.
- En llamadas con contexto de comercio se envía `X-Merchant-Id`; si el usuario
  tiene varias membresías activas, puede cambiar el comercio desde la cabecera.
- Cada petición envía `X-Device-Name: Panel PostAi (web)` para identificar la
  sesión en `GET /v1/auth/sessions`.

## Compilación y verificación

Desde la raíz:

```bash
npm run lint
npm run typecheck
npm run build --workspace @postai/admin
npm run format:check
```

El build genera `apps/admin/dist` (ignorado por Git).

## Limitaciones conocidas

- El panel no crea ventas ni pagos (eso ocurre en el punto de venta). Sí permite
  **anular** una venta sin pago aprobado y **reembolsar** pagos de métodos sin
  proveedor; el backend valida y decide en ambos casos.
- No incluye carrito ni punto de venta.
- La razón social y la identificación tributaria del comercio se pueden
  editar pero no vaciar (el contrato no acepta `null` en `PATCH /v1/merchant`).
- La zona horaria no se edita desde el panel: los reportes usan
  `America/Bogota`.
- La lista de sesiones no indica cuál es la del navegador actual (el contrato
  no lo expone); revocarla obliga a iniciar sesión de nuevo.
- Las tasas de impuesto solo se crean (el contrato no expone `PATCH`/`DELETE`).
- No hay pruebas E2E automatizadas del panel; ver `ADR-009`.
