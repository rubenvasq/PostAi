# ADR-007 — Ventas y pagos simulados del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-11-06
- **Equipo:** Equipo PostAi
- **Contexto relacionado:** `ADR-002`, `ADR-005`, `ADR-006`,
  `docs/database/data-model.md` y `docs/api/openapi.yaml`.

## Contexto

El backend ya resuelve autenticación, comercio, catálogo, clientes e
inventario. Falta el núcleo del POS: registrar una venta y cobrarla. El
proveedor SoftPOS real todavía no está validado (`PAY-001` a `PAY-004`,
`ARQ-004`), así que este incremento solo puede aprobar pagos **simulados** o
manuales (efectivo y transferencia).

El contrato v1 ya define `POST /v1/sales`, `POST /v1/sales/{saleId}/payments`,
`GET /v1/payment-methods` y los estados de venta y pago. Hay que decidir cómo se
calculan los importes, cómo se aplica la idempotencia y cuándo se descuenta el
inventario sin inventar capacidades del proveedor.

## Alternativas consideradas

1. **Confiar precios y totales al cliente.** Simple, pero permite manipular
   importes y contradice que el backend sea la fuente de verdad.
2. **Calcular todo dentro del repositorio Prisma.** Evita duplicar lógica en
   producción, pero impide probar las fórmulas sin base de datos y mezcla reglas
   de negocio con persistencia.
3. **Calcular en el servicio y persistir el snapshot en una transacción.**
   Permite pruebas deterministas, deja el repositorio enfocado en atomicidad y
   conserva la venta aunque el catálogo cambie. Es la opción elegida.

## Decisión

### 1. Cálculo y snapshot

- Los precios se leen del catálogo del comercio. El cliente solo envía
  `productId`, `variantId?` y `quantity`.
- Se usan `Product.priceMinor` o, si existe la variante, `ProductVariant.priceMinor`.
- `grossMinor = round(unitPriceMinor × quantity)` con redondeo **medio hacia
  arriba** a peso entero. La cantidad admite hasta tres decimales.
- `taxMinor = round(grossMinor × rateBp / 10000)` por línea. Si el producto no
  tiene impuesto o está inactivo, `rateBp = 0`.
- `lineTotalMinor = grossMinor + taxMinor`.
- `subtotalMinor = Σ grossMinor`, `taxMinor = Σ taxMinor`,
  `totalMinor = subtotalMinor − discountMinor + taxMinor`.
- El descuento de venta puede ser `PERCENT` (`percentBp` de 0 a 10000) o
  `AMOUNT` (pesos enteros). Se redondea medio hacia arriba y se rechaza si deja
  el total en negativo (`422`).
- En el MVP el descuento se aplica **después** de impuestos, tal como expresan
  las fórmulas del modelo de datos. Los descuentos por ítem quedan fuera de
  alcance.
- Cada `SaleItem` guarda snapshot de nombre, SKU, precio unitario, impuesto y
  total. Cambios posteriores del catálogo no alteran la venta.

### 2. Estados

- `POST /v1/sales` crea la venta en `DRAFT`.
- En este incremento el pago es inmediato: al aprobarse pasa a `PAID` y se
  registra `completedAt`. `PENDING_PAYMENT` queda modelado para un checkout
  asíncrono futuro.
- Una venta `PAID` no se anula; se reembolsará en un incremento posterior.
- `POST /v1/sales/{saleId}/cancel` solo acepta `DRAFT` o `PENDING_PAYMENT` sin
  pagos aprobados. Cualquier otro estado responde `409`.
- El MVP admite **un solo pago por venta**. El modelo permite varios para el
  futuro. Un pago `REJECTED` o `CANCELLED` no existe en este incremento: los
  métodos disponibles se aprueban o responden error antes de persistir.

### 3. Pagos simulados

