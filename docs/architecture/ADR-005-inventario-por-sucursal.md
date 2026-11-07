# ADR-005 — Inventario por sucursal y ajustes manuales del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-11-06
- **Equipo:** Equipo PostAi
- **Nota:** la parte de autorización por roles fue sustituida por `ADR-006`.

## Contexto

El modelo de datos define `InventoryItem` por producto y sucursal, con un
historial inmutable en `InventoryMovement`. El contrato v1 expone:

- `GET /v1/inventory`
- `POST /v1/inventory/{productId}/adjustments`
- `GET /v1/inventory/movements`

Ninguno de esos endpoints recibe una sucursal. El registro crea una sucursal
`MAIN`, pero todavía no existe un endpoint para crear o seleccionar sucursales.
El contrato tampoco define cómo configurar `lowStockThreshold`.

## Decisión

1. **Sucursal del MVP:** el inventario opera sobre la sucursal `MAIN` del
   comercio. Si no existe, se usa la primera sucursal activa ordenada por
   código. Si no hay ninguna, la API responde `422 UNPROCESSABLE_ENTITY`.
2. **Ajustes manuales:** `POST /v1/inventory/{productId}/adjustments` registra
   movimientos de tipo `ADJUSTMENT` con `quantityDelta` distinto de cero y como
   máximo tres decimales, y un `reason` obligatorio.
3. **Stock no negativo:** un ajuste que dejaría `quantity < 0` se rechaza con
   `422 UNPROCESSABLE_ENTITY`. No se admite stock negativo en el MVP
   (`ADR-002`).
4. **Productos inventariables:** solo participan productos con
   `trackInventory = true` y tipo `PRODUCT`. Los servicios y los productos sin
   control de inventario se rechazan en ajustes y no aparecen en el listado.
5. **Lectura y escritura:** cualquier miembro activo puede consultar stock,
   movimientos y ajustar inventario. Los roles de empleado se eliminaron del MVP
   (`ADR-006`).
6. **Integridad:** el ajuste y su movimiento se guardan en una sola transacción
   con aislamiento `Serializable`; si PostgreSQL detecta conflicto de
   serialización, la operación se reintenta hasta dos veces. Los movimientos
   son inmutables.
7. **Listado:** `GET /v1/inventory` muestra todos los productos inventariables
   del comercio, con cantidad `0` cuando todavía no existe fila de stock. El
   filtro `lowStock` se implementa, pero el umbral permanece nulo hasta que el
   contrato defina cómo configurarlo.
8. **Auditoría:** `InventoryMovement` es la trazabilidad del inventario en este
   MVP. El `AuditLog` transversal se implementará en `MVP-013`.

## Alternativas descartadas

- **Inventario agregado entre sucursales:** oculta diferencias por sede y
  contradice el modelo `(branchId, productId)`.
- **Cabecera `X-Branch-Id`:** útil a futuro, pero no está en el contrato v1 y
  añadirla ahora ampliaría una API ya publicada sin necesidad.
- **Permitir stock negativo:** facilita ventas sin stock, pero rompe la regla
  del MVP y la consistencia del inventario.
- **Crear filas de stock automáticamente al crear productos:** acopla catálogo
  con inventario y complica la transacción de registro; el listado ya resuelve
  la cantidad `0`.

## Consecuencias

- El MVP queda listo para una sola sucursal y puede evolucionar a multi-sucursal
  cuando el contrato añada selector de sucursal.
- El umbral de stock bajo requiere una decisión de contrato posterior; el
  campo y el filtro ya están preparados.
- Las ventas (`MVP-005`) deberán reutilizar la misma transacción serializable
  para descontar inventario y registrar el movimiento `SALE`.
