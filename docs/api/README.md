# API v1 — PostAi

- **Producto:** PostAi (`postai`) — Equipo PostAi
- **Estado:** Borrador para revisión (`ARQ-003`)
- **Especificación:** [`openapi.yaml`](openapi.yaml)
- **Modelo de datos:** [`docs/database/data-model.md`](../database/data-model.md)
- **Supuestos:** [`ADR-002`](../architecture/ADR-002-supuestos-mvp.md)

> El contrato cubre el flujo comercial con **efectivo, transferencia y tarjeta
> simulada**. La integración SoftPOS real (`CARD_SOFTPOS`) queda bloqueada hasta
> `ARQ-004` y la documentación del proveedor.

## Convenciones

| Tema | Decisión |
| --- | --- |
| Base URL | `http://127.0.0.1:3000` en desarrollo; `api.postai.invalid` como marcador de producción (dominio pendiente) |
| Versión | Prefijo `/v1` |
| Formato | JSON UTF-8 |
| Autenticación | `Authorization: Bearer <accessToken>` |
| Comercio activo | Cabecera `X-Merchant-Id: <uuid>` |
| Dinero | String con pesos enteros COP: `"10000"` |
| Fechas | ISO 8601 en UTC (`2026-11-06T15:30:00Z`) |
| Paginación | `page` (desde 1) y `pageSize` (máximo 100) |
| Idempotencia | Cabecera `Idempotency-Key` en ventas, pagos y reembolsos |
| Errores | `{ "error": { "code", "message", "details?", "requestId?" } }` |

### Autenticación y comercio

1. `POST /v1/auth/register` crea usuario, comercio, sucursal `MAIN`, roles y
   membresía, y devuelve tokens.
2. `POST /v1/auth/login` devuelve tokens y la lista de comercios del usuario.
3. Las rutas de negocio requieren `Authorization` y `X-Merchant-Id`.
4. El backend valida que el usuario tenga una `Membership` activa en ese
   comercio.

### Idempotencia

- `POST /v1/sales`, `POST /v1/sales/{saleId}/payments` y
  `POST /v1/payments/{paymentId}/refunds` exigen `Idempotency-Key`.
- Si la clave ya existe para el comercio, el backend devuelve el recurso
  existente con el mismo resultado; no repite la operación.
- Se recomienda enviar un UUID generado por el cliente y reutilizarlo en los
  reintentos.

### Errores

| Código HTTP | Uso |
| --- | --- |
| `400` | Petición mal formada |
| `401` | Token ausente o inválido |
| `403` | Sin permiso o sin membresía en el comercio |
| `404` | Recurso no encontrado |
| `409` | Conflicto de estado (por ejemplo, caja ya abierta) |
| `422` | Regla de negocio o validación semántica |
| `501` | Función aún no disponible (SoftPOS real) |

Códigos de error estables previstos: `VALIDATION_ERROR`, `UNAUTHORIZED`,
`FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYMENT_NOT_ALLOWED`,
`INSUFFICIENT_STOCK`, `IDEMPOTENCY_CONFLICT`, `PROVIDER_NOT_AVAILABLE`.

## Endpoints del MVP

### Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/v1/auth/register` | Registrar usuario y comercio |
| POST | `/v1/auth/login` | Iniciar sesión |
| POST | `/v1/auth/refresh` | Renovar tokens |
| POST | `/v1/auth/logout` | Revocar refresh token |
| GET | `/v1/auth/me` | Usuario y comercios |