| Método | Comportamiento |
| --- | --- |
| `CASH` | Se registra `APPROVED`, `isSimulated = false`. |
| `TRANSFER` | Se registra `APPROVED`, `isSimulated = false`. |
| `CARD_SIMULATED` | Se registra `APPROVED`, `isSimulated = true`. |
| `CARD_SOFTPOS` | Responde `501 NOT_IMPLEMENTED`; no crea pago. |

- El importe debe ser igual al total pendiente de la venta; no se admiten pagos
  parciales en el MVP.
- `isSimulated` se copia del método de pago del comercio, no del cliente.
- Los pagos simulados se muestran como tales en la respuesta y no generan
  liquidaciones.
- Los métodos por defecto se siembran al registrar el comercio y se recrean de
  forma idempotente si un comercio existente no los tiene.

### 4. Idempotencia

- `POST /v1/sales` y `POST /v1/sales/{saleId}/payments` exigen
  `Idempotency-Key` con formato UUID.
- La clave es única por comercio: `(merchantId, idempotencyKey)`.
- Si la clave ya existe, se devuelve el recurso existente con `201` y no se
  repiten efectos secundarios (inventario incluido).
- Si dos peticiones compiten, la restricción única de PostgreSQL decide; la
  perdedora relee el recurso ganador.
- Las operaciones de pago usan transacción `Serializable` con hasta dos
  reintentos ante conflictos de serialización (`P2034`).

### 5. Inventario

- El inventario se descuenta al **aprobar el pago**, no al crear el borrador.
- Solo participan productos con `trackInventory = true` y tipo `PRODUCT`.
- El descuento, el movimiento `SALE` y el cambio de estado de la venta ocurren
  en la misma transacción que crea el pago.
- Si falta stock, toda la transacción se revierte y la API responde `422`.
- El movimiento guarda `referenceType = "SALE"` y `referenceId = sale.id`.
- La sucursal es la `MAIN` del comercio, con el mismo criterio de `ADR-005`.

### 6. Autoría y trazabilidad

- `sellerUserId` es el usuario autenticado que crea la venta.
- `Payment` guarda `notes` opcionales (referencia de transferencia, observación
  del cajero). Nunca se guardan PAN, CVV, PIN ni credenciales.
- `AuditLog` transversal sigue pendiente en `MVP-013`; por ahora la trazabilidad
  se apoya en la venta, el pago y el movimiento de inventario.

## Consecuencias

### Positivas

- El backend es la única fuente de verdad de importes y estados.
- La idempotencia cubre ventas y pagos, incluido el efecto sobre inventario.
- Los pagos simulados quedan claramente separados de los reales.
- El módulo se puede probar sin proveedor ni base de datos externa.

### Negativas o riesgos

- El precio se lee antes de la transacción de escritura; un cambio de catálogo
  concurrente puede producir un snapshot ligeramente anterior. Es aceptable en
  el MVP y queda documentado.
- Al aplicar el descuento después de impuestos, el importe no coincide con un
  cálculo fiscal que reduzca la base gravable. Requiere revisión contable antes
  de facturación electrónica.
- El comprobante (`GET /v1/sales/{saleId}/receipt`) queda para `MVP-007`.
- La integración real `CARD_SOFTPOS` sigue bloqueada hasta validar proveedor,
  SDK, sandbox y condiciones para Colombia.

### Acciones derivadas

- [x] Implementar `MVP-005` y `MVP-006` en el backend.
- [ ] Implementar historial, detalle y comprobante en `MVP-007`.
- [ ] Añadir auditoría transversal en `MVP-013`.
- [ ] Revisar tratamiento fiscal del descuento antes de facturación electrónica.
- [ ] Validar el proveedor SoftPOS y el contrato `PaymentProvider` (`ARQ-004`).

## Referencias

- `docs/database/data-model.md`, secciones 2, 5, 6 y 7.
- `docs/api/openapi.yaml`, rutas de ventas, pagos y métodos de pago.
- `ADR-002` (supuestos del MVP), `ADR-005` (inventario por sucursal).
