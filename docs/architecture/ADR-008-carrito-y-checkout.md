# ADR-008 — Carrito y checkout del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-11-07
- **Equipo:** Equipo PostAi
- **Contexto relacionado:** `ADR-002`, `ADR-005`, `ADR-006`, `ADR-007`,
  `docs/database/data-model.md` y `docs/api/openapi.yaml`.

## Contexto

Las ventas (`MVP-005`) ya reciben los ítems directamente en `POST /v1/sales` y
calculan todo en el servidor. Falta `MVP-004`: un carrito que el cajero arma de
forma incremental (agregar, cambiar cantidad, quitar, aplicar descuento) viendo
el total en vivo, y que al confirmar se convierte en una venta.

La pregunta de diseño era si el carrito debía vivir en el backend o solo en el
dispositivo. Se eligió un **carrito persistido** con endpoint de **checkout**
para que varios dispositivos de un comercio puedan compartir y recuperar un
carrito, y para que el backend siga siendo la fuente de verdad de los importes.

## Alternativas consideradas

1. **Carrito solo en el dispositivo + endpoint de cotización sin estado.**
   Ligero y sin migración, pero no permite recuperar un carrito ni compartirlo
   entre dispositivos, y duplica estado en el cliente.
2. **Carrito persistido con snapshot de precios por ítem.** Congela el precio al
   agregar, pero obliga a invalidar el carrito cuando cambia el catálogo y
   complica la lógica.
3. **Carrito persistido con precios vivos y checkout que delega en la venta.**
   El carrito guarda solo la intención (producto, cantidad, descuento); los
   precios se leen del catálogo en cada lectura y en el checkout. Es la opción
   elegida.

## Decisión

### 1. Modelo

- `Cart` (`carts`) con estado `OPEN`, `CHECKED_OUT` o `ABANDONED`, aislado por
  comercio, con `branchId` (`MAIN`, criterio de `ADR-005`), `customerId?`,
  `notes?` y el descuento a nivel de carrito (`discountType`,
  `discountPercentBp`, `discountAmountMinor`).
- `CartItem` (`cart_items`) guarda `productId`, `variantId?`, `quantity` y
  `notes?`. **No** guarda snapshot de precio: el carrito refleja siempre el
  catálogo actual.
- Al agregar un producto+variante que ya está en el carrito, se **suma** la
  cantidad en lugar de duplicar la línea.

### 2. Totales vivos

- En cada lectura y mutación se recalculan los totales con las fórmulas de
  `ADR-007` (precio de variante si existe, redondeo medio hacia arriba a peso
  entero, impuesto por línea, descuento a nivel de carrito aplicado después de
  impuestos).
- Si un producto o variante dejó de estar disponible, su línea se marca
  `available: false`, no suma al total y bloqueará el checkout. Esto evita que
  una lectura falle por un cambio de catálogo.
- El total mostrado nunca es negativo: si el descuento supera el total, el
  preview lo recorta. La validación estricta ocurre en el checkout.

### 3. Checkout

- `POST /v1/carts/{cartId}/checkout` arma un `SaleCreateRequest` a partir del
  carrito y delega en `SaleService.createSale`, que recalcula precios e
  impuestos de forma autoritativa y crea la venta en `DRAFT` (`ADR-007`).
- Se usa el **`id` del carrito como `Idempotency-Key`** de la venta. Así el
  checkout es idempotente por carrito: un segundo intento devuelve la misma
  venta sin duplicarla ni repetir efectos.
- Al confirmar, el carrito pasa a `CHECKED_OUT` y guarda `checkoutSaleId`.
- Un carrito vacío responde `422`; un carrito ya confirmado o descartado
  responde `409` ante nuevas mutaciones. El cobro se registra después con
  `POST /v1/sales/{saleId}/payments` (`ADR-007`).

### 4. Autorización y aislamiento

- Todas las rutas exigen bearer token y `X-Merchant-Id`, y resuelven membresía
  activa. Sin roles de empleado (`ADR-006`): cualquier miembro activo opera el
  carrito.
- El carrito se aísla por comercio; un `cartId` de otro comercio responde `404`.

## Consecuencias

### Positivas

- El backend sigue siendo la fuente de verdad de importes; el checkout reutiliza
  toda la lógica de venta sin duplicarla.
- El carrito es persistente, recuperable y compartible entre dispositivos.
- El checkout idempotente evita ventas duplicadas por reintentos de red.

### Negativas o riesgos

- El cálculo de totales del carrito replica las fórmulas de `ADR-007` en el
  servicio de carrito (para el preview vivo). Es una duplicación controlada y
  documentada; el checkout usa la ruta autoritativa de la venta.
- Un cambio de catálogo entre el preview y el checkout puede alterar el total;
  el checkout refleja el precio vigente al confirmar, no el visto en el preview.
- Los carritos `OPEN` no caducan automáticamente en el MVP. La limpieza de
  carritos abandonados queda para un incremento posterior.

### Acciones derivadas

- [x] Implementar `MVP-004` (carrito y checkout) en el backend.
- [ ] Definir caducidad/limpieza de carritos `OPEN` abandonados.
- [ ] Exponer el carrito en el panel web (`MVP-012`) y en la app móvil.

## Referencias

- `docs/database/data-model.md` (secciones de ventas y descuentos).
- `docs/api/openapi.yaml`, rutas `/v1/carts`.
- `ADR-007` (ventas y pagos simulados), `ADR-005` (inventario por sucursal),
  `ADR-006` (modelo de terminal sin roles).