### Comercio y catálogo

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/v1/merchant` | Comercio actual |
| PATCH | `/v1/merchant` | Actualizar datos básicos |
| GET | `/v1/branches` | Sucursales |
| GET/POST | `/v1/categories` | Listar / crear categorías |
| PATCH/DELETE | `/v1/categories/{categoryId}` | Editar / desactivar |
| GET/POST | `/v1/products` | Listar / crear productos |
| GET/PATCH/DELETE | `/v1/products/{productId}` | Detalle / editar / desactivar |
| GET/POST | `/v1/tax-rates` | Listar / crear impuestos |
| GET | `/v1/payment-methods` | Métodos habilitados |

### Clientes e inventario

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET/POST | `/v1/customers` | Listar / crear clientes |
| GET/PATCH | `/v1/customers/{customerId}` | Detalle / editar |
| GET | `/v1/inventory` | Stock por producto |
| POST | `/v1/inventory/{productId}/adjustments` | Ajuste manual |
| GET | `/v1/inventory/movements` | Historial de movimientos |

### Ventas y pagos

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/v1/sales` | Crear venta |
| GET | `/v1/sales` | Historial con filtros |
| GET | `/v1/sales/{saleId}` | Detalle |
| POST | `/v1/sales/{saleId}/cancel` | Anular venta sin pago |
| GET | `/v1/sales/{saleId}/receipt` | Comprobante |
| POST | `/v1/sales/{saleId}/payments` | Registrar pago |
| GET | `/v1/sales/{saleId}/payments` | Pagos de la venta |
| GET | `/v1/payments/{paymentId}` | Detalle del pago |
| POST | `/v1/payments/{paymentId}/refunds` | Reembolso total |
| GET | `/v1/payments/{paymentId}/refunds` | Reembolsos del pago |

### Caja y gastos

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/v1/cash/sessions/current` | Sesión abierta |
| GET/POST | `/v1/cash/sessions` | Historial / abrir caja |
| POST | `/v1/cash/sessions/{sessionId}/close` | Cerrar caja |
| GET/POST | `/v1/cash/sessions/{sessionId}/movements` | Movimientos |
| GET/POST | `/v1/expenses` | Listar / registrar gasto |

### Reportes y administración

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/v1/dashboard/summary` | Resumen del periodo |
| GET | `/v1/reports/sales` | Reporte agrupado |
| GET/POST | `/v1/users` | Empleados |
| PATCH | `/v1/users/{userId}` | Rol o estado |
| GET | `/v1/roles` | Roles y permisos |
| GET | `/v1/audit-logs` | Bitácora |
| GET | `/health` | Estado del servicio |

## Flujo principal

```text
1. POST /v1/auth/login
2. GET  /v1/products?search=...
3. POST /v1/sales                      (Idempotency-Key)
4. POST /v1/sales/{saleId}/payments    (Idempotency-Key)
5. GET  /v1/sales/{saleId}/receipt
6. GET  /v1/dashboard/summary
```

### Ejemplo de venta

```bash
curl -X POST http://127.0.0.1:3000/v1/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Merchant-Id: $MERCHANT_ID" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": "11111111-1111-4111-8111-111111111111", "quantity": 2 }
    ],
    "discount": { "type": "AMOUNT", "amount": "500", "reason": "Promoción" },
    "notes": "Venta de mostrador"
  }'
```

### Ejemplo de pago simulado

```bash
curl -X POST http://127.0.0.1:3000/v1/sales/$SALE_ID/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Merchant-Id: $MERCHANT_ID" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{ "methodCode": "CARD_SIMULATED", "amount": "19500" }'
```

## Reglas del contrato

1. El backend calcula precios, impuestos y totales desde el catálogo; el
   cliente no envía precios.
2. El backend marca la venta como `PAID` solo cuando el pago está aprobado.
3. `CASH`, `TRANSFER` y `CARD_SIMULATED` se aprueban en el backend.
   `CARD_SIMULATED` queda marcado como simulado.
4. `CARD_SOFTPOS` responde `501` hasta `ARQ-004`; no se define ningún detalle
   del SDK.
5. Una venta con pago aprobado no se cancela: se reembolsa.
6. En el MVP se permite **un pago por venta**; el modelo admite varios.
7. Los reembolsos del MVP son **totales**.
8. No se aceptan importes negativos ni cero.
9. Los recibos son internos y no fiscales.
10. Los pagos simulados se identifican en la respuesta y en el recibo.

## Pendiente

- Aprobar este contrato (`ARQ-003`).
- Definir autenticación de webhooks y campos reales del proveedor (`ARQ-004`).
- Validar requisitos fiscales/DIAN antes de producción.
- Añadir rate limiting y observabilidad en la implementación.
